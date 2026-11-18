package fr.compteur208;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

/** Notifications : trajet en cours, résumé de trajet, démarrage à confirmer. */
final class Notifs {
    private Notifs() {}

    static final String CH_TRIP = "trajet", CH_INFO = "infos";
    static final int ID_TRIP = 1, ID_INFO = 2;

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel t = new NotificationChannel(CH_TRIP, "Trajet en cours", NotificationManager.IMPORTANCE_LOW);
        t.setShowBadge(false);
        nm.createNotificationChannel(t);
        nm.createNotificationChannel(new NotificationChannel(CH_INFO, "Résumés de trajets", NotificationManager.IMPORTANCE_DEFAULT));
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static Notification trip(Context c, String title, String text) {
        Intent stop = new Intent(c, TripService.class).setAction(TripService.A_STOP);
        PendingIntent ps = PendingIntent.getService(c, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(c, CH_TRIP)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setColor(0xFF4F8CFF)
                .setContentIntent(openApp(c))
                .addAction(new Notification.Action.Builder(null, "Terminer le trajet", ps).build())
                .build();
    }

    static void info(Context c, String title, String text) {
        channels(c);
        Notification n = new Notification.Builder(c, CH_INFO)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setColor(0xFF4F8CFF)
                .setAutoCancel(true)
                .setContentIntent(openApp(c))
                .build();
        try { c.getSystemService(NotificationManager.class).notify(ID_INFO, n); } catch (Exception ignored) {}
    }

    /** Android a refusé le démarrage en arrière-plan : on propose de démarrer d'un simple appui. */
    static void cannotStart(Context c) {
        channels(c);
        // Ouvre l'appli qui démarre le trajet (au premier plan, Android l'autorise toujours).
        Intent start = new Intent(c, MainActivity.class).putExtra(MainActivity.EXTRA_START, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent ps = PendingIntent.getActivity(c, 2, start, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, CH_INFO)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("Voiture détectée 🚗")
                .setContentText("Touche ici pour enregistrer le trajet. Pour que ce soit 100 % automatique, vérifie les autorisations dans Réglages.")
                .setStyle(new Notification.BigTextStyle().bigText("Touche ici pour enregistrer le trajet. Pour que ce soit 100 % automatique, vérifie les autorisations dans Réglages."))
                .setColor(0xFF4F8CFF)
                .setAutoCancel(true)
                .setContentIntent(ps)
                .build();
        try { c.getSystemService(NotificationManager.class).notify(ID_INFO, n); } catch (Exception ignored) {}
    }
}
