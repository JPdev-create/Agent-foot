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

    static boolean onCarWifi(Context c) {
        String car = Prefs.carSsid(c), cur = currentSsid(c);
        return car != null && cur != null && car.equalsIgnoreCase(cur.trim());
    }

    /** Réveillé par Android quand un Wi-Fi se connecte. */
    public static class Receiver extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) {
            if (!Prefs.autoEnabled(c)) return;
            if (onCarWifi(c)) BtReceiver.carConnected(c);
        }
    }

    /** Après un redémarrage ou une mise à jour, Android oublie l'inscription : on la refait. */
    public static class Boot extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent i) { register(c); }
    }
}
