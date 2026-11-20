package fr.compteur208;

import android.content.Context;
import android.content.SharedPreferences;

/** Réglages de l'application (stockés sur le téléphone). */
final class Prefs {
    private Prefs() {}

    static SharedPreferences get(Context c) {
        return c.getSharedPreferences("reglages", Context.MODE_PRIVATE);
    }

    static boolean autoEnabled(Context c) { return get(c).getBoolean("auto", true); }
    /** Adresses des appareils Bluetooth de la voiture (autoradio, boîtier AutoBox…). */
    static java.util.Set<String> carAddresses(Context c) {
        java.util.Set<String> s = new java.util.LinkedHashSet<>();
        for (String a : get(c).getString("car_addrs", "").split(",")) if (!a.trim().isEmpty()) s.add(a.trim().toUpperCase());
        String old = get(c).getString("car_addr", null);
        if (old != null) s.add(old.toUpperCase());
        return s;
    }
    static String carAddress(Context c) {
        java.util.Set<String> s = carAddresses(c);
        return s.isEmpty() ? null : s.iterator().next();
    }
    static String carName(Context c) {
        String n = get(c).getString("car_names", null);
        if (n != null && !n.isEmpty()) return n;
        return get(c).getString("car_name", null);
    }
    static void setCars(Context c, java.util.Map<String, String> addrToName) {
        StringBuilder a = new StringBuilder(), n = new StringBuilder();
        for (java.util.Map.Entry<String, String> e : addrToName.entrySet()) {
            if (a.length() > 0) { a.append(','); n.append(" + "); }
            a.append(e.getKey().toUpperCase()); n.append(e.getValue());
        }
        get(c).edit().remove("car_addr").remove("car_name").putString("car_addrs", a.toString()).putString("car_names", n.toString()).apply();
    }
    static boolean isCar(Context c, String addr) { return addr != null && carAddresses(c).contains(addr.toUpperCase()); }

    /** Appareils Bluetooth de la voiture actuellement connectés. */
    static boolean btConnected(Context c) { return !get(c).getString("bt_conn", "").isEmpty(); }
    static void setBtState(Context c, String addr, boolean on) {
        java.util.Set<String> s = new java.util.HashSet<>();
        for (String a : get(c).getString("bt_conn", "").split(",")) if (!a.isEmpty()) s.add(a);
        if (on) s.add(addr.toUpperCase()); else s.remove(addr.toUpperCase());
        StringBuilder b = new StringBuilder();
        for (String a : s) { if (b.length() > 0) b.append(','); b.append(a); }
        get(c).edit().putString("bt_conn", b.toString()).apply();
    }
    /** Wi-Fi de la voiture (boîtier CarPlay / Android Auto). Vide = désactivé. */
    static String carSsid(Context c) {
        String s = get(c).getString("car_ssid", "AutoBox-9678");
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }
    static boolean carConfigured(Context c) { return carAddress(c) != null || carSsid(c) != null; }

    /** Consommation utilisée tant qu'il n'y a pas assez de pleins enregistrés (L/100 km). */
    static double defaultConso(Context c) { return get(c).getFloat("conso_def", 5.5f); }
    /** Prix du litre utilisé tant qu'aucun plein n'est enregistré (€/L). */
    static double defaultPrice(Context c) { return get(c).getFloat("prix_def", 1.85f); }
    /** Arrêt (contact mis) au-delà duquel le trajet est coupé en deux (minutes). */
    static double pauseMinutes(Context c) { return get(c).getFloat("pause_min", 3f); }
    static double vidangeInterval(Context c) { return get(c).getFloat("vidange_km", 15000f); }

    /** Relevé de compteur saisi à la main (km) et sa date, -1 si jamais saisi. */
    static double odoRef(Context c) { return get(c).getFloat("odo_ref", -1f); }
    static long odoRefDate(Context c) { return get(c).getLong("odo_ref_date", 0L); }
}
