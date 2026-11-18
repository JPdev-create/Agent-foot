package fr.compteur208;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.util.Calendar;

/** Bilan du mois précédent, envoyé en notification le 1er du mois vers 10 h. */
public class Report extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        sendIfDue(c);
        schedule(c);
    }

    static String monthKey(long ts) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(ts);
        return cal.get(Calendar.YEAR) + "-" + cal.get(Calendar.MONTH);
    }

    /** Programme le prochain bilan (1er du mois suivant, 10 h). */
    static void schedule(Context c) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(Calc.monthStart(System.currentTimeMillis(), 1));
        cal.set(Calendar.HOUR_OF_DAY, 10);
        PendingIntent pi = PendingIntent.getBroadcast(c, 20, new Intent(c, Report.class),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        try { if (am != null) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi); } catch (Exception ignored) {}
    }

    /** Envoie le bilan du mois dernier s'il ne l'a pas déjà été (rattrapage pendant la 1re semaine). */
    static void sendIfDue(Context c) {
        long now = System.currentTimeMillis();
        long thisMonth = Calc.monthStart(now, 0);
        Calendar cal = Calendar.getInstance();
        if (now - thisMonth > 7L * 86_400_000L) return;
        cal.setTimeInMillis(now);
        if (cal.get(Calendar.DAY_OF_MONTH) == 1 && cal.get(Calendar.HOUR_OF_DAY) < 9) return;
        long prev = Calc.monthStart(now, -1);
        String key = monthKey(prev);
        if (key.equals(Prefs.get(c).getString("bilan_envoye", ""))) return;
        Stats.Month m = Stats.month(c, prev), mm = Stats.month(c, Calc.monthStart(now, -2));
        Prefs.get(c).edit().putString("bilan_envoye", key).apply();
        if (m.trips == 0 && m.fuel == 0) return;
        String trend = "";
        if (mm.km > 1) {
            double pct = (m.km - mm.km) / mm.km * 100;
            trend = " · " + (pct >= 0 ? "▲ " : "▼ ") + Math.round(Math.abs(pct)) + " % vs " + Fmt.monthShort(mm.start) + ".";
        }
        String title = "Bilan de " + Fmt.month(prev).toLowerCase(Fmt.FR) + " 📊";
        String text = Fmt.kmInt(m.km) + " · " + m.trips + (m.trips > 1 ? " trajets" : " trajet")
                + " · " + Fmt.eur(m.fuel) + " de carburant" + trend;
        Notifs.channels(c);
        Intent open = new Intent(c, MainActivity.class).putExtra(MainActivity.EXTRA_TAB, 2)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 21, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, Notifs.CH_INFO)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setColor(0xFF3B82F6)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
        try { c.getSystemService(NotificationManager.class).notify(3, n); } catch (Exception ignored) {}
    }
}
