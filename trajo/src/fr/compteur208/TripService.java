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
    /**
     * Lien voiture perdu pendant un trajet. On continue de compter les km (Android cache parfois
     * le Wi-Fi d'Android Auto) mais si la voiture s'immobilise sans que le lien revienne,
     * le trajet s'arrête au dernier moment où elle roulait (on ne compte jamais la marche à pied
     * ni un autre véhicule pris ensuite).
     */
    boolean frozen;
    long lostTs;
    int misses;
    /** Lien perdu + voiture réellement arrêtée (GPS) pendant ce délai => fin du trajet. */
    static final long STOP_WHILE_LOST_MS = 90_000L;
    /** Le lien doit manquer au moins ce temps (l'AutoBox se déconnecte souvent quelques secondes). */
    static final long LINK_ABSENT_MS = 2 * 60_000L;
    /** Recollage : un nouveau trajet qui repart du même endroit peu après est fusionné avec le précédent. */
    static final long MERGE_GAP_MS = 5 * 60_000L;
    /** Depuis quand le GPS mesure une vitesse < 7 km/h (0 = le véhicule roule) ; dernière mesure GPS. */
    long slowSince, lastFixTs;
    /** Dernier instant où le véhicule roulait (> 15 km/h) et état du trajet à ce moment. */
    long lastDriveTs;
    double snapDist, snapVmax;
    long snapMoving;
    int snapPts, snapAcc, snapBrk;
    long snapFast;
    /** Voiture garée : il faut avoir vu le lien absent avant de le considérer « revenu ». */
    boolean sawAbsent;

    /** Le téléphone est-il connecté à la voiture (Wi-Fi ou un des Bluetooth configurés) ? */
    boolean linkPresent() {
        boolean wifiCfg = Prefs.carSsid(this) != null, btCfg = !Prefs.carAddresses(this).isEmpty();
        if (!wifiCfg && !btCfg) return true;
        return (btCfg && Prefs.btConnected(this)) || (wifiCfg && WifiWatch.onCarWifi(this));
    }

    /** Mémorise l'état du trajet tant que le véhicule roule vraiment. */
    private void snapshot() {
        lastDriveTs = System.currentTimeMillis();
        snapDist = dist; snapVmax = vmax; snapMoving = moving; snapPts = pts.size();
        snapAcc = accN; snapBrk = brkN; snapFast = fastMs;
    }

    /** Revient à l'état du dernier instant où le véhicule roulait. */
    private void rollback() {
        dist = snapDist; vmax = snapVmax; moving = snapMoving;
        accN = snapAcc; brkN = snapBrk; fastMs = snapFast;
        while (pts.size() > Math.max(snapPts, 1)) pts.remove(pts.size() - 1);
        lastMoveTs = Math.max(startTs, lastDriveTs);
    }
    // Éco-conduite
    int accN, brkN;
    long fastMs, prevVT, lastAccEv, lastBrkEv;
    float prevV = -1;
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
            if (standby) goParked();
        }
    };

    /** Pendant le trajet : si le Wi-Fi de la voiture disparaît, on prépare la fin du trajet. */
    ConnectivityManager.NetworkCallback wifiCb;

    private void watchCarWifi() {
        if (wifiCb != null || Prefs.carSsid(this) == null) return;
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        wifiCb = WifiWatch.carCallback(this, new Runnable() {
            public void run() {
                if (!started) return;
                if (linkPresent()) carLinkBack();
                else carLinkLost("Wi-Fi de la voiture perdu");
            }
        });
        try { cm.registerNetworkCallback(WifiWatch.wifiRequest(), wifiCb); } catch (Exception e) { wifiCb = null; }
    }

    private void carLinkLost(String reason) {
        if (!"auto".equals(src)) return;            // trajet démarré à la main : pas lié à la voiture
        if (btPendingStop) return;
        btPendingStop = true;
        linkReason = reason;
        handler.removeCallbacks(stopLater);
        if (standby) {
            handler.postDelayed(stopLater, 15_000);
        } else {
            frozen = true;
            lostTs = System.currentTimeMillis();
            EventLog.add(this, reason + " : le trajet continue tant que la voiture roule");
        }
        updateNotif();
    }

    private void carLinkBack() {
        if (!btPendingStop && !frozen && !(standby && parked)) return;
        btPendingStop = false;
        handler.removeCallbacks(stopLater);
        if (frozen) { frozen = false; EventLog.add(this, "Voiture retrouvée"); }
        if (standby && parked) newSegment(null, "voiture redémarrée");
        updateNotif();
    }

    /** Voiture coupée : trajet enregistré, on surveille encore un moment le redémarrage. */
    private void goParked() {
        parked = true;
        sawAbsent = false;
        standbySince = System.currentTimeMillis();
        stopGps();   // plus besoin du GPS : seul le retour du lien voiture relance un trajet
        EventLog.add(this, "Voiture garée, nouveau trajet si elle se reconnecte dans les 15 min");
        updateNotif();
    }

    void startGps() {
        try {
            if (lm == null) lm = getSystemService(LocationManager.class);
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
        } catch (Exception ignored) {}
    }

    void stopGps() {
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) {}
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
                // Voiture garée : si le lien revient (après avoir disparu), nouveau trajet.
                if (parked && ticks % 2 == 0) {
                    if (!linkPresent()) sawAbsent = true;
                    else if (sawAbsent) { newSegment(null, "voiture reconnectée"); handler.postDelayed(this, 5000); return; }
                }
                ticks++;
            } else if (frozen && now - lostTs >= LINK_ABSENT_MS
                    && ((slowSince > 0 && now - slowSince >= STOP_WHILE_LOST_MS)
                        || (now - lastFixTs >= 5 * 60_000L && now - lastMoveTs >= 5 * 60_000L))) {
                // Lien perdu et la voiture ne roule plus : fin du trajet au dernier instant où elle roulait.
                rollback();
                endReason = linkReason;
                frozen = false;
                enterStandby();
                goParked();
            } else if ("auto".equals(src) && !btPendingStop && now - lastMoveTs > pauseMs(TripService.this)) {
                misses = 0;
                // Arrêté contact mis : on clôt ce trajet et on attend que la voiture reparte.
                endReason = "Arrêt de " + Fmt.dur(now - lastMoveTs) + " (contact mis)";
                enterStandby();
            } else if (now - lastMoveTs > IDLE_STOP_MS) {
                endReason = "Immobile pendant 20 min";
                finish();
                return;
            }
            // Vérification régulière du lien voiture (au cas où Android n'a pas prévenu).
            if (!standby && "auto".equals(src) && ticks % 2 == 0) {
                boolean ok = linkPresent();
                if (ok) { misses = 0; if (frozen) carLinkBack(); }
                else if (!frozen && ++misses >= 3) carLinkLost("Voiture déconnectée");
            }
            updateNotif();
            // Partage avec les groupes : position toutes les 15 s pendant le trajet.
            if (!standby && ticks % 3 == 0 && last != null)
                Cloud.pushLive(TripService.this, last.getLatitude(), last.getLongitude(), curSpeed * 3.6f, startTs, dist / 1000, pts);
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
            if (started) { if (!linkPresent()) carLinkLost("Bluetooth de la voiture déconnecté"); } else stopSelf();
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
                } else if (frozen) {
                    btPendingStop = true;
                    carLinkBack();
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
                .putString("src", src).putString("info", info).putString("pts", encode(pts))
                .putInt("acc", accN).putInt("brk", brkN).putLong("fast", fastMs).apply();
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
            t.acc = p.getInt("acc", -1); t.brk = p.getInt("brk", -1); t.fast = p.getLong("fast", 0);
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
            accN = p.getInt("acc", 0); brkN = p.getInt("brk", 0); fastMs = p.getLong("fast", 0);
            pts.addAll(decode(p.getString("pts", "")));
        }
        checkpoint();
        snapshot();
        handler.post(tick);
        watchCarWifi();
        EventLog.add(this, "Trajet démarré (" + info + ")");
    }

    /** Remet les compteurs à zéro pour un nouveau trajet. */
    private void resetTrip(String inf) {
        standby = false;
        parked = false;
        frozen = false;
        misses = 0;
        btPendingStop = false;
        lastDriveTs = System.currentTimeMillis();
        slowSince = 0; lastFixTs = 0;
        snapDist = 0; snapVmax = 0; snapMoving = 0; snapPts = 0; snapAcc = 0; snapBrk = 0; snapFast = 0;
        fastFixes = 0;
        startTs = lastMoveTs = System.currentTimeMillis();
        dist = 0; vmax = 0; moving = 0; last = null; jumps = 0; curSpeed = 0; ticks = 0;
        endReason = "Terminé à la main";
        info = inf;
        accN = 0; brkN = 0; fastMs = 0; prevV = -1; prevVT = 0; lastAccEv = 0; lastBrkEv = 0;
        pts.clear();
        live = this;
    }

    /** La voiture est arrêtée contact mis : on enregistre le trajet et on attend qu'elle reparte. */
    private void enterStandby() {
        saveTrip(Math.max(startTs, lastMoveTs));
        sharePark();
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
        if (parked) startGps();
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
            // Voiture coupée : on ne relance JAMAIS un trajet sur le seul GPS (autre véhicule, bus…),
            // seulement au retour du Wi-Fi / Bluetooth de la voiture (voir carLinkBack).
            if (!parked && (far || fastFixes >= 1)) newSegment(l, "reprise après un arrêt");
            return;
        }

        trackDriving(l);
        lastFixTs = System.currentTimeMillis();
        if (l.hasSpeed()) {
            if (l.getSpeed() < 2f) { if (slowSince == 0) slowSince = lastFixTs; }
            else if (l.getSpeed() > 3f) slowSince = 0;
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
        if (!l.hasSpeed() && v > 3) slowSince = 0;
        if ((l.hasSpeed() ? l.getSpeed() : v) >= 4.2) snapshot();   // > 15 km/h : le véhicule roule
    }

    /**
     * Éco-conduite : à partir de la vitesse GPS (1 mesure/s), repère les accélérations
     * (> 3 m/s²) et freinages (< -3,5 m/s²) brusques, et le temps passé au-dessus de 135 km/h.
     */
    private void trackDriving(Location l) {
        if (!l.hasSpeed() || (l.hasAccuracy() && l.getAccuracy() > 25)) { prevV = -1; return; }
        float v = l.getSpeed();
        long t = l.getTime();
        if (prevV >= 0) {
            double dt = (t - prevVT) / 1000.0;
            if (dt >= 0.5 && dt <= 3) {
                double a = (v - prevV) / dt;
                if (a > 3.0 && t - lastAccEv > 4000) { accN++; lastAccEv = t; }
                if (a < -3.5 && t - lastBrkEv > 4000) { brkN++; lastBrkEv = t; }
                if (v * 3.6 > 135) fastMs += (long) (dt * 1000);
            }
        }
        prevV = v;
        prevVT = t;
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
            text = "Nouveau trajet si le téléphone se reconnecte à la voiture dans les 15 min";
        } else if (standby) {
            title = "🅿️ À l'arrêt, contact mis";
            text = "Un nouveau trajet démarrera dès que la voiture repartira";
        } else {
            text = Fmt.km(dist / 1000) + " · " + Fmt.dur(System.currentTimeMillis() - startTs)
                    + " · " + Math.round(curSpeed * 3.6) + " km/h"
                    + (Cloud.sharingActive(this) ? " · 📡 position partagée" : "");
            title = frozen ? "🚗 Trajet en cours (voiture non détectée)" : "🚗 Trajet en cours";
        }
        try {
            getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, Notifs.trip(this, title, text));
        } catch (Exception ignored) {}
    }

    /** Indique aux groupes où la voiture est garée (dernier point du trajet). */
    private void sharePark() {
        double[] p = !pts.isEmpty() ? pts.get(pts.size() - 1) : (last != null ? new double[]{last.getLatitude(), last.getLongitude()} : null);
        if (p != null) Cloud.pushParked(this, p[0], p[1], System.currentTimeMillis());
    }

    /** Enregistre le trajet courant s'il est assez long. */
    private void saveTrip(long end) {
        Db.Trip t = new Db.Trip();
        t.start = startTs; t.end = Math.max(end, startTs); t.dist = dist; t.moving = moving; t.vmax = vmax;
        t.src = src; t.pts = encode(pts); t.info = info + " → " + endReason;
        t.acc = accN; t.brk = brkN; t.fast = fastMs;
        Db db = Db.get(this);
        Db.Trip prev = db.lastTrip();
        if (prev != null && mergeable(prev, t)) {
            List<double[]> a = decode(prev.pts), b = decode(t.pts);
            double gap = (!a.isEmpty() && !b.isEmpty())
                    ? Stats.dist(a.get(a.size() - 1)[0], a.get(a.size() - 1)[1], b.get(0)[0], b.get(0)[1]) : 0;
            a.addAll(b);
            prev.end = t.end;
            prev.dist += t.dist + gap;
            prev.moving += t.moving;
            prev.vmax = Math.max(prev.vmax, t.vmax);
            if (prev.acc >= 0) { prev.acc += t.acc; prev.brk += t.brk; prev.fast += t.fast; }
            prev.pts = encode(a);
            String pi = prev.info == null ? "" : prev.info;
            prev.info = (pi.contains(" → ") ? pi.substring(0, pi.lastIndexOf(" → ")) : pi) + " · recollé → " + endReason;
            db.updateTrip(prev);
            EventLog.add(this, "Trajet recollé au précédent (" + Fmt.km(prev.km()) + " au total)");
            t = prev;
        } else {
            if (dist < MIN_DIST_M) return;
            db.addTrip(t);
        }
        List<Db.Fuel> fuels = Db.get(this).fuels();
        double cost = t.km() * Calc.costPerKm(this, fuels);
        Notifs.info(this, "Trajet enregistré ✅",
                Fmt.km(t.km()) + " en " + Fmt.dur(t.duration()) + " · environ " + Fmt.eur(cost) + " de carburant");
    }

    /** Même voiture, repart du même endroit peu après la fin du trajet précédent : c'est la suite. */
    private boolean mergeable(Db.Trip prev, Db.Trip t) {
        if (!"auto".equals(prev.src) || !"auto".equals(t.src)) return false;
        // Seulement après une coupure de connexion (pas après un vrai arrêt « contact mis », voulu séparé).
        String pi = prev.info == null ? "" : prev.info;
        String endPart = pi.contains(" → ") ? pi.substring(pi.lastIndexOf(" → ")) : "";
        if (!(endPart.contains("déconnect") || endPart.contains("perdu"))) return false;
        if (t.start - prev.end > MERGE_GAP_MS || t.start < prev.end - 60_000) return false;
        List<double[]> a = decode(prev.pts), b = decode(t.pts);
        if (a.isEmpty() || b.isEmpty()) return false;
        double[] e = a.get(a.size() - 1), s0 = b.get(0);
        return Stats.dist(e[0], e[1], s0[0], s0[1]) < 1500;
    }

    /** Termine le trajet (s'il y en a un) et arrête le service. */
    void finish() {
        if (started && !standby) { saveTrip(Math.min(System.currentTimeMillis(), lastMoveTs + 60_000)); sharePark(); }
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
