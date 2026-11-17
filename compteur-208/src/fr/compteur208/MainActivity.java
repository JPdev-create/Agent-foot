package fr.compteur208;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MainActivity extends Activity {
    // Couleurs (thème sombre)
    static final int BG = 0xFF0E1116, CARD = 0xFF1A1F27, CARD2 = 0xFF242B36, ACC = 0xFF3D8BFF,
            TXT = 0xFFF1F4F8, SUB = 0xFF98A2B3, GOOD = 0xFF30D158, BAD = 0xFFFF5A5F, WARN = 0xFFFFB340;

    static final String[] TABS = {"🏠\nAccueil", "🛣️\nTrajets", "⛽\nPleins", "🔧\nEntretien", "⚙️\nRéglages"};
    static final String[] MAINT_TYPES = {"Vidange", "Révision", "Pneus", "Freins", "Contrôle technique",
            "Batterie", "Assurance", "Péage / parking", "Lavage", "Réparation", "Autre"};
    static final int RQ_LOC = 1, RQ_BG = 2, RQ_BT = 3, RQ_NOTIF = 4, RQ_LOC_START = 5, RQ_BT_PICK = 6;

    LinearLayout content, nav;
    ScrollView scroll;
    int tab = 0;
    long detailId = -1;
    final Handler handler = new Handler(Looper.getMainLooper());
    TextView liveBig, liveSub;
    boolean shownLive;

    final Runnable refresher = new Runnable() {
        public void run() { refreshLive(); handler.postDelayed(this, 1000); }
    };

    // =====================================================================
    // Cycle de vie
    // =====================================================================

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.setStatusBarColor(BG);
        w.setNavigationBarColor(CARD);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);

        scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(16), dp(16), dp(16), dp(28));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));

        nav = new LinearLayout(this);
        nav.setBackgroundColor(CARD);
        nav.setPadding(0, dp(4), 0, dp(4));
        for (int i = 0; i < TABS.length; i++) {
            final int k = i;
            TextView t = tv(TABS[i], 11, SUB, false);
            t.setGravity(Gravity.CENTER);
            t.setPadding(0, dp(6), 0, dp(6));
            t.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { show(k); } });
            nav.addView(t, new LinearLayout.LayoutParams(0, -2, 1f));
        }
        root.addView(nav, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);

        Notifs.channels(this);
        if (b != null) { tab = b.getInt("tab", 0); detailId = b.getLong("detail", -1); }
        handleStartIntent(getIntent());
    }

    static final String EXTRA_START = "demarrer_trajet";

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        handleStartIntent(i);
    }

    /** Appui sur la notification « Voiture détectée » : on démarre le trajet. */
    void handleStartIntent(Intent i) {
        if (i == null || !i.getBooleanExtra(EXTRA_START, false)) return;
        i.removeExtra(EXTRA_START);
        if (TripService.live == null && granted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            startForegroundService(new Intent(this, TripService.class).setAction(TripService.A_START).putExtra("src", "auto"));
            tab = 0;
            detailId = -1;
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putInt("tab", tab);
        out.putLong("detail", detailId);
    }

    @Override protected void onResume() {
        super.onResume();
        WifiWatch.register(this);
        render();
        handler.post(refresher);
    }

    @Override protected void onPause() {
        super.onPause();
        handler.removeCallbacks(refresher);
    }

    @Override public void onBackPressed() {
        if (tab == 1 && detailId >= 0) { detailId = -1; render(); }
        else if (tab != 0) show(0);
        else super.onBackPressed();
    }

    @Override public void onRequestPermissionsResult(int rq, String[] perms, int[] res) {
        super.onRequestPermissionsResult(rq, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (rq == RQ_LOC_START && ok) startManual();
        else if (rq == RQ_BT_PICK && ok) pickCar();
        render();
    }

    void show(int t) {
        tab = t;
        detailId = -1;
        render();
        scroll.scrollTo(0, 0);
    }

    void render() {
        for (int i = 0; i < nav.getChildCount(); i++)
            ((TextView) nav.getChildAt(i)).setTextColor(i == tab ? ACC : SUB);
        content.removeAllViews();
        liveBig = null; liveSub = null;
        switch (tab) {
            case 0: renderHome(); break;
            case 1: if (detailId >= 0) renderTripDetail(detailId); else renderTrips(); break;
            case 2: renderFuel(); break;
            case 3: renderMaint(); break;
            default: renderSettings(); break;
        }
    }

    void refreshLive() {
        TripService s = TripService.live;
        if (tab == 0 && (s != null) != shownLive) { render(); return; }
        if (s != null && liveBig != null) {
            liveBig.setText(Fmt.km(s.dist / 1000));
            liveSub.setText(Fmt.dur(System.currentTimeMillis() - s.startTs) + "  ·  " + Math.round(s.curSpeed * 3.6) + " km/h"
                    + (s.btPendingStop ? "\nVoiture coupée : fin du trajet dans un instant" : ""));
        }
    }

    // =====================================================================
    // Accueil
    // =====================================================================

    void renderHome() {
        Db db = Db.get(this);
        List<Db.Fuel> fuels = db.fuels();
        List<Db.Maint> maints = db.maints();
        long now = System.currentTimeMillis();

        header("Compteur 208", Fmt.date(now));

        List<String> issues = setupIssues();
        if (!issues.isEmpty()) {
            LinearLayout c = card();
            c.addView(tv("⚠️  Configuration à terminer", 16, WARN, true));
            StringBuilder sb = new StringBuilder();
            for (String s : issues) sb.append("•  ").append(s).append('\n');
            TextView t = tv(sb.toString().trim(), 14, TXT, false);
            t.setPadding(0, dp(8), 0, dp(10));
            c.addView(t);
            c.addView(button("Ouvrir les réglages", true, new View.OnClickListener() { public void onClick(View v) { show(4); } }));
        }

        // --- Trajet en cours ---
        TripService s = TripService.live;
        shownLive = s != null;
        LinearLayout lc = card();
        if (s != null) {
            lc.addView(tv("🚗  Trajet en cours", 15, GOOD, true));
            liveBig = tv("", 40, TXT, true);
            liveSub = tv("", 14, SUB, false);
            lc.addView(liveBig);
            lc.addView(liveSub);
            space(lc, 12);
            lc.addView(button("Terminer le trajet", false, new View.OnClickListener() { public void onClick(View v) {
                startService(new Intent(MainActivity.this, TripService.class).setAction(TripService.A_STOP));
                handler.postDelayed(new Runnable() { public void run() { render(); } }, 400);
            } }));
            refreshLive();
        } else {
            lc.addView(tv("🅿️  À l'arrêt", 15, SUB, true));
            String car = Prefs.carName(this), ssid = Prefs.carSsid(this);
            String target = ssid != null && car != null ? "« " + ssid + " » ou « " + car + " »"
                    : "« " + (ssid != null ? ssid : car) + " »";
            String msg = !Prefs.carConfigured(this)
                    ? "Choisis ta voiture (Bluetooth ou Wi-Fi) dans les réglages : les trajets démarreront tout seuls."
                    : (Prefs.autoEnabled(this)
                        ? "Le prochain trajet démarrera tout seul dès que ton téléphone se connectera à " + target + "."
                        : "Détection automatique désactivée.");
            TextView t = tv(msg, 14, TXT, false);
            t.setPadding(0, dp(6), 0, dp(12));
            lc.addView(t);
            lc.addView(button("▶  Démarrer un trajet maintenant", false, new View.OnClickListener() { public void onClick(View v) { startManual(); } }));
        }

        // --- Compteur estimé ---
        double odo = Calc.estimatedOdo(this, fuels, maints);
        LinearLayout oc = card();
        oc.addView(tv("Compteur estimé", 13, SUB, false));
        if (odo >= 0) {
            oc.addView(tv(Fmt.kmInt(odo), 32, TXT, true));
            oc.addView(tv("Dernier relevé + kilomètres enregistrés par GPS", 12, SUB, false));
        } else {
            oc.addView(tv("— km", 32, TXT, true));
            TextView t = tv("Indique le kilométrage de ta 208 dans Réglages (ou lors d'un plein).", 13, SUB, false);
            oc.addView(t);
        }

        // --- Ce mois-ci ---
        long ms = Calc.monthStart(now, 0);
        List<Db.Trip> monthTrips = db.trips(ms, Long.MAX_VALUE, false);
        double mKm = 0; long mTime = 0;
        for (Db.Trip t : monthTrips) { mKm += t.km(); mTime += t.duration(); }
        double mFuel = 0;
        for (Db.Fuel f : fuels) if (f.date >= ms) mFuel += f.total;
        double cpk = Calc.costPerKm(this, fuels);

        section(Fmt.month(now));
        grid(new String[][]{
                {"Kilomètres", Fmt.km(mKm)},
                {"Trajets", "" + monthTrips.size()},
                {"Temps au volant", Fmt.dur(mTime)},
                {"Coût carburant estimé", Fmt.eur(mKm * cpk)},
        });
        LinearLayout pc = card();
        pc.addView(row("Dépensé en pleins ce mois", Fmt.eur(mFuel)));

        // --- Consommation & coûts ---
        section("Consommation & coûts");
        double real = Calc.realConso(fuels);
        LinearLayout cc = card();
        cc.addView(row("Consommation moyenne", real > 0 ? Fmt.num(real, 1) + " L/100" : Fmt.num(Prefs.defaultConso(this), 1) + " L/100 (par défaut)"));
        cc.addView(row("Prix du litre (dernier plein)", Fmt.num(Calc.pricePerL(this, fuels), 3) + " €"));
        cc.addView(row("Coût carburant au km", Fmt.num(cpk * 100, 1) + " cts"));
        cc.addView(row("Coût pour 100 km", Fmt.eur(cpk * 100)));
        if (real <= 0) {
            TextView t = tv("La consommation réelle se calcule après 2 pleins complets avec le kilométrage.", 12, SUB, false);
            t.setPadding(0, dp(8), 0, 0);
            cc.addView(t);
        }

        // --- Graphique 6 mois ---
        section("Kilomètres par mois");
        LinearLayout gc = card();
        double[] vals = new double[6];
        String[] labs = new String[6];
        for (int i = 0; i < 6; i++) {
            long a = Calc.monthStart(now, i - 5), b = Calc.monthStart(now, i - 4);
            vals[i] = db.kmBetween(a, b);
            labs[i] = Fmt.monthShort(a);
        }
        gc.addView(new Charts.Bars(this, vals, labs, ACC, TXT, SUB), new LinearLayout.LayoutParams(-1, dp(170)));

        // --- Année ---
        long ys = Calc.yearStart(now);
        double yKm = db.kmBetween(ys, Long.MAX_VALUE), yFuel = 0, yMaint = 0;
        for (Db.Fuel f : fuels) if (f.date >= ys) yFuel += f.total;
        for (Db.Maint m : maints) if (m.date >= ys) yMaint += m.cost;
        section("Depuis le 1er janvier");
        LinearLayout yc = card();
        yc.addView(row("Kilomètres enregistrés", Fmt.km(yKm)));
        yc.addView(row("Carburant", Fmt.eur(yFuel)));
        yc.addView(row("Entretien & frais", Fmt.eur(yMaint)));
        yc.addView(row("Total dépensé", Fmt.eur(yFuel + yMaint)));

        // --- Vidange ---
        if (odo >= 0) {
            for (Db.Maint m : maints) {
                if ("Vidange".equals(m.type) && m.odo > 0) {
                    double left = m.odo + Prefs.vidangeInterval(this) - odo;
                    LinearLayout vc = card();
                    vc.addView(tv("🛢️  Prochaine vidange", 15, left < 1000 ? WARN : TXT, true));
                    vc.addView(tv(left > 0 ? "Dans environ " + Fmt.kmInt(left) : "Dépassée de " + Fmt.kmInt(-left) + " !", 14, left < 1000 ? WARN : SUB, false));
                    break;
                }
            }
        }
    }

    List<String> setupIssues() {
        List<String> out = new ArrayList<>();
        if (!Prefs.carConfigured(this)) out.add("Choisir ta voiture (Bluetooth ou Wi-Fi)");
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION)) out.add("Autoriser la localisation");
        else if (Build.VERSION.SDK_INT >= 29 && !granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION))
            out.add("Localisation : « Toujours autoriser »");
        if (Build.VERSION.SDK_INT >= 31 && !granted(Manifest.permission.BLUETOOTH_CONNECT)) out.add("Autoriser le Bluetooth");
        if (!batteryOk()) out.add("Batterie : utilisation « Non restreinte »");
        return out;
    }

    void startManual() {
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, RQ_LOC_START);
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && !granted(Manifest.permission.POST_NOTIFICATIONS))
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, RQ_NOTIF);
        startForegroundService(new Intent(this, TripService.class).setAction(TripService.A_START).putExtra("src", "manuel"));
        handler.postDelayed(new Runnable() { public void run() { render(); } }, 500);
    }

    // =====================================================================
    // Trajets
    // =====================================================================

    void renderTrips() {
        Db db = Db.get(this);
        List<Db.Trip> trips = db.trips(0, Long.MAX_VALUE, false);
        double cpk = Calc.costPerKm(this, db.fuels());
        double total = 0;
        for (Db.Trip t : trips) total += t.km();
        header("Trajets", trips.size() + " trajets · " + Fmt.km(total) + " au total");

        LinearLayout actions = new LinearLayout(this);
        actions.addView(button("+ Ajouter à la main", false, new View.OnClickListener() { public void onClick(View v) { manualTripDialog(); } }), new LinearLayout.LayoutParams(0, -2, 1f));
        space(actions, 8);
        actions.addView(button("Exporter (CSV)", false, new View.OnClickListener() { public void onClick(View v) { exportTrips(); } }), new LinearLayout.LayoutParams(0, -2, 1f));
        content.addView(actions);
        space(content, 8);

        if (trips.isEmpty()) {
            LinearLayout c = card();
            c.addView(tv("Aucun trajet pour l'instant.", 15, TXT, true));
            c.addView(tv("Dès que ton téléphone se connecte au Bluetooth de la 208, le trajet s'enregistre tout seul : distance, durée, vitesse et coût.", 14, SUB, false));
            return;
        }

        long day = -1;
        double dayKm = 0;
        TextView dayHeader = null;
        int shown = 0;
        for (Db.Trip t : trips) {
            if (++shown > 400) break;
            long d = Calc.dayStart(t.start);
            if (d != day) {
                if (dayHeader != null) dayHeader.setText(dayHeader.getText() + "  ·  " + Fmt.km(dayKm));
                day = d; dayKm = 0;
                dayHeader = tv(Fmt.date(t.start), 13, SUB, true);
                dayHeader.setPadding(dp(4), dp(14), 0, dp(6));
                content.addView(dayHeader);
            }
            dayKm += t.km();
            final long id = t.id;
            LinearLayout r = card();
            r.setOrientation(LinearLayout.HORIZONTAL);
            r.setGravity(Gravity.CENTER_VERTICAL);
            ((LinearLayout.LayoutParams) r.getLayoutParams()).bottomMargin = dp(8);
            LinearLayout left = new LinearLayout(this);
            left.setOrientation(LinearLayout.VERTICAL);
            left.addView(tv(Fmt.time(t.start) + " → " + Fmt.time(t.end), 16, TXT, true));
            left.addView(tv(Fmt.dur(t.duration()) + " · moy. " + Math.round(t.avgKmh()) + " km/h" + ("auto".equals(t.src) ? "" : " · " + t.src), 13, SUB, false));
            r.addView(left, new LinearLayout.LayoutParams(0, -2, 1f));
            LinearLayout right = new LinearLayout(this);
            right.setOrientation(LinearLayout.VERTICAL);
            right.setGravity(Gravity.END);
            TextView km = tv(Fmt.km(t.km()), 17, ACC, true);
            km.setGravity(Gravity.END);
            right.addView(km);
            TextView eur = tv("≈ " + Fmt.eur(t.km() * cpk), 13, SUB, false);
            eur.setGravity(Gravity.END);
            right.addView(eur);
            r.addView(right);
            r.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { detailId = id; render(); scroll.scrollTo(0, 0); } });
        }
        if (dayHeader != null) dayHeader.setText(dayHeader.getText() + "  ·  " + Fmt.km(dayKm));
    }

    void renderTripDetail(long id) {
        Db db = Db.get(this);
        Db.Trip t = db.trip(id);
        TextView back = tv("←  Trajets", 15, ACC, true);
        back.setPadding(0, dp(4), 0, dp(12));
        back.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { detailId = -1; render(); } });
        content.addView(back);
        if (t == null) { content.addView(tv("Trajet introuvable.", 15, TXT, false)); return; }

        List<Db.Fuel> fuels = db.fuels();
        double conso = Calc.conso(this, fuels), price = Calc.pricePerL(this, fuels);
        header(Fmt.km(t.km()), Fmt.date(t.start));

        LinearLayout map = card();
        map.setPadding(0, 0, 0, 0);
        map.addView(new Charts.Trace(this, TripService.decode(t.pts), ACC, GOOD, BAD, SUB), new LinearLayout.LayoutParams(-1, dp(260)));

        LinearLayout c = card();
        c.addView(row("Départ", Fmt.time(t.start)));
        c.addView(row("Arrivée", Fmt.time(t.end)));
        c.addView(row("Durée", Fmt.dur(t.duration())));
        if (t.moving > 0) c.addView(row("Temps en mouvement", Fmt.dur(t.moving)));
        c.addView(row("Distance", Fmt.km(t.km())));
        c.addView(row("Vitesse moyenne", Math.round(t.avgKmh()) + " km/h"));
        if (t.vmax > 0) c.addView(row("Vitesse max", Math.round(t.vmax) + " km/h"));
        c.addView(row("Carburant estimé", Fmt.num(t.km() * conso / 100, 2) + " L"));
        c.addView(row("Coût estimé", Fmt.eur(t.km() * conso / 100 * price)));
        c.addView(row("Enregistrement", "auto".equals(t.src) ? "Automatique (Bluetooth)" : Fmt.cap(t.src == null ? "manuel" : t.src)));

        content.addView(button("Supprimer ce trajet", false, new View.OnClickListener() { public void onClick(View v) { confirm("Supprimer ce trajet ?", new Runnable() { public void run() {
            db.deleteTrip(id);
            detailId = -1;
            render();
        } }); } }));
    }

    void manualTripDialog() {
        LinearLayout f = form();
        final long[] date = {System.currentTimeMillis()};
        TextView d = dateButton(f, date);
        EditText km = field(f, "Distance (km)", "", true);
        EditText min = field(f, "Durée (minutes)", "", true);
        dialog("Ajouter un trajet", f, null, new Save() { public boolean run() {
            double k = Fmt.parse(km.getText().toString());
            double m = Fmt.parse(min.getText().toString());
            if (!(k > 0)) { toast("Indique la distance"); return false; }
            Db.Trip t = new Db.Trip();
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(date[0]);
            if (Calc.dayStart(date[0]) != Calc.dayStart(System.currentTimeMillis())) cal.set(Calendar.HOUR_OF_DAY, 12);
            t.start = cal.getTimeInMillis();
            t.end = t.start + (long) ((m > 0 ? m : k) * 60000);
            t.dist = k * 1000; t.src = "ajout manuel"; t.pts = "";
            Db.get(MainActivity.this).addTrip(t);
            render();
            return true;
        } });
    }

    void exportTrips() {
        List<Db.Trip> trips = Db.get(this).trips(0, Long.MAX_VALUE, false);
        double cpk = Calc.costPerKm(this, Db.get(this).fuels());
        StringBuilder sb = new StringBuilder("date;depart;arrivee;distance_km;duree_min;vitesse_moy_kmh;vitesse_max_kmh;cout_estime_eur;source\n");
        for (int i = trips.size() - 1; i >= 0; i--) {
            Db.Trip t = trips.get(i);
            sb.append(Fmt.dateShort(t.start)).append(';').append(Fmt.time(t.start)).append(';').append(Fmt.time(t.end)).append(';')
                    .append(Fmt.num(t.km(), 2).replace(" ", "").replace(" ", "")).append(';')
                    .append(Math.round(t.duration() / 60000.0)).append(';')
                    .append(Math.round(t.avgKmh())).append(';').append(Math.round(t.vmax)).append(';')
                    .append(Fmt.num(t.km() * cpk, 2).replace(" ", "").replace(" ", "")).append(';')
                    .append(t.src).append('\n');
        }
        share("Trajets – Compteur 208", sb.toString());
    }

    // =====================================================================
    // Pleins
    // =====================================================================

    void renderFuel() {
        Db db = Db.get(this);
        List<Db.Fuel> fuels = db.fuels();
        long ys = Calc.yearStart(System.currentTimeMillis());
        double yEur = 0, yL = 0;
        for (Db.Fuel f : fuels) if (f.date >= ys) { yEur += f.total; yL += f.liters; }
        header("Pleins", fuels.size() + " pleins enregistrés");
        content.addView(button("+  Ajouter un plein", true, new View.OnClickListener() { public void onClick(View v) { fuelDialog(null); } }));
        space(content, 12);

        double real = Calc.realConso(fuels);
        grid(new String[][]{
                {"Dépensé cette année", Fmt.eur(yEur)},
                {"Litres cette année", Fmt.num(yL, 1) + " L"},
                {"Prix moyen", yL > 0 ? Fmt.num(yEur / yL, 3) + " €/L" : "—"},
                {"Consommation réelle", real > 0 ? Fmt.num(real, 1) + " L/100" : "—"},
        });

        if (fuels.isEmpty()) {
            LinearLayout c = card();
            c.addView(tv("Aucun plein pour l'instant.", 15, TXT, true));
            c.addView(tv("À chaque passage à la pompe, note le montant, les litres et le kilométrage du compteur : l'appli calcule ta vraie consommation et le coût de chaque trajet.", 14, SUB, false));
            return;
        }
        Map<Long, double[]> seg = Calc.segments(fuels);
        section("Historique");
        for (Db.Fuel f : fuels) {
            LinearLayout c = card();
            ((LinearLayout.LayoutParams) c.getLayoutParams()).bottomMargin = dp(8);
            LinearLayout top = new LinearLayout(this);
            top.addView(tv(Fmt.date(f.date), 15, TXT, true), new LinearLayout.LayoutParams(0, -2, 1f));
            top.addView(tv(Fmt.eur(f.total), 17, ACC, true));
            c.addView(top);
            c.addView(tv(Fmt.num(f.liters, 2) + " L · " + Fmt.num(f.pricePerL(), 3) + " €/L" + (f.full ? " · plein complet" : " · partiel"), 13, SUB, false));
            String l3 = (f.odo > 0 ? "Compteur " + Fmt.kmInt(f.odo) : "") + (f.station.isEmpty() ? "" : (f.odo > 0 ? " · " : "") + f.station);
            if (!l3.isEmpty()) c.addView(tv(l3, 13, SUB, false));
            double[] s = seg.get(f.id);
            if (s != null) c.addView(tv("➜ " + Fmt.num(s[0] / s[1] * 100, 1) + " L/100 sur " + Fmt.kmInt(s[1]), 13, GOOD, true));
            c.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { fuelDialog(f); } });
        }
    }

    void fuelDialog(Db.Fuel existing) {
        final Db.Fuel f = existing != null ? existing : new Db.Fuel();
        if (existing == null) f.date = System.currentTimeMillis();
        Db db = Db.get(this);
        LinearLayout form = form();
        final long[] date = {f.date};
        dateButton(form, date);
        double est = Calc.estimatedOdo(this, db.fuels(), db.maints());
        EditText odo = field(form, "Kilométrage au compteur", f.odo > 0 ? Fmt.num(f.odo, 0) : "", true);
        if (existing == null && est > 0) odo.setHint("Kilométrage au compteur (≈ " + Fmt.kmInt(est) + ")");
        EditText liters = field(form, "Litres", f.liters > 0 ? Fmt.num(f.liters, 2) : "", true);
        EditText total = field(form, "Montant payé (€)", f.total > 0 ? Fmt.num(f.total, 2) : "", true);
        TextView ppl = tv("", 14, SUB, false);
        ppl.setPadding(dp(4), dp(4), 0, dp(8));
        form.addView(ppl);
        TextWatcher w = new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            public void onTextChanged(CharSequence s, int a, int b, int c) {}
            public void afterTextChanged(Editable e) {
                double l = Fmt.parse(liters.getText().toString()), t = Fmt.parse(total.getText().toString());
                ppl.setText(l > 0 && t > 0 ? "Prix au litre : " + Fmt.num(t / l, 3) + " €" : "");
            }
        };
        liters.addTextChangedListener(w);
        total.addTextChangedListener(w);
        w.afterTextChanged(null);
        CheckBox full = new CheckBox(this);
        full.setText("Plein complet (réservoir rempli à ras)");
        full.setTextColor(TXT);
        full.setChecked(f.full);
        form.addView(full);
        EditText station = field(form, "Station (facultatif)", f.station, false);

        dialog(existing == null ? "Nouveau plein" : "Modifier le plein", form,
                existing == null ? null : new Runnable() { public void run() { confirm("Supprimer ce plein ?", new Runnable() { public void run() { db.deleteFuel(f.id); render(); } }); } },
                new Save() { public boolean run() {
                    double l = Fmt.parse(liters.getText().toString()), t = Fmt.parse(total.getText().toString());
                    double o = Fmt.parse(odo.getText().toString());
                    if (!(l > 0)) { toast("Indique le nombre de litres"); return false; }
                    if (!(t > 0)) { toast("Indique le montant payé"); return false; }
                    f.date = date[0]; f.liters = l; f.total = t; f.odo = o > 0 ? o : -1;
                    f.full = full.isChecked(); f.station = station.getText().toString().trim();
                    db.saveFuel(f);
                    render();
                    return true;
                } });
    }

    // =====================================================================
    // Entretien
    // =====================================================================

    void renderMaint() {
        Db db = Db.get(this);
        List<Db.Maint> list = db.maints();
        double sum = 0;
        long ys = Calc.yearStart(System.currentTimeMillis());
        for (Db.Maint m : list) if (m.date >= ys) sum += m.cost;
        header("Entretien & frais", "Cette année : " + Fmt.eur(sum));
        content.addView(button("+  Ajouter une dépense", true, new View.OnClickListener() { public void onClick(View v) { maintDialog(null); } }));
        space(content, 12);
        if (list.isEmpty()) {
            LinearLayout c = card();
            c.addView(tv("Rien pour l'instant.", 15, TXT, true));
            c.addView(tv("Vidange, révision, pneus, contrôle technique, assurance, péages… Note-les ici pour connaître le vrai coût de ta 208. Une vidange avec kilométrage active le rappel de la prochaine.", 14, SUB, false));
            return;
        }
        for (Db.Maint m : list) {
            LinearLayout c = card();
            ((LinearLayout.LayoutParams) c.getLayoutParams()).bottomMargin = dp(8);
            LinearLayout top = new LinearLayout(this);
            top.addView(tv(m.type, 16, TXT, true), new LinearLayout.LayoutParams(0, -2, 1f));
            top.addView(tv(Fmt.eur(m.cost), 16, ACC, true));
            c.addView(top);
            c.addView(tv(Fmt.date(m.date) + (m.odo > 0 ? " · " + Fmt.kmInt(m.odo) : ""), 13, SUB, false));
            if (!m.note.isEmpty()) c.addView(tv(m.note, 13, SUB, false));
            c.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { maintDialog(m); } });
        }
    }

    void maintDialog(Db.Maint existing) {
        final Db.Maint m = existing != null ? existing : new Db.Maint();
        if (existing == null) m.date = System.currentTimeMillis();
        Db db = Db.get(this);
        LinearLayout form = form();
        Spinner type = new Spinner(this, Spinner.MODE_DIALOG);
        ArrayAdapter<String> ad = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, MAINT_TYPES);
        type.setAdapter(ad);
        for (int i = 0; i < MAINT_TYPES.length; i++) if (MAINT_TYPES[i].equals(m.type)) type.setSelection(i);
        form.addView(type);
        final long[] date = {m.date};
        dateButton(form, date);
        EditText cost = field(form, "Montant (€)", m.cost > 0 ? Fmt.num(m.cost, 2) : "", true);
        EditText odo = field(form, "Kilométrage (facultatif)", m.odo > 0 ? Fmt.num(m.odo, 0) : "", true);
        double est = Calc.estimatedOdo(this, db.fuels(), db.maints());
        if (existing == null && est > 0) odo.setHint("Kilométrage (≈ " + Fmt.kmInt(est) + ")");
        EditText note = field(form, "Note (garage, détails…)", m.note, false);
        dialog(existing == null ? "Nouvelle dépense" : "Modifier", form,
                existing == null ? null : new Runnable() { public void run() { confirm("Supprimer cette dépense ?", new Runnable() { public void run() { db.deleteMaint(m.id); render(); } }); } },
                new Save() { public boolean run() {
                    double c = Fmt.parse(cost.getText().toString()), o = Fmt.parse(odo.getText().toString());
                    m.type = (String) type.getSelectedItem();
                    m.date = date[0]; m.cost = c > 0 ? c : 0; m.odo = o > 0 ? o : -1;
                    m.note = note.getText().toString().trim();
                    db.saveMaint(m);
                    render();
                    return true;
                } });
    }

    // =====================================================================
    // Réglages
    // =====================================================================

    void renderSettings() {
        header("Réglages", "Détection automatique, compteur, autorisations");

        // --- Voiture ---
        section("Ma voiture");
        LinearLayout c = card();
        Switch auto = new Switch(this);
        auto.setText("Enregistrer les trajets automatiquement");
        auto.setTextColor(TXT);
        auto.setTextSize(15);
        auto.setChecked(Prefs.autoEnabled(this));
        auto.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() { public void onCheckedChanged(CompoundButton b, boolean on) { Prefs.get(MainActivity.this).edit().putBoolean("auto", on).apply(); } });
        c.addView(auto);
        space(c, 10);
        TextView wifiHint = tv("📶  Wi-Fi de la voiture (boîtier CarPlay / Android Auto)", 14, TXT, true);
        c.addView(wifiHint);
        String ssid = Prefs.carSsid(this);
        EditText ssidField = field(c, "Nom du Wi-Fi (ex. AutoBox-9678)", ssid == null ? "" : ssid, false);
        LinearLayout wb = new LinearLayout(this);
        wb.addView(button("Enregistrer", true, new View.OnClickListener() { public void onClick(View v) {
            Prefs.get(MainActivity.this).edit().putString("car_ssid", ssidField.getText().toString().trim()).apply();
            WifiWatch.register(MainActivity.this);
            toast(ssidField.getText().toString().trim().isEmpty() ? "Détection Wi-Fi désactivée" : "Wi-Fi enregistré");
            render();
        } }), new LinearLayout.LayoutParams(0, -2, 1f));
        space(wb, 8);
        wb.addView(button("Wi-Fi actuel", false, new View.OnClickListener() { public void onClick(View v) {
            String cur = WifiWatch.currentSsid(MainActivity.this);
            if (cur == null) toast("Aucun Wi-Fi détecté (connecte-toi au boîtier et autorise la localisation)");
            else ssidField.setText(cur);
        } }), new LinearLayout.LayoutParams(0, -2, 1f));
        space(c, 6);
        c.addView(wb);
        String cur = WifiWatch.currentSsid(this);
        if (ssid != null) {
            TextView st = tv(WifiWatch.onCarWifi(this) ? "✅  Connecté au Wi-Fi de la voiture en ce moment" : "Wi-Fi actuel : " + (cur == null ? "aucun" : cur), 12, WifiWatch.onCarWifi(this) ? GOOD : SUB, false);
            st.setPadding(0, dp(8), 0, 0);
            c.addView(st);
        }
        space(c, 16);

        String car = Prefs.carName(this);
        c.addView(tv("🔵  Bluetooth de la voiture (facultatif)", 14, TXT, true));
        c.addView(row("Appareil", car == null ? "Aucun" : car));
        c.addView(button(car == null ? "Choisir le Bluetooth" : "Changer de Bluetooth", false, new View.OnClickListener() { public void onClick(View v) { pickCar(); } }));
        if (car != null) {
            space(c, 6);
            c.addView(button("Retirer le Bluetooth", false, new View.OnClickListener() { public void onClick(View v) {
                Prefs.get(MainActivity.this).edit().remove("car_addr").remove("car_name").apply();
                render();
            } }));
        }
        TextView hint = tv("Le trajet démarre dès que le téléphone se connecte au Wi-Fi ou au Bluetooth de la voiture, et se termine 1 min 30 après la déconnexion. Pour lire le nom du Wi-Fi, Android exige la localisation « Toujours autoriser ».", 12, SUB, false);
        hint.setPadding(0, dp(10), 0, 0);
        c.addView(hint);

        // --- Autorisations ---
        section("Autorisations");
        LinearLayout pc = card();
        boolean loc = granted(Manifest.permission.ACCESS_FINE_LOCATION);
        permRow(pc, "Localisation précise", loc, new Runnable() { public void run() { requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, RQ_LOC); } });
        if (Build.VERSION.SDK_INT >= 29)
            permRow(pc, "Localisation « Toujours autoriser »", granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION), new Runnable() { public void run() {
                if (!loc) { toast("Autorise d'abord la localisation précise"); return; }
                toast("Choisis « Toujours autoriser »");
                requestPermissions(new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, RQ_BG);
            } });
        if (Build.VERSION.SDK_INT >= 31)
            permRow(pc, "Bluetooth (appareils à proximité)", granted(Manifest.permission.BLUETOOTH_CONNECT), new Runnable() { public void run() { requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, RQ_BT); } });
        if (Build.VERSION.SDK_INT >= 33)
            permRow(pc, "Notifications", granted(Manifest.permission.POST_NOTIFICATIONS), new Runnable() { public void run() { requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, RQ_NOTIF); } });
        permRow(pc, "Batterie non restreinte", batteryOk(), new Runnable() { public void run() {
            try {
                startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
            } catch (Exception e) {
                openAppSettings();
            }
        } });
        space(pc, 6);
        pc.addView(button("Ouvrir les paramètres de l'appli", false, new View.OnClickListener() { public void onClick(View v) { openAppSettings(); } }));

        // --- Compteur ---
        section("Compteur kilométrique");
        LinearLayout oc = card();
        double ref = Prefs.odoRef(this);
        oc.addView(tv(ref > 0 ? "Dernier relevé saisi : " + Fmt.kmInt(ref) + " le " + Fmt.dateShort(Prefs.odoRefDate(this))
                : "Lis le kilométrage sur le tableau de bord de ta 208 et note-le ici.", 13, SUB, false));
        EditText odo = field(oc, "Kilométrage actuel (km)", "", true);
        oc.addView(button("Enregistrer le kilométrage", true, new View.OnClickListener() { public void onClick(View v) {
            double o = Fmt.parse(odo.getText().toString());
            if (!(o > 0)) { toast("Indique le kilométrage"); return; }
            Prefs.get(MainActivity.this).edit().putFloat("odo_ref", (float) o).putLong("odo_ref_date", System.currentTimeMillis()).apply();
            toast("Kilométrage enregistré");
            render();
        } }));

        // --- Valeurs par défaut ---
        section("Valeurs de calcul");
        LinearLayout dc = card();
        dc.addView(tv("Utilisées tant qu'il n'y a pas assez de pleins enregistrés.", 13, SUB, false));
        EditText conso = field(dc, "Consommation (L/100 km)", Fmt.num(Prefs.defaultConso(this), 1), true);
        EditText prix = field(dc, "Prix du litre (€)", Fmt.num(Prefs.defaultPrice(this), 3), true);
        EditText vid = field(dc, "Vidange tous les (km)", Fmt.num(Prefs.vidangeInterval(this), 0), true);
        dc.addView(button("Enregistrer", false, new View.OnClickListener() { public void onClick(View v) {
            double a = Fmt.parse(conso.getText().toString()), p = Fmt.parse(prix.getText().toString()), k = Fmt.parse(vid.getText().toString());
            android.content.SharedPreferences.Editor e = Prefs.get(MainActivity.this).edit();
            if (a > 0) e.putFloat("conso_def", (float) a);
            if (p > 0) e.putFloat("prix_def", (float) p);
            if (k > 0) e.putFloat("vidange_km", (float) k);
            e.apply();
            toast("Enregistré");
        } }));

        // --- Export ---
        section("Exporter");
        LinearLayout ec = card();
        ec.addView(tv("Pour les frais kilométriques ou un tableur (Excel, Google Sheets).", 13, SUB, false));
        space(ec, 8);
        ec.addView(button("Exporter les trajets (CSV)", false, new View.OnClickListener() { public void onClick(View v) { exportTrips(); } }));
        space(ec, 8);
        ec.addView(button("Exporter les pleins (CSV)", false, new View.OnClickListener() { public void onClick(View v) { exportFuel(); } }));

        // --- Astuces ---
        section("Astuces Samsung");
        LinearLayout tc = card();
        tc.addView(tv("Pour que la détection marche toujours sur le S25 Ultra :\n\n"
                + "•  Paramètres → Batterie → Limites d'utilisation en arrière-plan → ajoute « Compteur 208 » aux « Applications jamais en veille ».\n"
                + "•  Garde le Bluetooth et la localisation activés.\n"
                + "•  Ouvre l'appli une fois après l'installation (et après une mise à jour).\n"
                + "•  Pour corriger un trajet raté : Trajets → « Ajouter à la main ».", 13, TXT, false));

        TextView ver = tv("Compteur 208 · version 1.2 · données stockées uniquement sur ton téléphone", 11, SUB, false);
        ver.setGravity(Gravity.CENTER);
        ver.setPadding(0, dp(20), 0, 0);
        content.addView(ver);
    }

    void pickCar() {
        if (Build.VERSION.SDK_INT >= 31 && !granted(Manifest.permission.BLUETOOTH_CONNECT)) {
            requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, RQ_BT_PICK);
            return;
        }
        BluetoothManager bm = getSystemService(BluetoothManager.class);
        BluetoothAdapter ad = bm != null ? bm.getAdapter() : null;
        if (ad == null) { toast("Bluetooth indisponible"); return; }
        if (!ad.isEnabled()) { toast("Active d'abord le Bluetooth"); return; }
        Set<BluetoothDevice> bonded;
        try { bonded = ad.getBondedDevices(); } catch (SecurityException e) { toast("Autorisation Bluetooth refusée"); return; }
        final List<BluetoothDevice> devs = new ArrayList<>();
        List<String> names = new ArrayList<>();
        // Les appareils qui ressemblent à une Peugeot en premier
        for (int pass = 0; pass < 2; pass++) {
            for (BluetoothDevice d : bonded) {
                String n = d.getName() == null ? d.getAddress() : d.getName();
                String u = n.toUpperCase();
                boolean car = u.contains("PEUGEOT") || u.contains("208") || u.contains("MY CAR") || u.contains("CAR");
                if ((pass == 0) == car) { devs.add(d); names.add((car ? "🚗  " : "") + n); }
            }
        }
        if (devs.isEmpty()) {
            toast("Aucun appareil appairé : connecte d'abord ton téléphone à la 208 en Bluetooth");
            return;
        }
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle("Quel est le Bluetooth de ta 208 ?")
                .setItems(names.toArray(new String[0]), new DialogInterface.OnClickListener() { public void onClick(DialogInterface dlg, int i) {
                    BluetoothDevice d = devs.get(i);
                    String n = d.getName() == null ? d.getAddress() : d.getName();
                    Prefs.get(MainActivity.this).edit().putString("car_addr", d.getAddress()).putString("car_name", n).apply();
                    toast("Voiture enregistrée : " + n);
                    render();
                } })
                .setNegativeButton("Annuler", null)
                .show();
    }

    void exportFuel() {
        List<Db.Fuel> fuels = Db.get(this).fuels();
        StringBuilder sb = new StringBuilder("date;compteur_km;litres;montant_eur;prix_litre;plein_complet;station\n");
        for (int i = fuels.size() - 1; i >= 0; i--) {
            Db.Fuel f = fuels.get(i);
            sb.append(Fmt.dateShort(f.date)).append(';').append(f.odo > 0 ? Math.round(f.odo) + "" : "").append(';')
                    .append(clean(Fmt.num(f.liters, 2))).append(';').append(clean(Fmt.num(f.total, 2))).append(';')
                    .append(clean(Fmt.num(f.pricePerL(), 3))).append(';').append(f.full ? "oui" : "non").append(';')
                    .append(f.station.replace(";", ",")).append('\n');
        }
        share("Pleins – Compteur 208", sb.toString());
    }

    static String clean(String s) { return s.replace(" ", "").replace(" ", ""); }

    void share(String subject, String text) {
        Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, subject).putExtra(Intent.EXTRA_TEXT, text);
        startActivity(Intent.createChooser(i, "Exporter"));
    }

    void openAppSettings() {
        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
    }

    boolean granted(String p) { return checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED; }

    boolean batteryOk() {
        PowerManager pm = getSystemService(PowerManager.class);
        return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
    }

    // =====================================================================
    // Petits outils d'interface
    // =====================================================================

    int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    TextView tv(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        return t;
    }

    GradientDrawable rounded(int color, float radiusDp) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radiusDp));
        return g;
    }

    void header(String title, String sub) {
        content.addView(tv(title, 28, TXT, true));
        TextView s = tv(sub, 14, SUB, false);
        s.setPadding(0, dp(2), 0, dp(16));
        content.addView(s);
    }

    void section(String title) {
        TextView t = tv(title, 13, SUB, true);
        t.setAllCaps(true);
        t.setLetterSpacing(0.06f);
        t.setPadding(dp(4), dp(10), 0, dp(8));
        content.addView(t);
    }

    LinearLayout card() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setBackground(rounded(CARD, 16));
        c.setPadding(dp(16), dp(14), dp(16), dp(14));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.bottomMargin = dp(12);
        content.addView(c, lp);
        return c;
    }

    void space(ViewGroup g, int dpSize) {
        View v = new View(this);
        g.addView(v, new LinearLayout.LayoutParams(dp(dpSize), dp(dpSize)));
    }

    LinearLayout row(String label, String value) {
        LinearLayout r = new LinearLayout(this);
        r.setPadding(0, dp(5), 0, dp(5));
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.addView(tv(label, 14, SUB, false), new LinearLayout.LayoutParams(0, -2, 1f));
        TextView v = tv(value, 15, TXT, true);
        v.setGravity(Gravity.END);
        r.addView(v);
        return r;
    }

    /** Grille de tuiles 2 colonnes : {{titre, valeur}, ...}. */
    void grid(String[][] tiles) {
        for (int i = 0; i < tiles.length; i += 2) {
            LinearLayout line = new LinearLayout(this);
            for (int j = i; j < Math.min(i + 2, tiles.length); j++) {
                LinearLayout t = new LinearLayout(this);
                t.setOrientation(LinearLayout.VERTICAL);
                t.setBackground(rounded(CARD, 16));
                t.setPadding(dp(14), dp(12), dp(14), dp(12));
                t.addView(tv(tiles[j][0], 12, SUB, false));
                t.addView(tv(tiles[j][1], 20, TXT, true));
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, -2, 1f);
                if (j == i) lp.rightMargin = dp(6); else lp.leftMargin = dp(6);
                line.addView(t, lp);
            }
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
            lp.bottomMargin = dp(12);
            content.addView(line, lp);
        }
    }

    TextView button(String label, boolean primary, View.OnClickListener l) {
        TextView b = tv(label, 15, primary ? 0xFFFFFFFF : ACC, true);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(12), dp(13), dp(12), dp(13));
        b.setBackground(rounded(primary ? ACC : CARD2, 12));
        b.setOnClickListener(l);
        b.setClickable(true);
        return b;
    }

    void permRow(LinearLayout parent, String label, boolean ok, Runnable fix) {
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setPadding(0, dp(6), 0, dp(6));
        r.addView(tv((ok ? "✅  " : "❌  ") + label, 14, ok ? TXT : WARN, false), new LinearLayout.LayoutParams(0, -2, 1f));
        if (!ok) {
            TextView b = tv("Autoriser", 14, ACC, true);
            b.setPadding(dp(12), dp(6), dp(4), dp(6));
            b.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { fix.run(); } });
            r.addView(b);
        }
        parent.addView(r);
    }

    LinearLayout form() {
        LinearLayout f = new LinearLayout(this);
        f.setOrientation(LinearLayout.VERTICAL);
        f.setPadding(dp(20), dp(8), dp(20), 0);
        return f;
    }

    EditText field(LinearLayout parent, String hint, String value, boolean number) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setText(value);
        e.setTextColor(TXT);
        e.setHintTextColor(SUB);
        e.setSingleLine(true);
        if (number) {
            // accepte la virgule comme le point, avec le clavier numérique
            e.setKeyListener(android.text.method.DigitsKeyListener.getInstance("0123456789.,"));
            e.setRawInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        }
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(4);
        parent.addView(e, lp);
        return e;
    }

    TextView dateButton(LinearLayout parent, long[] date) {
        TextView d = tv("📅  " + Fmt.date(date[0]), 15, ACC, true);
        d.setPadding(dp(4), dp(12), dp(4), dp(12));
        d.setOnClickListener(new View.OnClickListener() { public void onClick(View v) {
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(date[0]);
            new DatePickerDialog(MainActivity.this, new DatePickerDialog.OnDateSetListener() { public void onDateSet(DatePicker p, int y, int m, int day) {
                Calendar c2 = Calendar.getInstance();
                c2.setTimeInMillis(date[0]);
                c2.set(y, m, day);
                date[0] = c2.getTimeInMillis();
                d.setText("📅  " + Fmt.date(date[0]));
            } }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show();
        } });
        parent.addView(d);
        return d;
    }

    interface Save { boolean run(); }

    /** Boîte de dialogue avec formulaire ; reste ouverte si la saisie est invalide. */
    void dialog(String title, View body, Runnable onDelete, Save onSave) {
        ScrollView sv = new ScrollView(this);
        sv.addView(body);
        AlertDialog.Builder b = new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle(title)
                .setView(sv)
                .setPositiveButton("Enregistrer", null)
                .setNegativeButton("Annuler", null);
        if (onDelete != null) b.setNeutralButton("Supprimer", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { onDelete.run(); } });
        AlertDialog dlg = b.create();
        dlg.setOnShowListener(new DialogInterface.OnShowListener() { public void onShow(DialogInterface x) { dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(new View.OnClickListener() { public void onClick(View v) {
            if (onSave.run()) dlg.dismiss();
        } }); } });
        dlg.show();
    }

    void confirm(String msg, Runnable yes) {
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setMessage(msg)
                .setPositiveButton("Supprimer", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { yes.run(); } })
                .setNegativeButton("Annuler", null)
                .show();
    }

    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_LONG).show(); }
}
