package fr.compteur208;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;

/**
 * Détection du Wi-Fi de la voiture (ex. : boîtier AutoBox CarPlay / Android Auto sans fil).
 * Android réveille l'appli via {@link Receiver} à chaque connexion Wi-Fi, même si elle est fermée.
 */
final class WifiWatch {
    private WifiWatch() {}

    static NetworkRequest wifiRequest() {
        // Le boîtier n'a pas d'accès Internet : on ne l'exige donc pas.
        return new NetworkRequest.Builder()
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
    }

    /** (Ré)inscrit la surveillance du Wi-Fi auprès d'Android. Sans effet si aucun Wi-Fi n'est configuré. */
    static void register(Context c) {
        ConnectivityManager cm = c.getSystemService(ConnectivityManager.class);
        if (cm == null) return;
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
        PendingIntent pi = PendingIntent.getBroadcast(c, 10, new Intent(c, Receiver.class), flags);
        try { cm.releaseNetworkRequest(pi); } catch (Exception ignored) {}
        if (Prefs.carSsid(c) == null) return;
        try { cm.registerNetworkCallback(wifiRequest(), pi); } catch (Exception ignored) {}
    }

    /** Nom du Wi-Fi actuellement connecté, ou null (il faut l'autorisation de localisation). */
    @SuppressWarnings("deprecation")
    static String currentSsid(Context c) {
        try {
            WifiManager wm = c.getApplicationContext().getSystemService(WifiManager.class);
            WifiInfo info = wm != null ? wm.getConnectionInfo() : null;
            if (info == null) return null;
            String s = info.getSSID();
            if (s == null) return null;
            if (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) s = s.substring(1, s.length() - 1);
            if (s.isEmpty() || s.equals("<unknown ssid>") || s.equals(WifiManager.UNKNOWN_SSID)) return null;
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    /** Réseaux Wi-Fi de la voiture vus par le rappel réseau (y compris hors réseau principal). */
    static final java.util.Set<android.net.Network> CAR_NETS = java.util.Collections.synchronizedSet(new java.util.HashSet<android.net.Network>());

    static boolean onCarWifi(Context c) {
        if (!CAR_NETS.isEmpty()) return true;
        String car = Prefs.carSsid(c), cur = currentSsid(c);
        return car != null && cur != null && car.equalsIgnoreCase(cur.trim());
    }

    static String clean(String s) {
        if (s == null) return null;
        if (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) s = s.substring(1, s.length() - 1);
        return s.isEmpty() || s.equals("<unknown ssid>") ? null : s;
    }

    /**
     * Rappel réseau qui lit le nom de chaque Wi-Fi connecté (Android 12+ : avec les infos de
     * localisation), pour reconnaître le Wi-Fi de la voiture même s'il n'est pas le réseau principal.
     * onChange est appelé à chaque changement.
     */
    static ConnectivityManager.NetworkCallback carCallback(final Context c, final Runnable onChange) {
        final android.os.Handler h = new android.os.Handler(android.os.Looper.getMainLooper());
        if (Build.VERSION.SDK_INT >= 31) return new CarNetCb(c, h, onChange, ConnectivityManager.NetworkCallback.FLAG_INCLUDE_LOCATION_INFO);
        return new CarNetCb(c, h, onChange);
    }

    static final class CarNetCb extends ConnectivityManager.NetworkCallback {
        final Context c; final android.os.Handler h; final Runnable onChange;

        CarNetCb(Context c, android.os.Handler h, Runnable r) { super(); this.c = c; this.h = h; this.onChange = r; }
        CarNetCb(Context c, android.os.Handler h, Runnable r, int flags) { super(flags); this.c = c; this.h = h; this.onChange = r; }

        @Override public void onCapabilitiesChanged(android.net.Network n, NetworkCapabilities nc) {
            String ssid = null;
            if (Build.VERSION.SDK_INT >= 29 && nc.getTransportInfo() instanceof WifiInfo)
                ssid = clean(((WifiInfo) nc.getTransportInfo()).getSSID());
            String car = Prefs.carSsid(c);
            boolean was = CAR_NETS.contains(n);
            boolean is = car != null && ssid != null && car.equalsIgnoreCase(ssid);
            if (is) CAR_NETS.add(n); else if (ssid != null) CAR_NETS.remove(n);
            if (was != is && ssid != null) fire();
        }

        @Override public void onLost(android.net.Network n) {
            boolean was = CAR_NETS.remove(n);
            if (was) fire();
            else h.postDelayed(onChange, 3000);   // réseau sans nom lisible : on revérifie
        }

        @Override public void onAvailable(android.net.Network n) { h.postDelayed(onChange, 3000); }

        void fire() { h.post(onChange); }
    }

    /** Réveillé par Android quand un Wi-Fi se connecte. */
    public static class Receiver extends BroadcastReceiver {
        @Override public void onReceive(final Context c, Intent i) {
            if (!Prefs.autoEnabled(c)) return;
            if (onCarWifi(c)) { EventLog.add(c, "Wi-Fi voiture connecté"); BtReceiver.carConnected(c); return; }
            // Le nom du Wi-Fi n'est pas toujours lisible tout de suite : on réessaie quelques secondes.
            final PendingResult pr = goAsync();
            final android.os.Handler h = new android.os.Handler(android.os.Looper.getMainLooper());
            final int[] tries = {0};
            h.postDelayed(new Runnable() {
                public void run() {
                    if (onCarWifi(c)) {
                        EventLog.add(c, "Wi-Fi voiture connecté (après " + (tries[0] + 1) * 2 + " s)");
                        BtReceiver.carConnected(c);
                        pr.finish();
                    } else if (++tries[0] < 4) {
                        h.postDelayed(this, 2000);
                    } else {
                        String cur = currentSsid(c);
                        EventLog.add(c, "Wi-Fi connecté mais pas celui de la voiture (" + (cur == null ? "nom illisible" : cur) + ")");
                        pr.finish();
                    }
                }
            }, 2000);
        }
    }

    /** Après un redémarrage ou une mise à jour, Android oublie l'inscription : on la refait. */
    public static class Boot extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) { register(c); Report.schedule(c); }
    }
}
