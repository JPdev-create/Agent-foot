package fr.compteur208;

import android.content.Context;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Petit journal de détection (dernières lignes), pour comprendre pourquoi un trajet a démarré ou non. */
final class EventLog {
    private EventLog() {}
    static final int MAX = 120;

    static synchronized void add(Context c, String msg) {
        String line = new SimpleDateFormat("dd/MM HH:mm:ss", Locale.FRANCE).format(new Date()) + "  " + msg;
        String old = c.getSharedPreferences("journal", Context.MODE_PRIVATE).getString("l", "");
        String[] parts = old.isEmpty() ? new String[0] : old.split("\n");
        StringBuilder sb = new StringBuilder(line);
        for (int i = 0; i < Math.min(parts.length, MAX - 1); i++) sb.append('\n').append(parts[i]);
        c.getSharedPreferences("journal", Context.MODE_PRIVATE).edit().putString("l", sb.toString()).apply();
    }

    static String get(Context c) {
        return c.getSharedPreferences("journal", Context.MODE_PRIVATE).getString("l", "");
    }

    static void clear(Context c) {
        c.getSharedPreferences("journal", Context.MODE_PRIVATE).edit().clear().apply();
    }
}
