package fr.compteur208;

import android.content.Context;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Calculs : consommation, prix, compteur estimé, coûts. */
final class Calc {
    private Calc() {}

    /**
     * Consommation réelle moyenne (L/100 km) par la méthode « plein à plein » :
     * entre deux pleins complets, litres remis / km parcourus au compteur.
     * Renvoie -1 si les données ne suffisent pas.
     */
    static double realConso(List<Db.Fuel> fuelsDesc) {
        double totL = 0, totKm = 0;
        for (double[] seg : segments(fuelsDesc).values()) { totL += seg[0]; totKm += seg[1]; }
        return totKm >= 50 ? totL / totKm * 100.0 : -1;
    }

    /** Pour chaque plein complet : {litres depuis le plein complet précédent, km parcourus}. */
    static Map<Long, double[]> segments(List<Db.Fuel> fuelsDesc) {
        List<Db.Fuel> asc = new ArrayList<>(fuelsDesc);
        Collections.reverse(asc);
        Map<Long, double[]> out = new HashMap<>();
        Db.Fuel prevFull = null;
        double acc = 0;
        for (Db.Fuel f : asc) {
            if (prevFull != null) acc += f.liters;
            if (f.full && f.odo > 0) {
                if (prevFull != null && f.odo > prevFull.odo) out.put(f.id, new double[]{acc, f.odo - prevFull.odo});
                prevFull = f;
                acc = 0;
            } else if (f.full) {
                // plein complet sans kilométrage : on ne peut pas mesurer, on repart de zéro
                prevFull = null;
                acc = 0;
            }
        }
        return out;
    }

    static double conso(Context c, List<Db.Fuel> fuels) {
        double r = realConso(fuels);
        return r > 0 ? r : Prefs.defaultConso(c);
    }

    static double pricePerL(Context c, List<Db.Fuel> fuels) {
        for (Db.Fuel f : fuels) if (f.liters > 0 && f.total > 0) return f.total / f.liters;
        return Prefs.defaultPrice(c);
    }

    /** Coût carburant par km (€/km). */
    static double costPerKm(Context c, List<Db.Fuel> fuels) {
        return conso(c, fuels) / 100.0 * pricePerL(c, fuels);
    }

    /**
     * Kilométrage estimé du compteur : dernier relevé connu (réglages, plein ou entretien)
     * + kilomètres des trajets GPS faits depuis. Renvoie -1 si aucun relevé.
     */
    static double estimatedOdo(Context c, List<Db.Fuel> fuels, List<Db.Maint> maints) {
        double refOdo = Prefs.odoRef(c);
        long refDate = Prefs.odoRefDate(c);
        for (Db.Fuel f : fuels) if (f.odo > 0 && (refOdo < 0 || f.date > refDate)) { refOdo = f.odo; refDate = f.date; break; }
        for (Db.Maint m : maints) if (m.odo > 0 && (refOdo < 0 || m.date > refDate)) { refOdo = m.odo; refDate = m.date; break; }
        if (refOdo < 0) return -1;
        return refOdo + Db.get(c).kmBetween(refDate, Long.MAX_VALUE);
    }

    static long monthStart(long ts, int addMonths) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(ts);
        cal.set(Calendar.DAY_OF_MONTH, 1);
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        cal.add(Calendar.MONTH, addMonths);
        return cal.getTimeInMillis();
    }

    static long yearStart(long ts) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(monthStart(ts, 0));
        cal.set(Calendar.MONTH, Calendar.JANUARY);
        return cal.getTimeInMillis();
    }

    static long dayStart(long ts) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(ts);
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }
}
