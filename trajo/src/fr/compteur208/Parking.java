package fr.compteur208;

import android.content.Context;
import android.content.SharedPreferences;
import android.location.Address;
import android.location.Geocoder;

import java.util.List;
import java.util.Locale;

/**
 * Où est garée la voiture : le dernier point GPS du dernier trajet,
 * ou la position enregistrée à la main (« Garée ici ») si elle est plus récente.
 */
final class Parking {
    private Parking() {}

    /** {lat, lon, date} ou null si aucune position connue. */
    static double[] get(Context c) {
        double[] best = null;
        Db.Trip t = Db.get(c).lastTripWithTrace();
        if (t != null) {
            List<double[]> p = TripService.decode(t.pts);
            if (!p.isEmpty()) {
                double[] last = p.get(p.size() - 1);
                best = new double[]{last[0], last[1], t.end};
            }
        }
        SharedPreferences sp = Prefs.get(c);
        long ts = sp.getLong("park_ts", 0);
        if (ts > 0 && (best == null || ts > best[2]))
            best = new double[]{sp.getFloat("park_lat", 0), sp.getFloat("park_lon", 0), ts};
        return best;
    }

    static void setHere(Context c, double lat, double lon) {
        Prefs.get(c).edit().putFloat("park_lat", (float) lat).putFloat("park_lon", (float) lon)
                .putLong("park_ts", System.currentTimeMillis()).apply();
    }

    static String key(double lat, double lon) { return String.format(Locale.US, "adr_%.4f_%.4f", lat, lon); }

    /** Adresse déjà connue (cache), sinon null. */
    static String cachedAddress(Context c, double lat, double lon) {
        return Prefs.get(c).getString(key(lat, lon), null);
    }

    /** Cherche l'adresse (réseau) — à appeler hors du fil principal. */
    @SuppressWarnings("deprecation")
    static String lookupAddress(Context c, double lat, double lon) {
        try {
            if (!Geocoder.isPresent()) return null;
            List<Address> l = new Geocoder(c, Locale.FRANCE).getFromLocation(lat, lon, 1);
            if (l == null || l.isEmpty()) return null;
            Address a = l.get(0);
            String s = a.getMaxAddressLineIndex() >= 0 ? a.getAddressLine(0) : null;
            if (s == null) return null;
            s = s.replace(", France", "");
            Prefs.get(c).edit().putString(key(lat, lon), s).apply();
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    /** « 35 min », « 2 h 15 », « 3 jours ». */
    static String since(long ts) {
        long ms = Math.max(0, System.currentTimeMillis() - ts);
        long days = ms / 86_400_000L;
        if (days >= 2) return days + " jours";
        if (days == 1) return "1 jour";
        return Fmt.dur(ms);
    }
}
