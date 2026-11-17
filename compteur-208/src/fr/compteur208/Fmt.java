package fr.compteur208;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Mise en forme des nombres et dates, à la française. */
final class Fmt {
    private Fmt() {}
    static final Locale FR = Locale.FRANCE;

    static String km(double km) {
        if (Math.abs(km) >= 1000) return String.format(FR, "%,.0f km", km);
        return String.format(FR, "%.1f km", km);
    }

    static String kmInt(double km) { return String.format(FR, "%,.0f km", km); }

    static String eur(double v) { return String.format(FR, "%,.2f €", v); }

    static String num(double v, int dec) { return String.format(FR, "%,." + dec + "f", v); }

    static String dur(long ms) {
        long m = Math.round(ms / 60000.0);
        if (m < 60) return m + " min";
        return (m / 60) + " h " + String.format(FR, "%02d", m % 60);
    }

    static String date(long ts) { return cap(new SimpleDateFormat("EEEE d MMMM yyyy", FR).format(new Date(ts))); }
    static String dateShort(long ts) { return new SimpleDateFormat("dd/MM/yyyy", FR).format(new Date(ts)); }
    static String time(long ts) { return new SimpleDateFormat("HH:mm", FR).format(new Date(ts)); }
    static String month(long ts) { return cap(new SimpleDateFormat("MMMM yyyy", FR).format(new Date(ts))); }
    static String monthShort(long ts) { return new SimpleDateFormat("MMM", FR).format(new Date(ts)).replace(".", ""); }

    static String cap(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Lit un nombre saisi par l'utilisateur ("45 230", "1,859"...). Renvoie NaN si vide/invalide. */
    static double parse(String s) {
        if (s == null) return Double.NaN;
        s = s.trim().replace(',', '.').replace(" ", "").replace(" ", "").replace(" ", "").replace("€", "");
        if (s.isEmpty()) return Double.NaN;
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return Double.NaN; }
    }
}
