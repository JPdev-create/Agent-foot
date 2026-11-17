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
        if (!Prefs.autoEnabled(c)) return;
        String car = Prefs.carAddress(c);
        if (car == null) return;
        BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
        if (d == null || !car.equalsIgnoreCase(d.getAddress())) return;

        String a = i.getAction();
        if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(a)) {
            // Sans « Toujours autoriser », Android refuse le GPS en arrière-plan :
            // on propose plutôt de démarrer d'un appui sur la notification.
            carConnected(c);
        } else if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(a)) {
            if (TripService.live == null) return;
            try {
                c.startService(new Intent(c, TripService.class).setAction(TripService.A_BT_OFF));
            } catch (Exception ignored) {}
        }
    }

    /** La voiture vient d'être détectée (Bluetooth ou Wi-Fi) : on démarre le trajet. */
    static void carConnected(Context c) {
        if (TripService.live == null && !canTrackInBackground(c)) { Notifs.cannotStart(c); return; }
        try {
            if (TripService.live != null)
                c.startService(new Intent(c, TripService.class).setAction(TripService.A_BT_ON));
            else
                c.startForegroundService(new Intent(c, TripService.class).setAction(TripService.A_START).putExtra("src", "auto"));
        } catch (Exception e) {
            Notifs.cannotStart(c);
        }
    }

    static boolean canTrackInBackground(Context c) {
        if (c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return false;
        return Build.VERSION.SDK_INT < 29
                || c.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
}
