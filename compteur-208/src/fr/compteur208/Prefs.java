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
    static String carAddress(Context c) { return get(c).getString("car_addr", null); }
    static String carName(Context c) { return get(c).getString("car_name", null); }

    /** Consommation utilisée tant qu'il n'y a pas assez de pleins enregistrés (L/100 km). */
    static double defaultConso(Context c) { return get(c).getFloat("conso_def", 5.5f); }
    /** Prix du litre utilisé tant qu'aucun plein n'est enregistré (€/L). */
    static double defaultPrice(Context c) { return get(c).getFloat("prix_def", 1.85f); }
    static double vidangeInterval(Context c) { return get(c).getFloat("vidange_km", 15000f); }

    /** Relevé de compteur saisi à la main (km) et sa date, -1 si jamais saisi. */
    static double odoRef(Context c) { return get(c).getFloat("odo_ref", -1f); }
    static long odoRefDate(Context c) { return get(c).getLong("odo_ref_date", 0L); }
}
