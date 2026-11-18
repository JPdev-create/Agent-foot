package fr.compteur208;

import android.content.Context;
import android.location.Location;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Statistiques avancées : éco-conduite, semaines, heures, trajets favoris, bilans mensuels. */
final class Stats {
    private Stats() {}

    // =====================================================================
    // Éco-conduite
    // =====================================================================

    /** Score 0–100 d'un trajet, -1 si non mesuré (anciens trajets) ou trop court. */
    static int score(Db.Trip t) {
        double km = t.km();
        if (t.acc < 0 || t.brk < 0 || km < 1) return -1;
        double events = (t.acc + 1.3 * t.brk) * 10.0 / km;          // évènements pour 10 km
        long mov = t.moving > 0 ? t.moving : t.duration();
        double fastPct = mov > 0 ? Math.min(1, t.fast / (double) mov) : 0;
        double s = 100 - events * 8 - fastPct * 150;
        return (int) Math.round(Math.max(0, Math.min(100, s)));
    }

    static final class Eco {
        int score = -1, trips, acc, brk;
        double km;
        long fast, moving;
    }

    /** Score moyen (pondéré par les km) des trajets mesurés depuis `from`. */
    static Eco eco(List<Db.Trip> trips, long from) {
        Eco e = new Eco();
        double sum = 0;
        for (Db.Trip t : trips) {
            if (t.start < from) continue;
            int s = score(t);
            if (s < 0) continue;
            e.trips++; e.km += t.km(); e.acc += t.acc; e.brk += t.brk; e.fast += t.fast;
            e.moving += t.moving > 0 ? t.moving : t.duration();
            sum += s * t.km();
        }
        if (e.km > 0) e.score = (int) Math.round(sum / e.km);
        return e;
    }

    static String ecoLabel(int s) {
        if (s >= 85) return "Excellent";
        if (s >= 70) return "Bonne conduite";
        if (s >= 50) return "Peut mieux faire";
        return "À améliorer";
    }

    /** Conseil principal selon ce qui pénalise le plus. */
    static String ecoTip(Eco e) {
        if (e.trips == 0) return "Le score se calcule sur tes prochains trajets : accélérations, freinages et vitesse.";
        double accP = e.acc * 10.0 / Math.max(1, e.km) * 8;
        double brkP = e.brk * 13.0 / Math.max(1, e.km) * 8;
        double fastP = e.moving > 0 ? e.fast / (double) e.moving * 150 : 0;
        if (accP < 3 && brkP < 3 && fastP < 3) return "Conduite très souple : continue comme ça, c'est aussi la plus économe.";
        if (fastP >= accP && fastP >= brkP)
            return "Sur autoroute, rouler à 120 au lieu de 130 km/h fait économiser environ 1 L/100 km.";
        if (brkP >= accP)
            return "Anticipe davantage : lève le pied plus tôt plutôt que de freiner fort.";
        return "Accélère plus progressivement : les démarrages vifs font grimper la consommation.";
    }

    // =====================================================================
    // Semaines et heures
    // =====================================================================

    static long weekStart(long ts, int addWeeks) {
        Calendar c = Calendar.getInstance(Locale.FRANCE);
        c.setFirstDayOfWeek(Calendar.MONDAY);
        c.setTimeInMillis(ts);
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        c.add(Calendar.WEEK_OF_YEAR, addWeeks);
        return c.getTimeInMillis();
    }

    /** Kilomètres par heure de départ (0–23). */
    static double[] byHour(List<Db.Trip> trips) {
        double[] h = new double[24];
        Calendar c = Calendar.getInstance();
        for (Db.Trip t : trips) {
            c.setTimeInMillis(t.start);
            h[c.get(Calendar.HOUR_OF_DAY)] += t.km();
        }
        return h;
    }

    // =====================================================================
    // Trajets favoris (regroupement des points de départ / d'arrivée)
    // =====================================================================

    static final double PLACE_RADIUS_M = 350;

    static final class Place {
        double lat, lon;
        int idx, count;
    }

    static final class Route {
        Place a, b;
        int count;
        double km;
        long dur;
        long last;
    }

    static double dist(double lat1, double lon1, double lat2, double lon2) {
        float[] r = new float[1];
        Location.distanceBetween(lat1, lon1, lat2, lon2, r);
        return r[0];
    }

    private static Place assign(List<Place> places, double[] p) {
        for (Place pl : places) {
            if (dist(pl.lat, pl.lon, p[0], p[1]) < PLACE_RADIUS_M) { pl.count++; return pl; }
        }
        Place n = new Place();
        n.lat = p[0]; n.lon = p[1]; n.idx = places.size(); n.count = 1;
        places.add(n);
        return n;
    }

    /** Itinéraires faits au moins 2 fois, du plus fréquent au moins fréquent. */
    static List<Route> routes(List<Db.Trip> tripsWithPts) {
        List<Place> places = new ArrayList<>();
        Map<String, Route> map = new LinkedHashMap<>();
        for (Db.Trip t : tripsWithPts) {
            List<double[]> p = TripService.decode(t.pts);
            if (p.size() < 2) continue;
            Place a = assign(places, p.get(0)), b = assign(places, p.get(p.size() - 1));
            if (a == b) continue;
            String k = a.idx + ">" + b.idx;
            Route r = map.get(k);
            if (r == null) { r = new Route(); r.a = a; r.b = b; map.put(k, r); }
            r.count++; r.km += t.km(); r.dur += t.duration(); r.last = Math.max(r.last, t.start);
        }
        List<Route> out = new ArrayList<>();
        for (Route r : map.values()) if (r.count >= 2) out.add(r);
        Collections.sort(out, new Comparator<Route>() {
            public int compare(Route x, Route y) { return y.count != x.count ? y.count - x.count : Long.compare(y.last, x.last); }
        });
        return out;
    }

    // ---- Noms des lieux ("Maison", "Travail"…) donnés par l'utilisateur ----

    static List<String[]> namedPlaces(Context c) {
        List<String[]> out = new ArrayList<>();
        String s = Prefs.get(c).getString("lieux", "");
        for (String line : s.split("\n")) {
            String[] f = line.split(";", 3);
            if (f.length == 3) out.add(f);
        }
        return out;
    }

    static void nameplace(Context c, double lat, double lon, String name) {
        StringBuilder sb = new StringBuilder();
        for (String[] f : namedPlaces(c)) {
            try {
                if (dist(Double.parseDouble(f[0]), Double.parseDouble(f[1]), lat, lon) < PLACE_RADIUS_M) continue;
            } catch (NumberFormatException e) { continue; }
            sb.append(f[0]).append(';').append(f[1]).append(';').append(f[2]).append('\n');
        }
        name = name.replace("\n", " ").replace(";", ",").trim();
        if (!name.isEmpty()) sb.append(String.format(Locale.US, "%.5f;%.5f;", lat, lon)).append(name).append('\n');
        Prefs.get(c).edit().putString("lieux", sb.toString()).apply();
    }

    /** Nom du lieu : nom donné, sinon adresse connue, sinon null. */
    static String placeName(Context c, Place p) {
        for (String[] f : namedPlaces(c)) {
            try {
                if (dist(Double.parseDouble(f[0]), Double.parseDouble(f[1]), p.lat, p.lon) < PLACE_RADIUS_M) return f[2];
            } catch (NumberFormatException ignored) {}
        }
        String a = Parking.cachedAddress(c, p.lat, p.lon);
        return a == null ? null : shortAddress(a);
    }

    static String shortAddress(String a) {
        return a.replaceAll("\\b\\d{5}\\s*", "").replaceAll("\\s+,", ",").trim();
    }

    // =====================================================================
    // Bilans mensuels
    // =====================================================================

    static final class Month {
        long start;
        double km, fuel, maint;
        int trips;
        long time;
    }

    static Month month(Context c, long monthStart) {
        Db db = Db.get(c);
        long end = Calc.monthStart(monthStart, 1);
        Month m = new Month();
        m.start = monthStart;
        for (Db.Trip t : db.trips(monthStart, end, false)) { m.km += t.km(); m.trips++; m.time += t.duration(); }
        for (Db.Fuel f : db.fuels()) if (f.date >= monthStart && f.date < end) m.fuel += f.total;
        for (Db.Maint x : db.maints()) if (x.date >= monthStart && x.date < end) m.maint += x.cost;
        return m;
    }
}
