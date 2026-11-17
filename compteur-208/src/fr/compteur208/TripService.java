package fr.compteur208;

import android.Manifest;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.net.ConnectivityManager;
import android.net.Network;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Service qui enregistre un trajet avec le GPS.
 * Démarré automatiquement quand le téléphone se connecte au Bluetooth de la voiture,
 * arrêté quand il s'en déconnecte (ou à la main).
 */
public class TripService extends Service implements LocationListener {
    static final String A_START = "fr.compteur208.START", A_STOP = "fr.compteur208.STOP",
            A_BT_ON = "fr.compteur208.BT_ON", A_BT_OFF = "fr.compteur208.BT_OFF";

    /** Fin du trajet après déconnexion Bluetooth (évite de couper sur une micro-coupure). */
    static final long BT_GRACE_MS = 90_000;
    /** Trajet manuel : arrêt automatique après 20 min sans bouger. */
    static final long IDLE_STOP_MS = 20 * 60_000;
    /** En dessous, le trajet n'est pas gardé (ex. : voiture démarrée puis coupée). */
    static final double MIN_DIST_M = 300;

    /** Trajet en cours (null si aucun). Lu par l'écran d'accueil. */
    static volatile TripService live;

    final Handler handler = new Handler(Looper.getMainLooper());
    LocationManager lm;
    boolean started, btPendingStop;
    String src = "manuel";
    long startTs, lastMoveTs;
    double dist, vmax;
    long moving;
    float curSpeed;
    Location last;
    int jumps;
    final List<double[]> pts = new ArrayList<>();

    final Runnable stopLater = new Runnable() { public void run() { finish(); } };

    /** Pendant le trajet : si le Wi-Fi de la voiture disparaît, on prépare la fin du trajet. */
    ConnectivityManager.NetworkCallback wifiCb;

    private void watchCarWifi() {
        if (Prefs.carSsid(this) == null || !WifiWatch.onCarWifi(this)) return;
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        wifiCb = new ConnectivityManager.NetworkCallback() {
            @Override public void onLost(Network n) {
                handler.postDelayed(new Runnable() { public void run() { if (started && !WifiWatch.onCarWifi(TripService.this)) carLinkLost(); } }, 3000);
            }
            @Override public void onAvailable(Network n) {
                handler.postDelayed(new Runnable() { public void run() { if (started && WifiWatch.onCarWifi(TripService.this)) carLinkBack(); } }, 3000);
            }
        };
        try { cm.registerNetworkCallback(WifiWatch.wifiRequest(), wifiCb); } catch (Exception e) { wifiCb = null; }
    }

    private void carLinkLost() {
        btPendingStop = true;
        handler.removeCallbacks(stopLater);
        handler.postDelayed(stopLater, BT_GRACE_MS);
        updateNotif();
    }

    private void carLinkBack() {
        btPendingStop = false;
        handler.removeCallbacks(stopLater);
        updateNotif();
    }

    final Runnable tick = new Runnable() {
        public void run() {
            if (!started) return;
            long now = System.currentTimeMillis();
            if (!"auto".equals(src) && now - lastMoveTs > IDLE_STOP_MS) { finish(); return; }
            updateNotif();
            handler.postDelayed(this, 5000);
        }
    };

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int flags, int id) {
        String a = i != null && i.getAction() != null ? i.getAction() : A_START;
        if (A_STOP.equals(a)) {
            if (started) finish(); else stopSelf();
        } else if (A_BT_OFF.equals(a)) {
            if (started) carLinkLost(); else stopSelf();
        } else {
            btPendingStop = false;
            handler.removeCallbacks(stopLater);
            if (!started) {
                String s = i != null ? i.getStringExtra("src") : null;
                begin(s != null ? s : (A_BT_ON.equals(a) ? "auto" : "manuel"));
            } else {
                promote(); // déjà en cours : on reste au premier plan
            }
        }
        return START_NOT_STICKY;
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
        startTs = lastMoveTs = System.currentTimeMillis();
        dist = 0; vmax = 0; moving = 0; last = null; jumps = 0; curSpeed = 0;
        pts.clear();
        live = this;
        handler.post(tick);
        if ("auto".equals(src)) watchCarWifi();
    }

    @Override public void onLocationChanged(Location l) {
        if (!started) return;
        curSpeed = l.hasSpeed() ? l.getSpeed() : 0;
        if (l.hasAccuracy() && l.getAccuracy() > 35) return;          // point trop imprécis
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
        String text = Fmt.km(dist / 1000) + " · " + Fmt.dur(System.currentTimeMillis() - startTs)
                + " · " + Math.round(curSpeed * 3.6) + " km/h";
        String title = btPendingStop ? "Voiture coupée – fin du trajet dans un instant" : "🚗 Trajet en cours";
        try {
            getSystemService(NotificationManager.class).notify(Notifs.ID_TRIP, Notifs.trip(this, title, text));
        } catch (Exception ignored) {}
    }

    /** Termine le trajet et l'enregistre s'il est assez long. */
    void finish() {
        if (!started) { stopSelf(); return; }
        started = false;
        live = null;
        handler.removeCallbacksAndMessages(null);
        try { lm.removeUpdates(this); } catch (Exception ignored) {}
        if (wifiCb != null) {
            try { getSystemService(ConnectivityManager.class).unregisterNetworkCallback(wifiCb); } catch (Exception ignored) {}
            wifiCb = null;
        }
        long end = Math.min(System.currentTimeMillis(), lastMoveTs + 60_000);
        if (dist >= MIN_DIST_M) {
            Db.Trip t = new Db.Trip();
            t.start = startTs; t.end = Math.max(end, startTs); t.dist = dist; t.moving = moving; t.vmax = vmax;
            t.src = src; t.pts = encode(pts);
            Db.get(this).addTrip(t);
            List<Db.Fuel> fuels = Db.get(this).fuels();
            double cost = t.km() * Calc.costPerKm(this, fuels);
            Notifs.info(this, "Trajet enregistré ✅",
                    Fmt.km(t.km()) + " en " + Fmt.dur(t.duration()) + " · environ " + Fmt.eur(cost) + " de carburant");
        }
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
        if (started) finish();
        super.onDestroy();
    }
}
