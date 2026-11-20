package fr.compteur208;

import android.Manifest;
import android.bluetooth.BluetoothDevice;
import android.content.pm.PackageManager;
import android.os.Build;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Reçoit les connexions / déconnexions Bluetooth. Si c'est la voiture choisie dans les réglages,
 * démarre ou termine l'enregistrement du trajet.
 */
public class BtReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
        if (d == null) return;
        if (!Prefs.isCar(c, d.getAddress())) {
            // Diagnostic : on note aussi les autres appareils (pour repérer le boîtier Android Auto).
            String n = null;
            try { n = d.getName(); } catch (SecurityException ignored) {}
            EventLog.add(c, "(autre appareil) Bluetooth " + (n != null ? n : d.getAddress())
                    + (BluetoothDevice.ACTION_ACL_CONNECTED.equals(i.getAction()) ? " connecté" : " déconnecté")
                    + (TripService.live != null ? " pendant un trajet" : ""));
            return;
        }

        String a = i.getAction();
        // Mémorise l'état du Bluetooth voiture (sert à savoir si on est bien dans la voiture).
        boolean on = BluetoothDevice.ACTION_ACL_CONNECTED.equals(a);
        Prefs.setBtState(c, d.getAddress(), on);
        String name = null;
        try { name = d.getName(); } catch (SecurityException ignored) {}
        EventLog.add(c, "Bluetooth " + (name != null ? name : d.getAddress()) + (on ? " connecté" : " déconnecté"));
        if (!Prefs.autoEnabled(c)) return;
        if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(a)) {
            // Sans « Toujours autoriser », Android refuse le GPS en arrière-plan :
            // on propose plutôt de démarrer d'un appui sur la notification.
            carConnected(c);
        } else if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(a)) {
            if (TripService.instance == null || Prefs.btConnected(c)) return;   // un autre appareil voiture reste connecté
            try {
                c.startService(new Intent(c, TripService.class).setAction(TripService.A_BT_OFF));
            } catch (Exception ignored) {}
        }
    }

    /** La voiture vient d'être détectée (Bluetooth ou Wi-Fi) : on démarre le trajet. */
    static void carConnected(Context c) {
        if (TripService.instance == null && !canTrackInBackground(c)) {
            EventLog.add(c, "Démarrage impossible : localisation « Toujours autoriser » manquante");
            Notifs.cannotStart(c);
            return;
        }
        try {
            if (TripService.instance != null)
                c.startService(new Intent(c, TripService.class).setAction(TripService.A_BT_ON));
            else
                c.startForegroundService(new Intent(c, TripService.class).setAction(TripService.A_START).putExtra("src", "auto"));
        } catch (Exception e) {
            EventLog.add(c, "Démarrage refusé par Android (" + e.getClass().getSimpleName() + ")");
            Notifs.cannotStart(c);
        }
    }

    static boolean canTrackInBackground(Context c) {
        if (c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return false;
        return Build.VERSION.SDK_INT < 29
                || c.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
}
