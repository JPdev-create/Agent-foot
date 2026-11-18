package fr.compteur208;

import android.Manifest;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Service qui enregistre les trajets avec le GPS.
 *
 * Trois états :
 *  - trajet en cours ;
 *  - « à l'arrêt, contact mis » : la voiture est immobile depuis quelques minutes mais toujours
 *    connectée (Wi-Fi / Bluetooth). Le trajet précédent est enregistré, et un nouveau trajet
 *    démarre tout seul dès que la voiture repart ;
 *  - arrêté (voiture coupée).
 */
public class TripService extends Service implements LocationListener {
    static final String A_START = "fr.compteur208.START", A_STOP = "fr.compteur208.STOP",
            A_BT_ON = "fr.compteur208.BT_ON", A_BT_OFF = "fr.compteur208.BT_OFF";

    /** Fin du trajet après perte du lien voiture, une fois immobile depuis ce délai. */
    static final long BT_GRACE_MS = 90_000;
    /** Trajet manuel : arrêt automatique après 20 min sans bouger. */
    static final long IDLE_STOP_MS = 20 * 60_000;
    /** À l'arrêt contact mis : on arrête de surveiller au bout de 3 h. */
    static final long STANDBY_MAX_MS = 3 * 3_600_000L;
    /** Voiture coupée : on surveille encore ce temps-là pour reprendre tout seul au redémarrage. */
    static final long PARKED_WATCH_MS = 15 * 60_000L;
    /** En dessous, le trajet n'est pas gardé (ex. : voiture démarrée puis coupée). */
    static final double MIN_DIST_M = 300;
    /** Distance depuis la place de stationnement qui signifie « la voiture repart ». */
    static final float RESTART_DIST_M = 120;

    /** Trajet en cours (null si aucun, y compris à l'arrêt contact mis). Lu par l'accueil. */
    static volatile TripService live;
    /** Service actif (trajet en cours ou à l'arrêt contact mis). */
    static volatile TripService instance;

    final Handler handler = new Handler(Looper.getMainLooper());
    LocationManager lm;
    boolean started, standby, btPendingStop;
    /** En attente après coupure du contact (lien voiture perdu). */
    boolean parked;
    int fastFixes;
    String src = "manuel";
    long startTs, lastMoveTs, standbySince;
    double dist, vmax;
    long moving;
    float curSpeed;
    Location last, anchor;
    int jumps, ticks;
    String info = "", baseInfo = "";
    final List<double[]> pts = new ArrayList<>();

    /** Raison de la fin du trajet (enregistrée avec le trajet). */
    String endReason = "Terminé à la main";
    String linkReason;

    static long pauseMs(android.content.Context c) { return (long) (Prefs.pauseMinutes(c) * 60_000); }

    /**
     * Lien avec la voiture perdu : on ne termine le trajet que quand la voiture est
     * immobile depuis BT_GRACE_MS. Une coupure Wi-Fi en roulant ne coupe jamais le trajet.
     */
    final Runnable stopLater = new Runnable() {
        public void run() {
            if (!started || !btPendingStop) return;
            if (standby) { goParked(); return; }
            if (System.currentTimeMillis() - lastMoveTs >= BT_GRACE_MS) {
                endReason = linkReason;
                enterStandby();
                goParked();
            } else {
                handler.postDelayed(this, 15_000);
            }
        }
    };

    /** Pendant le trajet : si le Wi-Fi de la voiture disparaît, on prépare la fin du trajet. */
    ConnectivityManager.NetworkCallback wifiCb;

    private void watchCarWifi() {
        if (wifiCb != null || Prefs.carSsid(this) == null || !WifiWatch.onCarWifi(this)) return;
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        wifiCb = new ConnectivityManager.NetworkCallback() {
            @Override public void onLost(Network n) {
                handler.postDelayed(new Runnable() { public void run() { if (started && !WifiWatch.onCarWifi(TripService.this)) carLinkLost("Wi-Fi de la voiture perdu"); } }, 3000);
            }
            @Override public void onAvailable(Network n) {
                handler.postDelayed(new Runnable() { public void run() { if (started && WifiWatch.onCarWifi(TripService.this)) carLinkBack(); } }, 3000);
            }
        };
        try { cm.registerNetworkCallback(WifiWatch.wifiRequest(), wifiCb); } catch (Exception e) { wifiCb = null; }
    }

    private void carLinkLost(String reason) {
        btPendingStop = true;
        linkReason = reason;
        handler.removeCallbacks(stopLater);
        handler.postDelayed(stopLater, 15_000);
        updateNotif();
    }

    private void carLinkBack() {
        btPendingStop = false;
        handler.removeCallbacks(stopLater);
        if (standby && parked) newSegment(null, "voiture redémarrée");
        updateNotif();
    }

    /** Voiture coupée : trajet enregistré, on surveille encore un moment le redémarrage. */
    private void goParked() {
        parked = true;
        standbySince = System.currentTimeMillis();
        EventLog.add(this, "Voiture garée, surveillance du redémarrage pendant 15 min");
        updateNotif();
    }

    final Runnable tick = new Runnable() {
        public void run() {
            if (!started) return;
            long now = System.currentTimeMillis();
            if (standby) {
                if (now - standbySince > (parked ? PARKED_WATCH_MS : STANDBY_MAX_MS)) {
                    EventLog.add(TripService.this, "Fin de surveillance");
                    stopAll();
                    return;
                }
            } else if ("auto".equals(src) && !btPendingStop && now - lastMoveTs > pauseMs(TripService.this)) {
                // Arrêté contact mis : on clôt ce trajet et on attend que la voiture reparte.
                endReason = "Arrêt de " + Fmt.dur(now - lastMoveTs) + " (contact mis)";
                enterStandby();
            } else if (now - lastMoveTs > IDLE_STOP_MS) {
                endReason = "Immobile pendant 20 min";
                finish();
                return;
            }
            updateNotif();
            if (!standby && ++ticks % 4 == 0) checkpoint();
            handler.postDelayed(this, 5000);
        }
    };

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int flags, int id) {
        if (i == null) {
            // Redémarrage par Android après l'avoir tué : on reprend le trajet sauvegardé.
            if (!started && hasCheckpoint(this)) begin("auto");
            else if (!started) stopSelf();
            return started ? START_STICKY : START_NOT_STICKY;
        }
        String a = i.getAction() != null ? i.getAction() : A_START;
        if (A_STOP.equals(a)) {
            endReason = "Terminé à la main";
            if (started) finish(); else stopSelf();
        } else if (A_BT_OFF.equals(a)) {
            if (started) carLinkLost("Bluetooth de la voiture déconnecté"); else stopSelf();
        } else {
            btPendingStop = false;
            handler.removeCallbacks(stopLater);
            if (!started) {
                String s = i.getStringExtra("src");
                begin(s != null ? s : (A_BT_ON.equals(a) ? "auto" : "manuel"));
            } else {
                promote(); // déjà actif : on reste au premier plan
                if (standby && A_START.equals(a) && "manuel".equals(i.getStringExtra("src"))) {
                    newSegment(null, "Démarré à la main");
                } else if (standby && parked) {
                    newSegment(null, "voiture redémarrée");
                }
            }
        }
        return started ? START_STICKY : START_NOT_STICKY;
    }

    // ---------- Sauvegarde du trajet en cours (si Android tue l'appli) ----------

    static android.content.SharedPreferences cp(android.content.Context c) {
        return c.getSharedPreferences("trajet_en_cours", MODE_PRIVATE);
    }

    static boolean hasCheckpoint(android.content.Context c) {
        long saved = cp(c).getLong("saved", 0);
        return saved > 0 && System.currentTimeMillis() - saved < 15 * 60_000;
    }

    void checkpoint() {
        cp(this).edit().putLong("saved", System.currentTimeMillis()).putLong("start", startTs).putLong("lastMove", lastMoveTs)
                .putFloat("dist", (float) dist).putLong("moving", moving).putFloat("vmax", (float) vmax)
                .putString("src", src).putString("info", info).putString("pts", encode(pts)).apply();
    }

    void clearCheckpoint() { cp(this).edit().clear().apply(); }

    /** Trajet interrompu par Android et jamais repris : on l'enregistre tel quel. */
    void saveStaleCheckpoint() {
        android.content.SharedPreferences p = cp(this);
        if (p.getLong("saved", 0) == 0 || hasCheckpoint(this)) return;
        if (p.getFloat("dist", 0) >= MIN_DIST_M) {
            Db.Trip t = new Db.Trip();
            t.start = p.getLong("start", 0);
            t.end = Math.max(t.start, p.getLong("lastMove", t.start));
            t.dist = p.getFloat("dist", 0); t.moving = p.getLong("moving", 0); t.vmax = p.getFloat("vmax", 0);
            t.src = p.getString("src", "auto"); t.pts = p.getString("pts", "");
            t.info = p.getString("info", "") + " → Appli arrêtée par Android";
            Db.get(this).addTrip(t);
        }
        clearCheckpoint();
    }

    private boolean promote() {
        try {
            if (Build.VERSION.SDK_INT >= 29)
                startForeground(Notifs.ID_TRIP, Notifs.trip(this, "Trajet en cours", "Recherche du GPS…"), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else
                startForeground(Notifs.ID_TRIP, Notifs.trip(this, "Trajet en cours", "Recherche du GPS…"));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void begin(String source) {
        Notifs.channels(this);
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED || !promote()) {
            Notifs.cannotStart(this);
            stopSelf();
            return;
        }
        lm = getSystemService(LocationManager.class);
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
        } catch (Exception e) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            Notifs.info(this, "GPS indisponible", "Impossible d'enregistrer le trajet : active la localisation du téléphone.");
            stopSelf();
            return;
        }
        src = source;
        started = true;
        instance = this;
        String ssid = WifiWatch.onCarWifi(this) ? Prefs.carSsid(this) : null;
        baseInfo = "auto".equals(source) ? (ssid != null ? "Wi-Fi " + ssid : "Voiture détectée") : "Démarré à la main";
        resetTrip(baseInfo);
        saveStaleCheckpoint();
        if (hasCheckpoint(this)) {
            android.content.SharedPreferences p = cp(this);
            startTs = p.getLong("start", startTs);
            lastMoveTs = Math.max(p.getLong("lastMove", startTs), System.currentTimeMillis() - 60_000);
            dist = p.getFloat("dist", 0); moving = p.getLong("moving", 0); vmax = p.getFloat("vmax", 0);
            src = p.getString("src", source);
            info = p.getString("info", info) + " · repris après coupure";
            pts.addAll(decode(p.getString("pts", "")));
        }
        checkpoint();
        handler.post(tick);
        if ("auto".equals(src)) watchCarWifi();
        EventLog.add(this, "Trajet démarré (" + info + ")");
    }

    /** Remet les compteurs à zéro pour un nouveau trajet. */
    private void resetTrip(String inf) {
        standby = false;
        parked = false;
        fastFixes = 0;
        startTs = lastMoveTs = System.currentTimeMillis();
        dist = 0; vmax = 0; moving = 0; last = null; jumps = 0; curSpeed = 0; ticks = 0;
        endReason = "Terminé à la main";
        info = inf;
        pts.clear();
        live = this;
    }

    /** La voiture est arrêtée contact mis : on enregistre le trajet et on attend qu'elle reparte. */
    private void enterStandby() {
        saveTrip(Math.max(startTs, lastMoveTs));
        clearCheckpoint();
        standby = true;
        standbySince = System.currentTimeMillis();
        anchor = last;
        live = null;
        pts.clear();
        dist = 0;
        fastFixes = 0;
        EventLog.add(this, "Trajet terminé : " + endReason);
    }

    /** La voiture repart : nouveau trajet, qui commence à la place de stationnement. */
    private void newSegment(Location now, String why) {
        Location from = anchor;
        resetTrip(baseInfo + " · " + why);
        if (from != null) {
            last = from;
            addPoint(from);
        }
        anchor = null;
        checkpoint();
        EventLog.add(this, "Nouveau trajet : " + why);
        updateNotif();
        if (now != null) onLocationChanged(now);
    }

    @Override public void onLocationChanged(Location l) {
        if (!started) return;
        curSpeed = l.hasSpeed() ? l.getSpeed() : 0;
        if (l.hasAccuracy() && l.getAccuracy() > 35) return;          // point trop imprécis

        if (standby) {
            if (anchor == null) { anchor = l; return; }
            boolean far = anchor.distanceTo(l) > Math.max(RESTART_DIST_M, l.hasAccuracy() ? l.getAccuracy() * 3 : 0);
            boolean fast = l.hasSpeed() && l.getSpeed() > 6 && (!l.hasAccuracy() || l.getAccuracy() < 25);
            fastFixes = fast ? fastFixes + 1 : 0;
            if (parked) {
                // Voiture coupée : on peut marcher avec le téléphone, donc seule une vraie vitesse
                // de voiture (> 22 km/h sur 3 mesures de suite) relance un trajet.
                if (fastFixes >= 3) newSegment(l, "la voiture roule de nouveau");
            } else if (far || fastFixes >= 1) {
                newSegment(l, "reprise après un arrêt");
            }
            return;
        }

        if (last == null) { last = l; addPoint(l); return; }
        float d = last.distanceTo(l);
        double thr = Math.max(10, l.hasAccuracy() ? l.getAccuracy() : 15); // filtre le « bruit » GPS à l'arrêt
        if (d < thr) return;
        double dt = Math.max(1, (l.getTime() - last.getTime()) / 1000.0);
        double v = d / dt;
        if (v > 70) {                                                  // saut GPS aberrant (> 250 km/h)
            if (++jumps > 3) { last = l; jumps = 0; }
            return;
        }
        jumps = 0;
        dist += d;
        if (v > 1) moving += (long) (Math.min(dt, 30) * 1000);
        double kmh = (l.hasSpeed() ? l.getSpeed() : v) * 3.6;
        if (kmh > vmax && kmh < 250) vmax = kmh;
        last = l;
        lastMoveTs = System.currentTimeMillis();
        addPoint(l);
    }

    private void addPoint(Location l) { pts.add(new double[]{l.getLatitude(), l.getLongitude()}); }

    // Anciennes versions d'Android : méthodes abstraites à fournir.
    @Override public void onStatusChanged(String p, int s, Bundle b) {}
    @Override public void onProviderEnabled(String p) {}
    @Override public void onProviderDisabled(String p) {}

    private void updateNotif() {
        if (!started) return;
        String title, text;
        if (standby && parked) {
            title = "🅿️ Voiture garée";
            text = "Si tu repars dans les 15 min, le trajet démarrera tout seul";
        } else if (standby) {
            title = "🅿️ À l'arrêt, contact mis";
            text = "Un nouveau trajet démarrera dès que la voiture repartira";
        } else {
            text = Fmt.km(dist / 1000) + " · " + Fmt.dur(System.currentTimeMillis() - startTs)
                    + " · " + Math.round(curSpeed * 3.6) + " km/h";
            title = btPendingStop ? "Voiture déconnectée – fin du trajet une fois garé" : "🚗 Trajet en cours";
        }
        try {
            getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, Notifs.trip(this, title, text));
        } catch (Exception ignored) {}
    }

    /** Enregistre le trajet courant s'il est assez long. */
    private void saveTrip(long end) {
        if (dist < MIN_DIST_M) return;
        Db.Trip t = new Db.Trip();
        t.start = startTs; t.end = Math.max(end, startTs); t.dist = dist; t.moving = moving; t.vmax = vmax;
        t.src = src; t.pts = encode(pts); t.info = info + " → " + endReason;
        Db.get(this).addTrip(t);
        List<Db.Fuel> fuels = Db.get(this).fuels();
        double cost = t.km() * Calc.costPerKm(this, fuels);
        Notifs.info(this, "Trajet enregistré ✅",
                Fmt.km(t.km()) + " en " + Fmt.dur(t.duration()) + " · environ " + Fmt.eur(cost) + " de carburant");
    }

    /** Termine le trajet (s'il y en a un) et arrête le service. */
    void finish() {
        if (started && !standby) saveTrip(Math.min(System.currentTimeMillis(), lastMoveTs + 60_000));
        stopAll();
    }

    /** Arrête tout, sans enregistrer. */
    void stopAll() {
        if (started) EventLog.add(this, "Surveillance arrêtée");
        started = false;
        parked = false;
        standby = false;
        live = null;
        instance = null;
        handler.removeCallbacksAndMessages(null);
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) {}
        if (wifiCb != null) {
            try { getSystemService(ConnectivityManager.class).unregisterNetworkCallback(wifiCb); } catch (Exception ignored) {}
            wifiCb = null;
        }
        clearCheckpoint();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    static String encode(List<double[]> p) {
        int step = Math.max(1, p.size() / 2500 + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < p.size(); i++) {
            if (i % step != 0 && i != p.size() - 1) continue;
            if (sb.length() > 0) sb.append(';');
            sb.append(String.format(Locale.US, "%.5f,%.5f", p.get(i)[0], p.get(i)[1]));
        }
        return sb.toString();
    }

    static List<double[]> decode(String s) {
        List<double[]> out = new ArrayList<>();
        if (s == null || s.isEmpty()) return out;
        for (String part : s.split(";")) {
            int k = part.indexOf(',');
            if (k <= 0) continue;
            try { out.add(new double[]{Double.parseDouble(part.substring(0, k)), Double.parseDouble(part.substring(k + 1))}); }
            catch (NumberFormatException ignored) {}
        }
        return out;
    }

    @Override public void onDestroy() {
        if (started) { endReason = "Appli arrêtée par Android"; finish(); }
        super.onDestroy();
    }
}
