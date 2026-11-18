package fr.compteur208;

import android.Manifest;
import android.app.Dialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Écran principal : 5 onglets (Accueil, Trajets, Stats, Dépenses, Réglages).
 * Pas de lambdas (voir BaseUi).
 */
public class MainActivity extends BaseUi {
    static final String EXTRA_START = "demarrer_trajet", EXTRA_TAB = "onglet";
    static final String[] MAINT_TYPES = {"Vidange", "Révision", "Pneus", "Freins", "Contrôle technique",
            "Batterie", "Assurance", "Péage / parking", "Lavage", "Réparation", "Autre"};
    static final int RQ_LOC = 1, RQ_BG = 2, RQ_BT = 3, RQ_NOTIF = 4, RQ_LOC_START = 5, RQ_BT_PICK = 6;
    static final int[] NAV_ICONS = {R.drawable.i_home, R.drawable.i_route, R.drawable.i_chart, R.drawable.i_fuel, R.drawable.i_sliders};
    static final String[] NAV_LABELS = {"Accueil", "Trajets", "Stats", "Dépenses", "Réglages"};
    static final String VERSION = "4.0";

    FrameLayout root;
    LinearLayout content;
    ScrollView scroll;
    final View[] navPill = new View[5];
    final ImageView[] navIcon = new ImageView[5];
    final TextView[] navLabel = new TextView[5];
    final View[] navDot = new View[5];
    int tab = 0, expTab = 0;
    long detailId = -1;

    final Handler handler = new Handler(Looper.getMainLooper());
    TextView liveDist, liveTime, liveAvg, liveStatus;
    Charts.Gauge liveGauge;
    boolean shownLive;
    /** Lieux dont on a déjà demandé l'adresse pendant cette session. */
    final Set<String> geocoding = new HashSet<>();

    final Runnable refresher = new Runnable() {
        public void run() { refreshLive(); handler.postDelayed(this, 1000); }
    };
    final Runnable rerender = new Runnable() { public void run() { render(); } };

    // =====================================================================
    // Cycle de vie
    // =====================================================================

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        root = new FrameLayout(this);
        root.setBackgroundColor(BG);

        scroll = new ScrollView(this);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.setOverScrollMode(View.OVER_SCROLL_NEVER);
        scroll.setClipToPadding(false);
        content = vbox();
        content.setPadding(dp(20), dp(22), dp(20), dp(120));
        scroll.addView(content);
        root.addView(scroll, new FrameLayout.LayoutParams(-1, -1));

        // Barre de navigation flottante, translucide
        LinearLayout nav = new LinearLayout(this);
        nav.setBackground(surface(0xE60F121A, 26).stroke(alpha(WHITE, 0x14)));
        nav.setPadding(dp(4), dp(8), dp(4), dp(8));
        glow(nav, 0xFF000000, 16);
        for (int i = 0; i < 5; i++) {
            final int k = i;
            LinearLayout item = vbox();
            item.setGravity(Gravity.CENTER_HORIZONTAL);
            FrameLayout pill = new FrameLayout(this);
            navIcon[i] = icon(NAV_ICONS[i], MUTED);
            pill.addView(navIcon[i], new FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER));
            navPill[i] = pill;
            item.addView(pill, lp(dp(54), dp(32), 0));
            navLabel[i] = text(NAV_LABELS[i], 10.5f, MUTED, W_MED);
            navLabel[i].setPadding(0, dp(3), 0, 0);
            navLabel[i].setGravity(Gravity.CENTER);
            navLabel[i].setSingleLine(true);
            item.addView(navLabel[i]);
            View dot = new View(this);
            GradientDrawable dg = new GradientDrawable();
            dg.setShape(GradientDrawable.OVAL);
            dg.setColor(CYAN);
            dot.setBackground(dg);
            glow(dot, CYAN, 4);
            navDot[i] = dot;
            LinearLayout.LayoutParams dlp = lp(dp(4), dp(4), 0);
            dlp.topMargin = dp(3);
            item.addView(dot, dlp);
            item.setOnClickListener(new Click() { public void run() { show(k); } });
            pressScale(item);
            nav.addView(item, lp(0, -2, 1f));
        }
        FrameLayout.LayoutParams np = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        np.leftMargin = dp(12); np.rightMargin = dp(12); np.bottomMargin = dp(12);
        root.addView(nav, np);
        setContentView(root);

        Notifs.channels(this);
        if (b != null) { tab = b.getInt("tab", 0); detailId = b.getLong("detail", -1); expTab = b.getInt("exp", 0); }
        handleStartIntent(getIntent());
    }

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        handleStartIntent(i);
    }

    /** Notification « Voiture détectée » (démarre le trajet) ou bilan mensuel (ouvre les stats). */
    void handleStartIntent(Intent i) {
        if (i == null) return;
        if (i.hasExtra(EXTRA_TAB)) { tab = i.getIntExtra(EXTRA_TAB, 0); detailId = -1; i.removeExtra(EXTRA_TAB); }
        if (!i.getBooleanExtra(EXTRA_START, false)) return;
        i.removeExtra(EXTRA_START);
        if (TripService.instance == null && granted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            startForegroundService(new Intent(this, TripService.class).setAction(TripService.A_START).putExtra("src", "auto"));
            tab = 0;
            detailId = -1;
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putInt("tab", tab);
        out.putLong("detail", detailId);
        out.putInt("exp", expTab);
    }

    @Override protected void onResume() {
        super.onResume();
        WifiWatch.register(this);
        Report.schedule(this);
        Report.sendIfDue(this);
        render();
        handler.post(refresher);
    }

    @Override protected void onPause() {
        super.onPause();
        handler.removeCallbacks(refresher);
    }

    @Override public void onBackPressed() {
        if (tab == 1 && detailId >= 0) { detailId = -1; transition(); }
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
        boolean changed = t != tab;
        tab = t;
        detailId = -1;
        transition();
        scroll.scrollTo(0, 0);
        if (changed) {
            navPill[t].setScaleX(0.6f);
            navPill[t].setAlpha(0f);
            navPill[t].animate().scaleX(1f).alpha(1f).setDuration(220).start();
        }
    }

    /** Transition douce entre écrans (fondu + léger glissement). */
    void transition() {
        render();
        content.setAlpha(0f);
        content.setTranslationY(dp(10));
        content.animate().alpha(1f).translationY(0).setDuration(220).start();
    }

    void render() {
        for (int i = 0; i < 5; i++) {
            boolean on = i == tab;
            navPill[i].setBackground(on ? surface(alpha(BLUE, 0x2A), 16).stroke(alpha(BLUE, 0x40)).noHighlight() : null);
            navIcon[i].setImageTintList(ColorStateList.valueOf(on ? 0xFF7DB4FF : MUTED));
            navLabel[i].setTextColor(on ? TXT : MUTED);
            navDot[i].setVisibility(on ? View.VISIBLE : View.INVISIBLE);
        }
        content.removeAllViews();
        liveDist = null; liveTime = null; liveAvg = null; liveStatus = null; liveGauge = null;
        switch (tab) {
            case 0: renderHome(); break;
            case 1: if (detailId >= 0) renderTripDetail(detailId); else renderTrips(); break;
            case 2: renderStats(); break;
            case 3: renderExpenses(); break;
            default: renderSettings(); break;
        }
    }

    void refreshLive() {
        TripService s = TripService.live;
        if (tab == 0 && (s != null) != shownLive) { render(); return; }
        if (s == null || liveDist == null) return;
        long el = System.currentTimeMillis() - s.startTs;
        double km = s.dist / 1000;
        liveDist.setText(Fmt.num(km, km < 100 ? 1 : 0));
        liveTime.setText(Fmt.dur(el));
        liveAvg.setText(el > 60000 ? Math.round(km / (el / 3600000.0)) + " km/h" : "—");
        liveGauge.setValue(s.curSpeed * 3.6f);
        liveStatus.setVisibility(s.btPendingStop ? View.VISIBLE : View.GONE);
    }

    // =====================================================================
    // Accueil
    // =====================================================================

    void renderHome() {
        Db db = Db.get(this);
        List<Db.Fuel> fuels = db.fuels();
        List<Db.Maint> maints = db.maints();
        long now = System.currentTimeMillis();
        TripService s = TripService.live;
        shownLive = s != null;

        headerLogo(content, "Trajo", Fmt.date(now), null);

        List<String> issues = setupIssues();
        if (!issues.isEmpty()) {
            LinearLayout banner = hbox();
            banner.setBackground(pressable(surface(alpha(AMBER, 0x12), 22).stroke(alpha(AMBER, 0x4D)), 22));
            banner.setPadding(dp(16), dp(14), dp(14), dp(14));
            LinearLayout.LayoutParams bp = lp(dp(40), dp(40), 0);
            bp.rightMargin = dp(14);
            banner.addView(bubble(R.drawable.i_shield, AMBER, 40), bp);
            LinearLayout col = vbox();
            col.addView(text("Configuration à terminer", 15, TXT, W_BOLD));
            TextView sub = text(issues.size() + (issues.size() > 1 ? " réglages manquants" : " réglage manquant") + " pour la détection automatique", 13, SUB, W_REG);
            sub.setPadding(0, dp(3), 0, 0);
            col.addView(sub);
            banner.addView(col, lp(0, -2, 1f));
            banner.addView(icon(R.drawable.i_chevron, AMBER), lp(dp(18), dp(18), 0));
            banner.setOnClickListener(new Click() { public void run() { show(4); } });
            pressScale(banner);
            content.addView(banner, fullWidth(12));
        }

        long ms = Calc.monthStart(now, 0);
        List<Db.Trip> monthTrips = db.trips(ms, Long.MAX_VALUE, false);
        double mKm = 0; long mTime = 0;
        for (Db.Trip t : monthTrips) { mKm += t.km(); mTime += t.duration(); }
        long prevStart = Calc.monthStart(now, -1);
        double prevKm = db.kmBetween(prevStart, Math.min(ms, prevStart + (now - ms)));
        double cpk = Calc.costPerKm(this, fuels);

        if (s != null) heroLive(s); else heroMonth(now, mKm, monthTrips.size(), mTime, prevKm, prevStart);
        if (s == null) statusCard();
        if (s == null) parkingCard();

        double real = Calc.realConso(fuels);
        double odo = Calc.estimatedOdo(this, fuels, maints);
        section(content, "Tableau de bord");
        LinearLayout r1 = tilesRow(content);
        tile(r1, R.drawable.i_euro, AMBER, "Carburant ce mois", Fmt.eur(mKm * cpk), "estimation");
        tile(r1, R.drawable.i_droplet, BLUE, "Consommation",
                Fmt.num(real > 0 ? real : Prefs.defaultConso(this), 1) + " L/100", real > 0 ? "réelle" : "valeur par défaut");
        LinearLayout r2 = tilesRow(content);
        tile(r2, R.drawable.i_gauge, CYAN, "Compteur", odo >= 0 ? Fmt.kmInt(odo) : "—", odo >= 0 ? "estimé" : "à renseigner");
        tile(r2, R.drawable.i_chart, AMBER, "Coût / 100 km", Fmt.eur(cpk * 100), "à " + Fmt.num(Calc.pricePerL(this, fuels), 3) + " €/L");

        double[] vals = new double[6];
        String[] labs = new String[6];
        for (int i = 0; i < 6; i++) {
            long a = Calc.monthStart(now, i - 5), b = Calc.monthStart(now, i - 4);
            vals[i] = db.kmBetween(a, b);
            labs[i] = Fmt.monthShort(a);
        }
        LinearLayout gc = card(content);
        chartTitle(gc, "Kilomètres par mois", "6 mois");
        gc.addView(new Charts.Bars(this, vals, labs, 5), new LinearLayout.LayoutParams(-1, dp(180)));

        List<Db.Trip> all = db.trips(0, Long.MAX_VALUE, false);
        if (!all.isEmpty()) {
            Db.Trip longest = all.get(0);
            double totKm = 0; long totTime = 0;
            for (Db.Trip t : all) {
                if (t.dist > longest.dist) longest = t;
                totKm += t.km();
                totTime += t.moving > 60000 ? t.moving : t.duration();
            }
            section(content, "Records & moyennes");
            LinearLayout g = group(content);
            final long lid = longest.id;
            listRow(g, R.drawable.i_trophy, AMBER, "Plus long trajet", Fmt.date(longest.start), Fmt.km(longest.km()), null, TXT,
                    new Click() { public void run() { tab = 1; detailId = lid; transition(); scroll.scrollTo(0, 0); } });
            listRow(g, R.drawable.i_route, BLUE, "Trajet moyen", all.size() + (all.size() > 1 ? " trajets enregistrés" : " trajet enregistré"),
                    Fmt.km(totKm / all.size()), null, TXT, null);
            listRow(g, R.drawable.i_gauge, CYAN, "Vitesse moyenne", "Sur tous les trajets",
                    totTime > 0 ? Math.round(totKm / (totTime / 3600000.0)) + " km/h" : "—", null, TXT, null);
            listRow(g, R.drawable.i_car, GOOD, "Total enregistré", Fmt.dur(totTime) + " au volant", Fmt.kmInt(totKm), null, TXT, null);
        }

        vidangeCard(odo, maints);

        long ys = Calc.yearStart(now);
        double yKm = db.kmBetween(ys, Long.MAX_VALUE), yFuel = 0, yMaint = 0;
        for (Db.Fuel f : fuels) if (f.date >= ys) yFuel += f.total;
        for (Db.Maint m : maints) if (m.date >= ys) yMaint += m.cost;
        section(content, "Depuis le 1er janvier");
        LinearLayout yg = group(content);
        listRow(yg, R.drawable.i_route, BLUE, "Kilomètres", null, Fmt.km(yKm), null, TXT, null);
        listRow(yg, R.drawable.i_fuel, AMBER, "Carburant", null, Fmt.eur(yFuel), null, TXT, null);
        listRow(yg, R.drawable.i_wrench, VIOLET, "Entretien & frais", null, Fmt.eur(yMaint), null, TXT, null);
        listRow(yg, R.drawable.i_euro, GOOD, "Total dépensé", yKm > 0 ? Fmt.num((yFuel + yMaint) / yKm * 100, 1) + " cts par km" : null,
                Fmt.eur(yFuel + yMaint), null, GOOD, null);
    }

    void chartTitle(LinearLayout parent, String title, String chipText) {
        LinearLayout row = hbox();
        row.addView(text(title, 16, TXT, W_BOLD), lp(0, -2, 1f));
        if (chipText != null) row.addView(chip(chipText, SUB));
        parent.addView(row, fullWidth(10));
    }

    /** Carte télémétrie du mois : dégradé « mesh », badge pulsant, grand chiffre. */
    void heroMonth(long now, double mKm, int trips, long mTime, double prevKm, long prevStart) {
        LinearLayout h = vbox();
        h.setBackground(surface(0xFF0C1324, 26).stroke(alpha(WHITE, 0x1F)).blobs(new float[][]{
                {0.05f, 0.0f, 0.95f}, {1.0f, 0.15f, 0.75f}, {0.75f, 1.15f, 0.85f}},
                alpha(BLUE, 0xB0), alpha(CYAN, 0x70), alpha(VIOLET, 0x80)));
        h.setPadding(dp(22), dp(20), dp(22), dp(22));
        glow(h, BLUE, 18);
        LinearLayout top = hbox();
        top.addView(label("Ce mois-ci · " + Fmt.month(now), 0xCCFFFFFF), lp(0, -2, 1f));
        if (Prefs.carConfigured(this)) {
            top.addView(Prefs.autoEnabled(this) ? liveBadge("Auto activé", GOOD, WHITE, 0x33000000)
                    : chip("Auto désactivé", 0xCCFFFFFF));
        }
        h.addView(top);
        LinearLayout big = new LinearLayout(this);
        big.setBaselineAligned(true);
        big.addView(number(Fmt.num(mKm, mKm < 100 ? 1 : 0), 64, WHITE));
        big.addView(text(" km", 22, 0xCCFFFFFF, W_MED));
        LinearLayout.LayoutParams bp = fullWidth(2);
        bp.topMargin = dp(6);
        h.addView(big, bp);
        h.addView(text(trips + (trips > 1 ? " trajets" : " trajet") + "  ·  " + Fmt.dur(mTime) + " au volant", 14, 0xE6FFFFFF, W_REG));
        if (prevKm > 0.5) {
            double pct = (mKm - prevKm) / prevKm * 100;
            TextView c = text((pct >= 0 ? "▲ " : "▼ ") + Math.round(Math.abs(pct)) + " % vs même période en " + Fmt.monthShort(prevStart) + ".", 12, WHITE, W_MED);
            c.setBackground(surface(0x26FFFFFF, 100).stroke(alpha(WHITE, 0x26)).noHighlight());
            c.setPadding(dp(10), dp(6), dp(10), dp(6));
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-2, -2);
            cp.topMargin = dp(16);
            h.addView(c, cp);
        }
        content.addView(h, fullWidth(12));
    }

    void heroLive(TripService s) {
        LinearLayout h = vbox();
        h.setBackground(surface(0xFF06201A, 26).stroke(alpha(WHITE, 0x1F)).blobs(new float[][]{
                {0.0f, 0.0f, 0.95f}, {1.0f, 0.9f, 0.85f}}, alpha(GOOD, 0xB0), alpha(CYAN, 0x70)));
        h.setPadding(dp(22), dp(20), dp(22), dp(20));
        glow(h, GOOD, 18);
        LinearLayout top = hbox();
        top.addView(label("Télémétrie en direct", 0xCCFFFFFF), lp(0, -2, 1f));
        top.addView(liveBadge("Trajet en cours", WHITE, WHITE, 0x33000000));
        h.addView(top);

        LinearLayout mid = hbox();
        LinearLayout left = vbox();
        LinearLayout big = new LinearLayout(this);
        big.setBaselineAligned(true);
        liveDist = number("0,0", 54, WHITE);
        big.addView(liveDist);
        big.addView(text(" km", 20, 0xCCFFFFFF, W_MED));
        left.addView(big);
        LinearLayout stats = new LinearLayout(this);
        LinearLayout c1 = vbox(), c2 = vbox();
        c1.addView(label("Durée", 0xB3FFFFFF));
        liveTime = text("—", 17, WHITE, W_BOLD);
        c1.addView(liveTime);
        c2.addView(label("Moyenne", 0xB3FFFFFF));
        liveAvg = text("—", 17, WHITE, W_BOLD);
        c2.addView(liveAvg);
        stats.addView(c1, lp(-2, -2, 0));
        LinearLayout.LayoutParams c2p = lp(-2, -2, 0);
        c2p.leftMargin = dp(24);
        stats.addView(c2, c2p);
        LinearLayout.LayoutParams sp = fullWidth(0);
        sp.topMargin = dp(10);
        left.addView(stats, sp);
        mid.addView(left, lp(0, -2, 1f));
        liveGauge = new Charts.Gauge(this);
        mid.addView(liveGauge, lp(dp(128), dp(128), 0));
        LinearLayout.LayoutParams mp = fullWidth(6);
        mp.topMargin = dp(8);
        h.addView(mid, mp);

        liveStatus = text("Voiture déconnectée : le trajet se terminera une fois garé", 13, WHITE, W_MED);
        liveStatus.setBackground(surface(0x26FFFFFF, 12).noHighlight());
        liveStatus.setPadding(dp(12), dp(8), dp(12), dp(8));
        liveStatus.setVisibility(View.GONE);
        h.addView(liveStatus, fullWidth(10));

        TextView stop = filledButton("Terminer le trajet", R.drawable.i_stop, surface(WHITE, 18).noHighlight(), 0xFF067A55, new Click() {
            public void run() {
                startService(new Intent(MainActivity.this, TripService.class).setAction(TripService.A_STOP));
                handler.postDelayed(rerender, 500);
            }
        });
        LinearLayout.LayoutParams stp = fullWidth(0);
        stp.topMargin = dp(8);
        h.addView(stop, stp);
        content.addView(h, fullWidth(12));
        refreshLive();
    }

    /** Barre de statut : icône pulsante + bouton Play en relief. */
    void statusCard() {
        boolean configured = Prefs.carConfigured(this);
        boolean onWifi = WifiWatch.onCarWifi(this);
        String ssid = Prefs.carSsid(this), car = Prefs.carName(this);
        LinearLayout c = hbox();
        c.setBackground(surface(SURF, 22));
        c.setPadding(dp(14), dp(14), dp(14), dp(14));
        int col = configured ? BLUE : AMBER;
        FrameLayout ic = new FrameLayout(this);
        ic.addView(pulseDot(col, 44), new FrameLayout.LayoutParams(dp(46), dp(46), Gravity.CENTER));
        View b = bubble(ssid != null ? R.drawable.i_wifi : R.drawable.i_bluetooth, col, 42);
        b.setBackground(surface(0xFF141B2C, 14).stroke(alpha(col, 0x40)));
        ic.addView(b, new FrameLayout.LayoutParams(dp(42), dp(42), Gravity.CENTER));
        LinearLayout.LayoutParams bp = lp(dp(48), dp(48), 0);
        bp.rightMargin = dp(12);
        c.addView(ic, bp);
        boolean standby = TripService.instance != null && TripService.instance.standby;
        boolean parkedWatch = standby && TripService.instance.parked;
        String title = parkedWatch ? "Voiture garée · reprise auto"
                : standby ? "À l'arrêt, contact mis"
                : !configured ? "Voiture non configurée"
                : !Prefs.autoEnabled(this) ? "Détection désactivée"
                : onWifi ? "Connecté à la voiture" : "En attente de la voiture";
        LinearLayout colv = vbox();
        colv.addView(text(title, 15, TXT, W_BOLD));
        String target = ssid != null ? ssid : car;
        TextView sub = text(parkedWatch ? "Le trajet redémarre tout seul si tu repars dans les 15 min"
                : standby ? "Nouveau trajet dès que la voiture repart"
                : configured ? "Démarrage auto · " + target : "Ajoute le Wi-Fi ou le Bluetooth de ta voiture", 13, SUB, W_REG);
        sub.setPadding(0, dp(3), 0, 0);
        colv.addView(sub);
        c.addView(colv, lp(0, -2, 1f));
        FrameLayout go = new FrameLayout(this);
        go.setBackground(pressable(surface(BLUE, 100).gradient(BLUE, CYAN).stroke(alpha(WHITE, 0x33)), 100));
        go.addView(icon(R.drawable.i_play, WHITE), new FrameLayout.LayoutParams(dp(18), dp(18), Gravity.CENTER));
        go.setContentDescription("Démarrer un trajet");
        go.setOnClickListener(new Click() { public void run() { startManual(); } });
        glow(go, BLUE, 10);
        pressScale(go);
        LinearLayout.LayoutParams gp = lp(dp(50), dp(50), 0);
        gp.leftMargin = dp(8);
        c.addView(go, gp);
        content.addView(c, fullWidth(12));
    }

    /** Où est garée la voiture : carte immersive, halo radar, bandeau d'adresse en verre. */
    void parkingCard() {
        final double[] p = Parking.get(this);
        section(content, "Ma voiture");
        LinearLayout c = vbox();
        c.setBackground(surface(SURF, 22));
        c.setClipToOutline(true);
        content.addView(c, fullWidth(12));
        if (p == null) {
            LinearLayout in = vbox();
            in.setPadding(dp(18), dp(16), dp(18), dp(16));
            in.addView(text("Position inconnue", 15, TXT, W_BOLD));
            TextView t = body("Elle s'affichera ici à la fin du prochain trajet. Tu peux aussi l'indiquer maintenant si tu es à côté de ta voiture.", 13, SUB);
            t.setPadding(0, dp(4), 0, dp(12));
            in.addView(t);
            in.addView(tonalButton("Ma voiture est ici", R.drawable.i_pin, BLUE, new Click() { public void run() { parkHere(); } }));
            c.addView(in);
            return;
        }
        FrameLayout mapBox = new FrameLayout(this);
        Charts.Trace map = new Charts.Trace(this, p[0], p[1]);
        map.setOnClickListener(new Click() {
            public void run() {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:" + ll(p) + "?q=" + ll(p) + "(Ma voiture)")));
                } catch (Exception e) { toast("Impossible d'ouvrir la carte"); }
            }
        });
        mapBox.addView(map, new FrameLayout.LayoutParams(-1, dp(230)));
        LinearLayout glass = vbox();
        glass.setBackground(surface(0xD90B0E16, 16).stroke(alpha(WHITE, 0x1A)));
        glass.setPadding(dp(14), dp(10), dp(14), dp(11));
        LinearLayout gt = hbox();
        gt.addView(text("Garée depuis " + Parking.since((long) p[2]), 15, TXT, W_BOLD), lp(0, -2, 1f));
        gt.addView(text(Fmt.time((long) p[2]), 12, SUB, W_MED));
        glass.addView(gt);
        String cached = Parking.cachedAddress(this, p[0], p[1]);
        final TextView addr = text(cached != null ? cached : "Recherche de l'adresse…", 13, SUB, W_REG);
        addr.setSingleLine(true);
        addr.setEllipsize(android.text.TextUtils.TruncateAt.END);
        addr.setPadding(0, dp(3), 0, 0);
        glass.addView(addr);
        FrameLayout.LayoutParams glp = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        glp.leftMargin = dp(10); glp.rightMargin = dp(10); glp.bottomMargin = dp(10);
        mapBox.addView(glass, glp);
        c.addView(mapBox, new LinearLayout.LayoutParams(-1, dp(230)));
        if (cached == null) {
            new Thread(new Runnable() {
                public void run() {
                    final String a = Parking.lookupAddress(MainActivity.this, p[0], p[1]);
                    runOnUiThread(new Runnable() {
                        public void run() { addr.setText(a != null ? a : String.format(java.util.Locale.FRANCE, "%.5f, %.5f", p[0], p[1])); }
                    });
                }
            }).start();
        }
        LinearLayout btns = new LinearLayout(this);
        btns.setPadding(dp(12), dp(12), dp(12), dp(12));
        btns.addView(tonalButton("Y aller", R.drawable.i_route, BLUE, new Click() {
            public void run() {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(
                            "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=" + ll(p))));
                } catch (Exception e) { toast("Impossible d'ouvrir Google Maps"); }
            }
        }), lp(0, -2, 1f));
        space(btns, 10);
        btns.addView(tonalButton("Garée ici", R.drawable.i_pin, SUB, new Click() { public void run() { parkHere(); } }), lp(0, -2, 1f));
        c.addView(btns);
    }

    void parkHere() {
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, RQ_LOC);
            return;
        }
        final android.location.LocationManager lm = getSystemService(android.location.LocationManager.class);
        toast("Recherche de ta position…");
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                lm.getCurrentLocation(android.location.LocationManager.GPS_PROVIDER, null, getMainExecutor(),
                        new java.util.function.Consumer<android.location.Location>() {
                            public void accept(android.location.Location l) { parked(l != null ? l : lastKnown(lm)); }
                        });
            } else {
                parked(lastKnown(lm));
            }
        } catch (SecurityException e) {
            toast("Autorisation de localisation refusée");
        }
    }

    android.location.Location lastKnown(android.location.LocationManager lm) {
        try {
            android.location.Location a = lm.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER);
            android.location.Location b = lm.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER);
            if (a == null) return b;
            if (b == null) return a;
            return a.getTime() >= b.getTime() ? a : b;
        } catch (SecurityException e) {
            return null;
        }
    }

    void parked(android.location.Location l) {
        if (l == null) { toast("Position introuvable : active la localisation et réessaie dehors"); return; }
        Parking.setHere(this, l.getLatitude(), l.getLongitude());
        toast("Position de la voiture enregistrée");
        render();
    }

    void vidangeCard(double odo, List<Db.Maint> maints) {
        if (odo < 0) return;
        for (Db.Maint m : maints) {
            if (!"Vidange".equals(m.type) || m.odo <= 0) continue;
            double interval = Prefs.vidangeInterval(this);
            double done = odo - m.odo, left = interval - done;
            int color = left < 0 ? BAD : left < 1500 ? AMBER : VIOLET;
            LinearLayout c = card(content);
            LinearLayout row = hbox();
            LinearLayout.LayoutParams bp = lp(dp(40), dp(40), 0);
            bp.rightMargin = dp(14);
            row.addView(bubble(R.drawable.i_droplet, color, 40), bp);
            LinearLayout col = vbox();
            col.addView(text("Prochaine vidange", 15, TXT, W_BOLD));
            TextView sub = text(left >= 0 ? "Dans environ " + Fmt.kmInt(left) : "Dépassée de " + Fmt.kmInt(-left), 13, color, W_MED);
            sub.setPadding(0, dp(3), 0, 0);
            col.addView(sub);
            row.addView(col, lp(0, -2, 1f));
            c.addView(row);
            space(c, 14);
            c.addView(progress(done / interval, color));
            space(c, 8);
            c.addView(text("Dernière à " + Fmt.kmInt(m.odo) + " · tous les " + Fmt.kmInt(interval), 12, MUTED, W_REG));
            return;
        }
    }

    List<String> setupIssues() {
        List<String> out = new ArrayList<>();
        if (!Prefs.carConfigured(this)) out.add("voiture");
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION)) out.add("localisation");
        else if (Build.VERSION.SDK_INT >= 29 && !granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) out.add("localisation toujours");
        if (Prefs.carAddress(this) != null && Build.VERSION.SDK_INT >= 31 && !granted(Manifest.permission.BLUETOOTH_CONNECT)) out.add("bluetooth");
        if (!batteryOk()) out.add("batterie");
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
        handler.postDelayed(rerender, 500);
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
        header(content, "Trajets", trips.size() + (trips.size() > 1 ? " trajets · " : " trajet · ") + Fmt.km(total), null);

        LinearLayout actions = new LinearLayout(this);
        actions.addView(primaryButton("Ajouter", R.drawable.i_plus, new Click() { public void run() { manualTripDialog(); } }), lp(0, -2, 1f));
        space(actions, 12);
        actions.addView(tonalButton("Exporter", R.drawable.i_download, TXT, new Click() { public void run() { exportTrips(); } }), lp(0, -2, 1f));
        content.addView(actions, fullWidth(16));

        if (trips.isEmpty()) {
            empty(content, R.drawable.i_route, "Aucun trajet pour l'instant",
                    "Dès que ton téléphone se connecte à ta voiture, le trajet s'enregistre tout seul : distance, durée, vitesse et coût.");
            return;
        }

        double[] wd = new double[7];
        Calendar cal = Calendar.getInstance();
        for (Db.Trip t : trips) {
            cal.setTimeInMillis(t.start);
            wd[(cal.get(Calendar.DAY_OF_WEEK) + 5) % 7] += t.km();
        }
        int best = 0;
        for (int i = 1; i < 7; i++) if (wd[i] > wd[best]) best = i;
        LinearLayout wc = card(content);
        chartTitle(wc, "Par jour de la semaine", "km");
        wc.addView(new Charts.Bars(this, wd, new String[]{"lun", "mar", "mer", "jeu", "ven", "sam", "dim"}, best),
                new LinearLayout.LayoutParams(-1, dp(170)));

        Map<Long, List<Db.Trip>> days = new LinkedHashMap<>();
        int shown = 0;
        for (Db.Trip t : trips) {
            if (++shown > 300) break;
            long d = Calc.dayStart(t.start);
            List<Db.Trip> l = days.get(d);
            if (l == null) { l = new ArrayList<>(); days.put(d, l); }
            l.add(t);
        }
        for (Map.Entry<Long, List<Db.Trip>> e : days.entrySet()) {
            double dk = 0;
            for (Db.Trip t : e.getValue()) dk += t.km();
            section(content, Fmt.date(e.getKey()) + "  ·  " + Fmt.km(dk));
            for (Db.Trip t : e.getValue()) tripCard(t, cpk);
        }
    }

    /** Carte de trajet façon chronologie : horaire, pilules durée / vitesse, distance et coût. */
    void tripCard(Db.Trip t, double cpk) {
        final long id = t.id;
        boolean auto = "auto".equals(t.src);
        LinearLayout c = hbox();
        c.setBackground(pressable(surface(SURF, 20), 20));
        c.setPadding(dp(14), dp(14), dp(16), dp(14));
        LinearLayout left = vbox();
        LinearLayout time = hbox();
        time.setBackground(surface(SURF2, 100).noHighlight());
        time.setPadding(dp(10), dp(6), dp(12), dp(6));
        LinearLayout.LayoutParams tip = lp(dp(14), dp(14), 0);
        tip.rightMargin = dp(6);
        time.addView(icon(R.drawable.i_route, auto ? CYAN : SUB), tip);
        time.addView(text(Fmt.time(t.start) + "  →  " + Fmt.time(t.end), 14, TXT, W_BOLD));
        left.addView(time, new LinearLayout.LayoutParams(-2, -2));
        LinearLayout pills = hbox();
        pills.addView(pill(R.drawable.i_clock, Fmt.dur(t.duration())));
        space(pills, 6);
        pills.addView(pill(R.drawable.i_gauge, Math.round(t.avgKmh()) + " km/h"));
        int sc = Stats.score(t);
        if (sc >= 0) { space(pills, 6); pills.addView(pill(R.drawable.i_droplet, "Éco " + sc)); }
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(-2, -2);
        pp.topMargin = dp(8);
        left.addView(pills, pp);
        if (!auto) {
            TextView src = text(t.src == null ? "manuel" : t.src, 11, MUTED, W_REG);
            src.setPadding(dp(2), dp(6), 0, 0);
            left.addView(src);
        }
        c.addView(left, lp(0, -2, 1f));
        LinearLayout right = vbox();
        right.setGravity(Gravity.END);
        TextView km = number(Fmt.km(t.km()), 20, TXT);
        km.setGravity(Gravity.END);
        right.addView(km);
        TextView eur = text("≈ " + Fmt.eur(t.km() * cpk), 13, AMBER, W_MED);
        eur.setGravity(Gravity.END);
        eur.setPadding(0, dp(4), 0, 0);
        right.addView(eur);
        c.addView(right);
        c.setOnClickListener(new Click() { public void run() { detailId = id; transition(); scroll.scrollTo(0, 0); } });
        pressScale(c);
        content.addView(c, fullWidth(10));
    }

    View pill(int iconRes, String s) {
        LinearLayout p = hbox();
        p.setBackground(surface(alpha(WHITE, 0x08), 100).stroke(alpha(WHITE, 0x10)).noHighlight());
        p.setPadding(dp(8), dp(4), dp(10), dp(4));
        LinearLayout.LayoutParams ip = lp(dp(12), dp(12), 0);
        ip.rightMargin = dp(5);
        p.addView(icon(iconRes, SUB), ip);
        p.addView(text(s, 12, SUB, W_MED));
        return p;
    }

    void renderTripDetail(final long id) {
        final Db db = Db.get(this);
        Db.Trip t = db.trip(id);
        LinearLayout back = hbox();
        back.addView(icon(R.drawable.i_back, BLUE), lp(dp(20), dp(20), 0));
        TextView bt = text("Trajets", 15, BLUE, W_MED);
        bt.setPadding(dp(8), 0, 0, 0);
        back.addView(bt);
        back.setPadding(0, 0, 0, dp(16));
        back.setOnClickListener(new Click() { public void run() { detailId = -1; transition(); } });
        content.addView(back, new LinearLayout.LayoutParams(-2, -2));
        if (t == null) { empty(content, R.drawable.i_info, "Trajet introuvable", "Il a peut-être été supprimé."); return; }

        List<Db.Fuel> fuels = db.fuels();
        double conso = Calc.conso(this, fuels), price = Calc.pricePerL(this, fuels);
        header(content, Fmt.km(t.km()), Fmt.date(t.start) + " · " + Fmt.time(t.start) + " → " + Fmt.time(t.end), null);

        LinearLayout map = vbox();
        map.setBackground(surface(SURF, 22));
        map.setClipToOutline(true);
        final List<double[]> tracePts = TripService.decode(t.pts);
        map.addView(new Charts.Trace(this, tracePts), new LinearLayout.LayoutParams(-1, dp(320)));
        content.addView(map, fullWidth(12));
        if (tracePts.size() >= 2) {
            content.addView(tonalButton("Ouvrir dans Google Maps", R.drawable.i_pin, BLUE, new Click() {
                public void run() { openInMaps(tracePts); }
            }), fullWidth(12));
        }

        LinearLayout r1 = tilesRow(content);
        tile(r1, R.drawable.i_clock, BLUE, "Durée", Fmt.dur(t.duration()), t.moving > 0 ? Fmt.dur(t.moving) + " en mouvement" : null);
        tile(r1, R.drawable.i_gauge, CYAN, "Vitesse moy.", Math.round(t.avgKmh()) + " km/h", t.vmax > 0 ? "max " + Math.round(t.vmax) + " km/h" : null);
        LinearLayout r2 = tilesRow(content);
        tile(r2, R.drawable.i_droplet, BLUE, "Carburant", Fmt.num(t.km() * conso / 100, 2) + " L", Fmt.num(conso, 1) + " L/100");
        tile(r2, R.drawable.i_euro, AMBER, "Coût estimé", Fmt.eur(t.km() * conso / 100 * price), Fmt.num(price, 3) + " €/L");
        int sc = Stats.score(t);
        if (sc >= 0) {
            LinearLayout r3 = tilesRow(content);
            tile(r3, R.drawable.i_trophy, GOOD, "Éco-conduite", sc + " / 100", Stats.ecoLabel(sc));
            tile(r3, R.drawable.i_info, VIOLET, "Brusques", t.acc + " accél. · " + t.brk + " frein.",
                    t.fast > 60000 ? Fmt.dur(t.fast) + " > 135 km/h" : null);
        }

        LinearLayout g = group(content);
        listRow(g, R.drawable.i_pin, GOOD, "Départ", null, Fmt.time(t.start), null, TXT, null);
        listRow(g, R.drawable.i_pin, VIOLET, "Arrivée", null, Fmt.time(t.end), null, TXT, null);
        boolean auto = "auto".equals(t.src);
        listRow(g, auto ? R.drawable.i_wifi : R.drawable.i_edit, auto ? BLUE : SUB, "Enregistrement",
                t.info, auto ? "Automatique" : Fmt.cap(t.src == null ? "manuel" : t.src), null, TXT, null);

        space(content, 4);
        content.addView(tonalButton("Supprimer ce trajet", R.drawable.i_trash, BAD, new Click() {
            public void run() {
                confirmDelete("Supprimer ce trajet ?", "Il disparaîtra de l'historique et des statistiques.", new Runnable() {
                    public void run() { db.deleteTrip(id); detailId = -1; transition(); }
                });
            }
        }), fullWidth(0));
    }

    void openInMaps(List<double[]> p) {
        StringBuilder u = new StringBuilder("https://www.google.com/maps/dir/?api=1&travelmode=driving");
        u.append("&origin=").append(ll(p.get(0))).append("&destination=").append(ll(p.get(p.size() - 1)));
        int nWay = Math.min(8, p.size() - 2);
        if (nWay > 0) {
            u.append("&waypoints=");
            for (int i = 1; i <= nWay; i++) {
                if (i > 1) u.append("%7C");
                u.append(ll(p.get((int) ((long) i * (p.size() - 1) / (nWay + 1)))));
            }
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u.toString()))); }
        catch (Exception e) { toast("Impossible d'ouvrir la carte"); }
    }

    static String ll(double[] p) { return String.format(java.util.Locale.US, "%.5f,%.5f", p[0], p[1]); }

    void manualTripDialog() {
        LinearLayout f = vbox();
        final long[] date = {System.currentTimeMillis()};
        dateField(f, "Date", date);
        LinearLayout[] cols = twoColumns(f);
        final EditText km = field(cols[0], "Distance", "", "0", true, "km");
        final EditText min = field(cols[1], "Durée", "", "0", true, "min");
        sheet("Ajouter un trajet", f, "Enregistrer", false, new Save() {
            public boolean run() {
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
            }
        }, null, null);
    }

    void exportTrips() {
        List<Db.Trip> trips = Db.get(this).trips(0, Long.MAX_VALUE, false);
        double cpk = Calc.costPerKm(this, Db.get(this).fuels());
        StringBuilder sb = new StringBuilder("date;depart;arrivee;distance_km;duree_min;vitesse_moy_kmh;vitesse_max_kmh;cout_estime_eur;score_eco;source\n");
        for (int i = trips.size() - 1; i >= 0; i--) {
            Db.Trip t = trips.get(i);
            int sc = Stats.score(t);
            sb.append(Fmt.dateShort(t.start)).append(';').append(Fmt.time(t.start)).append(';').append(Fmt.time(t.end)).append(';')
                    .append(clean(Fmt.num(t.km(), 2))).append(';')
                    .append(Math.round(t.duration() / 60000.0)).append(';')
                    .append(Math.round(t.avgKmh())).append(';').append(Math.round(t.vmax)).append(';')
                    .append(clean(Fmt.num(t.km() * cpk, 2))).append(';')
                    .append(sc >= 0 ? String.valueOf(sc) : "").append(';')
                    .append(t.src).append('\n');
        }
        share("Trajets – Trajo", sb.toString());
    }

    // =====================================================================
    // Stats
    // =====================================================================

    void renderStats() {
        Db db = Db.get(this);
        long now = System.currentTimeMillis();
        List<Db.Trip> all = db.trips(0, Long.MAX_VALUE, false);
        header(content, "Stats", "Analyse de ta conduite", null);
        if (all.isEmpty()) {
            empty(content, R.drawable.i_chart, "Pas encore de statistiques",
                    "Fais quelques trajets : score d'éco-conduite, semaines, heures, trajets favoris et carte de chaleur apparaîtront ici.");
            return;
        }

        // --- Éco-conduite (30 jours) ---
        Stats.Eco eco = Stats.eco(all, now - 30L * 86_400_000L);
        int ecoColor = eco.score < 0 ? MUTED : eco.score >= 70 ? GOOD : eco.score >= 50 ? AMBER : BAD;
        LinearLayout ec = vbox();
        ec.setBackground(surface(SURF, 22).blobs(new float[][]{{0.15f, 0.2f, 0.7f}}, alpha(ecoColor, 0x2A)));
        ec.setPadding(dp(16), dp(16), dp(18), dp(16));
        content.addView(ec, fullWidth(12));
        LinearLayout er = hbox();
        er.addView(new Charts.Ring(this, eco.score, "sur 100", ecoColor), lp(dp(140), dp(140), 0));
        LinearLayout ecol = vbox();
        ecol.setPadding(dp(8), 0, 0, 0);
        ecol.addView(label("Éco-conduite · 30 jours", SUB));
        TextView el = text(eco.score >= 0 ? Stats.ecoLabel(eco.score) : "En attente", 20, TXT, W_BOLD);
        el.setPadding(0, dp(6), 0, dp(8));
        ecol.addView(el);
        if (eco.trips > 0) {
            ecol.addView(miniStat("Accélérations brusques", String.valueOf(eco.acc)));
            ecol.addView(miniStat("Freinages brusques", String.valueOf(eco.brk)));
            ecol.addView(miniStat("Au-dessus de 135 km/h", Fmt.dur(eco.fast)));
        } else {
            ecol.addView(text("Mesuré à partir des prochains trajets", 13, SUB, W_REG));
        }
        er.addView(ecol, lp(0, -2, 1f));
        ec.addView(er);
        LinearLayout tipBox = hbox();
        tipBox.setBackground(surface(alpha(WHITE, 0x08), 14).stroke(alpha(WHITE, 0x10)));
        tipBox.setPadding(dp(12), dp(10), dp(12), dp(10));
        LinearLayout.LayoutParams tip = lp(dp(18), dp(18), 0);
        tip.rightMargin = dp(10);
        tipBox.addView(icon(R.drawable.i_info, ecoColor == MUTED ? BLUE : ecoColor), tip);
        tipBox.addView(body(Stats.ecoTip(eco), 13, TXT), lp(0, -2, 1f));
        LinearLayout.LayoutParams tbp = fullWidth(0);
        tbp.topMargin = dp(12);
        ec.addView(tipBox, tbp);

        // --- Semaine par semaine ---
        double[] wk = new double[8];
        String[] wl = new String[8];
        for (int i = 0; i < 8; i++) {
            long a = Stats.weekStart(now, i - 7), b = Stats.weekStart(now, i - 6);
            wk[i] = db.kmBetween(a, b);
            wl[i] = Fmt.dayMonth(a).replace(".", "");
        }
        LinearLayout wc = card(content);
        chartTitle(wc, "Semaine par semaine", "8 semaines");
        LinearLayout cmp = hbox();
        cmp.addView(kpi("Cette semaine", Fmt.km(wk[7]), BLUE), lp(0, -2, 1f));
        cmp.addView(kpi("Semaine dernière", Fmt.km(wk[6]), SUB), lp(0, -2, 1f));
        if (wk[6] > 0.5) {
            double pct = (wk[7] - wk[6]) / wk[6] * 100;
            cmp.addView(chip((pct >= 0 ? "▲ " : "▼ ") + Math.round(Math.abs(pct)) + " %", pct >= 0 ? CYAN : SUB));
        }
        wc.addView(cmp, fullWidth(6));
        wc.addView(new Charts.Bars(this, wk, wl, 7), new LinearLayout.LayoutParams(-1, dp(170)));

        // --- Heures de conduite ---
        double[] hrs = Stats.byHour(all);
        int peak = 0;
        for (int i = 1; i < 24; i++) if (hrs[i] > hrs[peak]) peak = i;
        String[] hl = new String[24];
        for (int i = 0; i < 24; i++) hl[i] = i % 6 == 0 ? i + " h" : "";
        LinearLayout hc = card(content);
        chartTitle(hc, "Heures de conduite", "km");
        hc.addView(text("Tu roules surtout entre " + peak + " h et " + (peak + 1) % 24 + " h", 13, SUB, W_REG), fullWidth(4));
        hc.addView(new Charts.Bars(this, hrs, hl, peak), new LinearLayout.LayoutParams(-1, dp(160)));

        // --- Trajets favoris ---
        List<Db.Trip> withPts = db.trips(0, Long.MAX_VALUE, true);
        List<Stats.Route> routes = Stats.routes(withPts);
        section(content, "Trajets favoris");
        if (routes.isEmpty()) {
            LinearLayout c = card(content);
            c.addView(body("Les trajets que tu fais au moins 2 fois (ex. : maison → travail) apparaîtront ici, avec leur durée et distance moyennes.", 13, SUB));
        } else {
            LinearLayout g = group(content);
            int n = 0;
            for (final Stats.Route r : routes) {
                if (++n > 6) break;
                final String an = placeLabel(r.a), bn = placeLabel(r.b);
                listRow(g, R.drawable.i_route, CYAN, an + "  →  " + bn,
                        r.count + " trajets · " + Fmt.dur(r.dur / r.count) + " en moyenne",
                        Fmt.km(r.km / r.count), "moyenne", TXT, new Click() {
                            public void run() { renamePlaces(r, an, bn); }
                        });
            }
            TextView hint = text("Touche un trajet pour nommer les lieux (Maison, Travail…).", 12, MUTED, W_REG);
            hint.setPadding(dp(4), 0, 0, dp(4));
            content.addView(hint);
        }

        // --- Carte de chaleur ---
        List<List<double[]>> paths = new ArrayList<>();
        for (Db.Trip t : withPts) {
            List<double[]> p = TripService.decode(t.pts);
            if (p.size() >= 2) paths.add(p);
        }
        if (!paths.isEmpty()) {
            section(content, "Carte de chaleur");
            LinearLayout mc = vbox();
            mc.setBackground(surface(SURF, 22));
            mc.setClipToOutline(true);
            mc.addView(new Charts.Trace(this, paths, true), new LinearLayout.LayoutParams(-1, dp(320)));
            TextView cap = text(paths.size() + " trajets superposés · plus c'est lumineux, plus tu y passes souvent", 12, SUB, W_REG);
            cap.setPadding(dp(16), dp(12), dp(16), dp(14));
            mc.addView(cap);
            content.addView(mc, fullWidth(12));
        }

        // --- Bilans mensuels ---
        section(content, "Bilans mensuels");
        LinearLayout mg = group(content);
        int shown = 0;
        for (int i = 0; i < 12 && shown < 6; i++) {
            Stats.Month m = Stats.month(this, Calc.monthStart(now, -i));
            if (m.trips == 0 && m.fuel == 0 && m.maint == 0) continue;
            shown++;
            listRow(mg, R.drawable.i_calendar, i == 0 ? BLUE : VIOLET, Fmt.month(m.start) + (i == 0 ? " (en cours)" : ""),
                    m.trips + (m.trips > 1 ? " trajets" : " trajet") + " · " + Fmt.dur(m.time) + " au volant",
                    Fmt.km(m.km), Fmt.eur(m.fuel + m.maint) + " dépensés", TXT, null);
        }
        if (shown == 0) listRow(mg, R.drawable.i_calendar, SUB, "Aucun mois complet pour l'instant", null, null, null, TXT, null);
        TextView note = text("Le bilan du mois précédent arrive aussi en notification le 1er du mois.", 12, MUTED, W_REG);
        note.setPadding(dp(4), 0, 0, 0);
        content.addView(note);
    }

    View miniStat(String label, String value) {
        LinearLayout r = hbox();
        r.setPadding(0, dp(3), 0, dp(3));
        r.addView(text(label, 13, SUB, W_REG), lp(0, -2, 1f));
        r.addView(text(value, 13, TXT, W_BOLD));
        return r;
    }

    View kpi(String label, String value, int color) {
        LinearLayout c = vbox();
        c.addView(label(label, SUB));
        TextView v = number(value, 20, color == SUB ? TXT : color);
        v.setPadding(0, dp(4), 0, 0);
        c.addView(v);
        return c;
    }

    /** Nom d'un lieu de trajet favori ; lance la recherche d'adresse si besoin. */
    String placeLabel(final Stats.Place p) {
        String n = Stats.placeName(this, p);
        if (n != null) return n;
        final String key = Parking.key(p.lat, p.lon);
        if (geocoding.add(key)) {
            new Thread(new Runnable() {
                public void run() {
                    String a = Parking.lookupAddress(MainActivity.this, p.lat, p.lon);
                    if (a != null) runOnUiThread(new Runnable() { public void run() { if (tab == 2) render(); } });
                }
            }).start();
        }
        return "Lieu n°" + (p.idx + 1);
    }

    void renamePlaces(final Stats.Route r, String an, String bn) {
        LinearLayout f = vbox();
        f.addView(body("Donne un nom aux deux lieux de ce trajet. Ils seront reconnus dans tous tes trajets.", 14, SUB), fullWidth(16));
        final EditText a = field(f, "Départ", an.startsWith("Lieu n°") ? "" : an, "Ex. : Maison", false, null);
        final EditText b = field(f, "Arrivée", bn.startsWith("Lieu n°") ? "" : bn, "Ex. : Travail", false, null);
        sheet("Nommer les lieux", f, "Enregistrer", false, new Save() {
            public boolean run() {
                Stats.nameplace(MainActivity.this, r.a.lat, r.a.lon, a.getText().toString());
                Stats.nameplace(MainActivity.this, r.b.lat, r.b.lon, b.getText().toString());
                render();
                return true;
            }
        }, null, null);
    }

    // =====================================================================
    // Dépenses (Pleins + Entretien)
    // =====================================================================

    void renderExpenses() {
        Db db = Db.get(this);
        long ys = Calc.yearStart(System.currentTimeMillis());
        double fuel = 0, maint = 0;
        for (Db.Fuel f : db.fuels()) if (f.date >= ys) fuel += f.total;
        for (Db.Maint m : db.maints()) if (m.date >= ys) maint += m.cost;
        header(content, "Dépenses", "Cette année : " + Fmt.eur(fuel + maint), null);
        content.addView(segmented(new String[]{"Pleins", "Entretien"}, expTab, new SegCb() {
            public void select(int i) { if (i != expTab) { expTab = i; transition(); } }
        }), fullWidth(16));
        if (expTab == 0) renderFuel(); else renderMaint();
    }

    void renderFuel() {
        Db db = Db.get(this);
        List<Db.Fuel> fuels = db.fuels();
        long ys = Calc.yearStart(System.currentTimeMillis());
        double yEur = 0, yL = 0;
        for (Db.Fuel f : fuels) if (f.date >= ys) { yEur += f.total; yL += f.liters; }
        content.addView(primaryButton("Ajouter un plein", R.drawable.i_plus, new Click() { public void run() { fuelDialog(null); } }), fullWidth(16));

        if (fuels.isEmpty()) {
            empty(content, R.drawable.i_fuel, "Aucun plein pour l'instant",
                    "À chaque passage à la pompe, note le montant, les litres et le kilométrage : l'appli calcule ta vraie consommation et le coût de chaque trajet.");
            return;
        }

        double real = Calc.realConso(fuels);
        LinearLayout r1 = tilesRow(content);
        tile(r1, R.drawable.i_euro, AMBER, "Cette année", Fmt.eur(yEur), fuels.size() + (fuels.size() > 1 ? " pleins" : " plein"));
        tile(r1, R.drawable.i_droplet, BLUE, "Litres", Fmt.num(yL, 1) + " L", null);
        LinearLayout r2 = tilesRow(content);
        tile(r2, R.drawable.i_fuel, AMBER, "Prix moyen", yL > 0 ? Fmt.num(yEur / yL, 3) + " €/L" : "—", null);
        tile(r2, R.drawable.i_gauge, GOOD, "Consommation", real > 0 ? Fmt.num(real, 1) + " L/100" : "—", real > 0 ? "réelle" : "2 pleins complets requis");

        Map<Long, double[]> seg = Calc.segments(fuels);
        List<Double> cv = new ArrayList<>();
        List<String> cl = new ArrayList<>();
        for (int i = fuels.size() - 1; i >= 0; i--) {
            double[] sgm = seg.get(fuels.get(i).id);
            if (sgm != null) { cv.add(sgm[0] / sgm[1] * 100); cl.add(Fmt.dayMonth(fuels.get(i).date)); }
        }
        if (cv.size() >= 2) {
            LinearLayout c = card(content);
            chartTitle(c, "Consommation réelle", "L/100 km");
            c.addView(new Charts.Line(this, toArray(cv, 12), toLabels(cl, 12), 1), new LinearLayout.LayoutParams(-1, dp(170)));
        } else if (fuels.size() >= 2) {
            List<Double> pv = new ArrayList<>();
            List<String> pl = new ArrayList<>();
            for (int i = fuels.size() - 1; i >= 0; i--) { pv.add(fuels.get(i).pricePerL()); pl.add(Fmt.dayMonth(fuels.get(i).date)); }
            LinearLayout c = card(content);
            chartTitle(c, "Prix au litre", "€/L");
            c.addView(new Charts.Line(this, toArray(pv, 12), toLabels(pl, 12), 3), new LinearLayout.LayoutParams(-1, dp(170)));
        }

        section(content, "Historique");
        LinearLayout g = group(content);
        for (final Db.Fuel f : fuels) {
            double[] sgm = seg.get(f.id);
            String sub = Fmt.num(f.liters, 2) + " L · " + Fmt.num(f.pricePerL(), 3) + " €/L" + (f.full ? "" : " · partiel")
                    + (f.station.isEmpty() ? "" : " · " + f.station);
            String vs = sgm != null ? Fmt.num(sgm[0] / sgm[1] * 100, 1) + " L/100" : (f.odo > 0 ? Fmt.kmInt(f.odo) : null);
            listRow(g, R.drawable.i_fuel, AMBER, Fmt.dateMed(f.date), sub, Fmt.eur(f.total), vs, TXT,
                    new Click() { public void run() { fuelDialog(f); } });
        }
    }

    static double[] toArray(List<Double> l, int lastN) {
        int from = Math.max(0, l.size() - lastN);
        double[] a = new double[l.size() - from];
        for (int i = from; i < l.size(); i++) a[i - from] = l.get(i);
        return a;
    }

    static String[] toLabels(List<String> l, int lastN) {
        int from = Math.max(0, l.size() - lastN);
        return l.subList(from, l.size()).toArray(new String[0]);
    }

    void fuelDialog(Db.Fuel existing) {
        final Db.Fuel f = existing != null ? existing : new Db.Fuel();
        if (existing == null) f.date = System.currentTimeMillis();
        final Db db = Db.get(this);
        LinearLayout form = vbox();
        final long[] date = {f.date};
        dateField(form, "Date", date);
        double est = Calc.estimatedOdo(this, db.fuels(), db.maints());
        final EditText odo = field(form, "Kilométrage au compteur", f.odo > 0 ? Fmt.num(f.odo, 0) : "",
                existing == null && est > 0 ? "≈ " + Fmt.num(est, 0) : "", true, "km");
        LinearLayout[] cols = twoColumns(form);
        final EditText liters = field(cols[0], "Litres", f.liters > 0 ? Fmt.num(f.liters, 2) : "", "0,00", true, "L");
        final EditText total = field(cols[1], "Montant", f.total > 0 ? Fmt.num(f.total, 2) : "", "0,00", true, "€");
        final TextView ppl = chip("", AMBER);
        ppl.setVisibility(View.GONE);
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(-2, -2);
        pp.bottomMargin = dp(16);
        form.addView(ppl, pp);
        TextWatcher w = new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            public void onTextChanged(CharSequence s, int a, int b, int c) {}
            public void afterTextChanged(Editable e) {
                double l = Fmt.parse(liters.getText().toString()), t = Fmt.parse(total.getText().toString());
                boolean ok = l > 0 && t > 0;
                ppl.setVisibility(ok ? View.VISIBLE : View.GONE);
                if (ok) ppl.setText("Prix au litre : " + Fmt.num(t / l, 3) + " €");
            }
        };
        liters.addTextChangedListener(w);
        total.addTextChangedListener(w);
        w.afterTextChanged(null);

        LinearLayout tg = vbox();
        tg.setBackground(surface(SURF2, 16));
        final Switch full = switchRow(tg, R.drawable.i_fuel, AMBER, "Plein complet", "Réservoir rempli jusqu'au déclic", f.full);
        form.addView(tg, fullWidth(16));
        final EditText station = field(form, "Station (facultatif)", f.station, "Ex. : Total Access", false, null);

        sheet(existing == null ? "Nouveau plein" : "Modifier le plein", form, "Enregistrer", false, new Save() {
            public boolean run() {
                double l = Fmt.parse(liters.getText().toString()), t = Fmt.parse(total.getText().toString());
                double o = Fmt.parse(odo.getText().toString());
                if (!(l > 0)) { toast("Indique le nombre de litres"); return false; }
                if (!(t > 0)) { toast("Indique le montant payé"); return false; }
                f.date = date[0]; f.liters = l; f.total = t; f.odo = o > 0 ? o : -1;
                f.full = full.isChecked(); f.station = station.getText().toString().trim();
                db.saveFuel(f);
                render();
                return true;
            }
        }, existing == null ? null : "Supprimer ce plein", new Runnable() {
            public void run() {
                confirmDelete("Supprimer ce plein ?", "Les calculs de consommation seront mis à jour.", new Runnable() {
                    public void run() { db.deleteFuel(f.id); render(); }
                });
            }
        });
    }

    static int maintIcon(String type) {
        if ("Vidange".equals(type) || "Lavage".equals(type)) return R.drawable.i_droplet;
        if ("Pneus".equals(type) || "Freins".equals(type)) return R.drawable.i_car;
        if ("Contrôle technique".equals(type) || "Assurance".equals(type)) return R.drawable.i_shield;
        if ("Batterie".equals(type)) return R.drawable.i_battery;
        if ("Péage / parking".equals(type)) return R.drawable.i_route;
        if ("Autre".equals(type)) return R.drawable.i_info;
        return R.drawable.i_wrench;
    }

    static int maintColor(String type) {
        if ("Péage / parking".equals(type) || "Lavage".equals(type)) return BLUE;
        if ("Contrôle technique".equals(type) || "Assurance".equals(type)) return GOOD;
        return VIOLET;
    }

    void renderMaint() {
        Db db = Db.get(this);
        List<Db.Maint> list = db.maints();
        double sum = 0;
        int n = 0;
        long ys = Calc.yearStart(System.currentTimeMillis());
        for (Db.Maint m : list) if (m.date >= ys) { sum += m.cost; n++; }
        content.addView(primaryButton("Ajouter une dépense", R.drawable.i_plus, new Click() { public void run() { maintDialog(null); } }), fullWidth(16));

        vidangeCard(Calc.estimatedOdo(this, db.fuels(), list), list);

        if (list.isEmpty()) {
            empty(content, R.drawable.i_wrench, "Rien pour l'instant",
                    "Vidange, révision, pneus, contrôle technique, assurance, péages… Note-les pour connaître le vrai coût de ta voiture. Une vidange avec kilométrage active le rappel de la suivante.");
            return;
        }
        LinearLayout r1 = tilesRow(content);
        tile(r1, R.drawable.i_wrench, VIOLET, "Cette année", Fmt.eur(sum), n + (n > 1 ? " dépenses" : " dépense"));
        tile(r1, R.drawable.i_calendar, VIOLET, "Dernière", Fmt.dateMed(list.get(0).date), list.get(0).type);
        section(content, "Historique");
        LinearLayout g = group(content);
        for (final Db.Maint m : list) {
            String sub = Fmt.dateMed(m.date) + (m.odo > 0 ? " · " + Fmt.kmInt(m.odo) : "") + (m.note.isEmpty() ? "" : " · " + m.note);
            listRow(g, maintIcon(m.type), maintColor(m.type), m.type, sub, Fmt.eur(m.cost), null, TXT,
                    new Click() { public void run() { maintDialog(m); } });
        }
    }

    void maintDialog(Db.Maint existing) {
        final Db.Maint m = existing != null ? existing : new Db.Maint();
        if (existing == null) m.date = System.currentTimeMillis();
        final Db db = Db.get(this);
        LinearLayout form = vbox();

        TextView tl = label("Type", SUB);
        tl.setPadding(dp(2), 0, 0, dp(8));
        form.addView(tl);
        final int[] sel = {0};
        for (int i = 0; i < MAINT_TYPES.length; i++) if (MAINT_TYPES[i].equals(m.type)) sel[0] = i;
        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setHorizontalScrollBarEnabled(false);
        final LinearLayout chips = new LinearLayout(this);
        final TextView[] cv = new TextView[MAINT_TYPES.length];
        for (int i = 0; i < MAINT_TYPES.length; i++) {
            final int k = i;
            cv[i] = text(MAINT_TYPES[i], 14, SUB, W_MED);
            cv[i].setPadding(dp(14), dp(9), dp(14), dp(9));
            cv[i].setOnClickListener(new Click() {
                public void run() { sel[0] = k; styleChips(cv, sel[0]); }
            });
            pressScale(cv[i]);
            LinearLayout.LayoutParams p = lp(-2, -2, 0);
            p.rightMargin = dp(8);
            chips.addView(cv[i], p);
        }
        styleChips(cv, sel[0]);
        hs.addView(chips);
        form.addView(hs, fullWidth(16));

        final long[] date = {m.date};
        dateField(form, "Date", date);
        LinearLayout[] cols = twoColumns(form);
        final EditText cost = field(cols[0], "Montant", m.cost > 0 ? Fmt.num(m.cost, 2) : "", "0,00", true, "€");
        double est = Calc.estimatedOdo(this, db.fuels(), db.maints());
        final EditText odo = field(cols[1], "Kilométrage", m.odo > 0 ? Fmt.num(m.odo, 0) : "",
                existing == null && est > 0 ? "≈ " + Fmt.num(est, 0) : "", true, "km");
        final EditText note = field(form, "Note (facultatif)", m.note, "Garage, détails…", false, null);

        sheet(existing == null ? "Nouvelle dépense" : "Modifier la dépense", form, "Enregistrer", false, new Save() {
            public boolean run() {
                double c = Fmt.parse(cost.getText().toString()), o = Fmt.parse(odo.getText().toString());
                m.type = MAINT_TYPES[sel[0]];
                m.date = date[0]; m.cost = c > 0 ? c : 0; m.odo = o > 0 ? o : -1;
                m.note = note.getText().toString().trim();
                db.saveMaint(m);
                render();
                return true;
            }
        }, existing == null ? null : "Supprimer", new Runnable() {
            public void run() {
                confirmDelete("Supprimer cette dépense ?", "Elle sera retirée de l'historique et des totaux.", new Runnable() {
                    public void run() { db.deleteMaint(m.id); render(); }
                });
            }
        });
    }

    void styleChips(TextView[] cv, int sel) {
        for (int i = 0; i < cv.length; i++) {
            boolean on = i == sel;
            cv[i].setTextColor(on ? WHITE : SUB);
            cv[i].setBackground(on ? surface(VIOLET, 100).gradient(VIOLET, 0xFF7C3AED).stroke(alpha(WHITE, 0x26))
                    : surface(SURF2, 100).noHighlight());
        }
    }

    // =====================================================================
    // Réglages
    // =====================================================================

    void renderSettings() {
        header(content, "Réglages", "Détection, véhicule et autorisations", null);

        // --- Carte récapitulative du véhicule ---
        String ssid = Prefs.carSsid(this);
        String car = Prefs.carName(this);
        boolean onWifi = WifiWatch.onCarWifi(this);
        Db db = Db.get(this);
        double est = Calc.estimatedOdo(this, db.fuels(), db.maints());
        LinearLayout vc = vbox();
        vc.setBackground(surface(0xFF0E1322, 24).stroke(alpha(WHITE, 0x1A)).blobs(new float[][]{{1f, 0f, 0.9f}, {0f, 1f, 0.7f}},
                alpha(BLUE, 0x55), alpha(CYAN, 0x30)));
        vc.setPadding(dp(18), dp(18), dp(18), dp(18));
        glow(vc, BLUE, 10);
        LinearLayout vt = hbox();
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        logo.setBackground(surface(0xFF171920, 14));
        logo.setClipToOutline(true);
        LinearLayout.LayoutParams llp = lp(dp(52), dp(52), 0);
        llp.rightMargin = dp(14);
        vt.addView(logo, llp);
        LinearLayout vcol = vbox();
        vcol.addView(label("Véhicule connecté", 0xB3FFFFFF));
        TextView vn = number(est >= 0 ? Fmt.kmInt(est) : "Ma voiture", 22, WHITE);
        vn.setPadding(0, dp(4), 0, 0);
        vcol.addView(vn);
        vt.addView(vcol, lp(0, -2, 1f));
        if (Prefs.autoEnabled(this) && Prefs.carConfigured(this)) vt.addView(liveBadge("Auto", GOOD, WHITE, 0x33000000));
        vc.addView(vt);
        LinearLayout chipsRow = hbox();
        chipsRow.addView(linkChip(R.drawable.i_wifi, ssid == null ? "Wi-Fi non configuré" : ssid, ssid != null && onWifi));
        space(chipsRow, 8);
        chipsRow.addView(linkChip(R.drawable.i_bluetooth, car == null ? "Bluetooth facultatif" : car, false));
        HorizontalScrollView chs = new HorizontalScrollView(this);
        chs.setHorizontalScrollBarEnabled(false);
        chs.addView(chipsRow);
        LinearLayout.LayoutParams chp = fullWidth(0);
        chp.topMargin = dp(14);
        vc.addView(chs, chp);
        content.addView(vc, fullWidth(12));

        // --- Détection ---
        section(content, "Détection automatique");
        LinearLayout g = group(content);
        Switch auto = switchRow(g, R.drawable.i_car, BLUE, "Enregistrement automatique", "Démarre et termine les trajets tout seul", Prefs.autoEnabled(this));
        auto.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            public void onCheckedChanged(CompoundButton b, boolean on) {
                Prefs.get(MainActivity.this).edit().putBoolean("auto", on).apply();
            }
        });
        listRow(g, R.drawable.i_wifi, BLUE, "Wi-Fi de la voiture", ssid == null ? "Non configuré" : ssid,
                ssid == null ? null : (onWifi ? "Connecté" : null), null, GOOD,
                new Click() { public void run() { wifiSheet(); } });
        listRow(g, R.drawable.i_bluetooth, BLUE, "Bluetooth de la voiture", car == null ? "Facultatif" : car, null, null, TXT,
                new Click() { public void run() { pickCar(); } });
        TextView note = body("Le trajet démarre dès que le téléphone se connecte au Wi-Fi ou au Bluetooth de la voiture, et se termine une fois garé.", 12, MUTED);
        note.setPadding(dp(4), 0, dp(4), dp(4));
        content.addView(note);

        // --- Autorisations ---
        section(content, "Autorisations");
        LinearLayout pg = group(content);
        final boolean loc = granted(Manifest.permission.ACCESS_FINE_LOCATION);
        permRow(pg, R.drawable.i_pin, "Localisation précise", "Pour mesurer les trajets", loc, new Click() {
            public void run() {
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, RQ_LOC);
            }
        });
        if (Build.VERSION.SDK_INT >= 29)
            permRow(pg, R.drawable.i_pin, "Localisation en arrière-plan", "Choisir « Toujours autoriser »",
                    granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION), new Click() {
                        public void run() {
                            if (!loc) { toast("Autorise d'abord la localisation précise"); return; }
                            toast("Choisis « Toujours autoriser »");
                            requestPermissions(new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, RQ_BG);
                        }
                    });
        if (Build.VERSION.SDK_INT >= 31)
            permRow(pg, R.drawable.i_bluetooth, "Appareils à proximité", "Pour reconnaître le Bluetooth de la voiture",
                    granted(Manifest.permission.BLUETOOTH_CONNECT), new Click() {
                        public void run() { requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, RQ_BT); }
                    });
        if (Build.VERSION.SDK_INT >= 33)
            permRow(pg, R.drawable.i_bell, "Notifications", "Trajet en cours, résumés et bilans",
                    granted(Manifest.permission.POST_NOTIFICATIONS), new Click() {
                        public void run() { requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, RQ_NOTIF); }
                    });
        permRow(pg, R.drawable.i_battery, "Batterie non restreinte", "Pour qu'Android ne bloque pas la détection", batteryOk(), new Click() {
            public void run() {
                try {
                    startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
                } catch (Exception e) {
                    openAppSettings();
                }
            }
        });
        listRow(pg, R.drawable.i_sliders, SUB, "Paramètres Android de l'appli", null, null, null, TXT,
                new Click() { public void run() { openAppSettings(); } });

        // --- Véhicule ---
        section(content, "Véhicule");
        LinearLayout vg = group(content);
        double ref = Prefs.odoRef(this);
        listRow(vg, R.drawable.i_gauge, CYAN, "Kilométrage du compteur",
                ref > 0 ? "Relevé du " + Fmt.dateShort(Prefs.odoRefDate(this)) + " : " + Fmt.kmInt(ref) : "À renseigner",
                est >= 0 ? Fmt.kmInt(est) : null, null, TXT, new Click() {
                    public void run() {
                        numberSheet("Kilométrage du compteur", "Lis le kilométrage total sur le tableau de bord de ta voiture.", "km", "", new NumCb() {
                            public void set(double v) {
                                Prefs.get(MainActivity.this).edit().putFloat("odo_ref", (float) v).putLong("odo_ref_date", System.currentTimeMillis()).apply();
                            }
                        });
                    }
                });
        listRow(vg, R.drawable.i_clock, BLUE, "Couper le trajet après un arrêt de", "Contact mis, voiture immobile",
                Fmt.num(Prefs.pauseMinutes(this), 0) + " min", null, TXT, new Click() {
                    public void run() {
                        numberSheet("Arrêt qui coupe un trajet", "Si la voiture reste immobile, contact mis, plus longtemps que ça, le trajet est enregistré et un nouveau démarre quand elle repart. Les feux rouges et bouchons ne coupent pas le trajet en dessous de cette durée.", "min",
                                Fmt.num(Prefs.pauseMinutes(MainActivity.this), 0), new NumCb() {
                                    public void set(double v) { Prefs.get(MainActivity.this).edit().putFloat("pause_min", (float) Math.max(1, v)).apply(); }
                                });
                    }
                });
        listRow(vg, R.drawable.i_droplet, BLUE, "Consommation par défaut", "Utilisée avant 2 pleins complets",
                Fmt.num(Prefs.defaultConso(this), 1) + " L/100", null, TXT, new Click() {
                    public void run() {
                        numberSheet("Consommation par défaut", "Une citadine essence consomme en général entre 5 et 6,5 L/100 km.", "L/100",
                                Fmt.num(Prefs.defaultConso(MainActivity.this), 1), new NumCb() {
                                    public void set(double v) { Prefs.get(MainActivity.this).edit().putFloat("conso_def", (float) v).apply(); }
                                });
                    }
                });
        listRow(vg, R.drawable.i_euro, AMBER, "Prix du litre par défaut", "Utilisé avant le premier plein",
                Fmt.num(Prefs.defaultPrice(this), 3) + " €", null, TXT, new Click() {
                    public void run() {
                        numberSheet("Prix du litre par défaut", "Le prix de ton dernier plein le remplace automatiquement.", "€/L",
                                Fmt.num(Prefs.defaultPrice(MainActivity.this), 3), new NumCb() {
                                    public void set(double v) { Prefs.get(MainActivity.this).edit().putFloat("prix_def", (float) v).apply(); }
                                });
                    }
                });
        listRow(vg, R.drawable.i_wrench, VIOLET, "Vidange tous les", "Pour le rappel de vidange",
                Fmt.kmInt(Prefs.vidangeInterval(this)), null, TXT, new Click() {
                    public void run() {
                        numberSheet("Intervalle de vidange", "Consulte le carnet d'entretien de ta voiture (souvent 15 000 à 25 000 km).", "km",
                                Fmt.num(Prefs.vidangeInterval(MainActivity.this), 0), new NumCb() {
                                    public void set(double v) { Prefs.get(MainActivity.this).edit().putFloat("vidange_km", (float) v).apply(); }
                                });
                    }
                });

        // --- Données ---
        section(content, "Données");
        LinearLayout dg = group(content);
        listRow(dg, R.drawable.i_download, BLUE, "Exporter les trajets", "Fichier CSV (Excel, Sheets)", null, null, TXT,
                new Click() { public void run() { exportTrips(); } });
        listRow(dg, R.drawable.i_download, BLUE, "Exporter les pleins", "Fichier CSV (Excel, Sheets)", null, null, TXT,
                new Click() { public void run() { exportFuel(); } });
        listRow(dg, R.drawable.i_info, SUB, "Journal de détection", "Pourquoi un trajet a démarré ou non", null, null, TXT,
                new Click() { public void run() { journalSheet(); } });

        // --- Conseils ---
        section(content, "Conseils Samsung");
        LinearLayout tc = card(content);
        tc.addView(body("•  Paramètres → Batterie → Limites d'utilisation en arrière-plan → ajoute Trajo aux « Applications jamais en veille ».\n"
                + "•  Garde le Wi-Fi, le Bluetooth et la localisation activés.\n"
                + "•  Ouvre l'appli une fois après chaque installation ou mise à jour.\n"
                + "•  Trajet raté ? Trajets → Ajouter.", 13, SUB));

        TextView ver = text("Trajo · version " + VERSION + "\nTes données restent uniquement sur ton téléphone", 11, MUTED, W_REG);
        ver.setGravity(Gravity.CENTER);
        ver.setLineSpacing(0, 1.3f);
        ver.setPadding(0, dp(20), 0, 0);
        content.addView(ver, fullWidth(0));
    }

    View linkChip(int iconRes, String s, boolean connected) {
        LinearLayout p = hbox();
        int col = connected ? GOOD : 0xCCFFFFFF;
        p.setBackground(surface(connected ? alpha(GOOD, 0x22) : 0x1FFFFFFF, 100).stroke(connected ? alpha(GOOD, 0x55) : alpha(WHITE, 0x1A)).noHighlight());
        p.setPadding(dp(10), dp(6), dp(12), dp(6));
        LinearLayout.LayoutParams ip = lp(dp(14), dp(14), 0);
        ip.rightMargin = dp(6);
        p.addView(icon(iconRes, col), ip);
        p.addView(text(s + (connected ? " · connecté" : ""), 12, col, W_MED));
        return p;
    }

    /** Ligne d'autorisation avec badge net : « ✓ OK » émeraude ou « Autoriser » ambre. */
    void permRow(LinearLayout g, int iconRes, String title, String sub, boolean ok, Click fix) {
        if (g.getChildCount() > 0) divider(g);
        LinearLayout row = hbox();
        row.setPadding(dp(16), dp(13), dp(14), dp(13));
        LinearLayout.LayoutParams bp = lp(dp(40), dp(40), 0);
        bp.rightMargin = dp(14);
        row.addView(bubble(iconRes, ok ? GOOD : AMBER, 40), bp);
        LinearLayout mid = vbox();
        mid.addView(text(title, 15, TXT, W_MED));
        TextView s = text(sub, 13, SUB, W_REG);
        s.setPadding(0, dp(3), 0, 0);
        mid.addView(s);
        row.addView(mid, lp(0, -2, 1f));
        TextView badge = text(ok ? "✓  OK" : "Autoriser", 12, ok ? GOOD : 0xFF1A1206, W_BOLD);
        badge.setBackground(ok ? surface(alpha(GOOD, 0x1F), 100).stroke(alpha(GOOD, 0x55)).noHighlight()
                : surface(AMBER, 100).gradient(AMBER, 0xFFFBBF24).noHighlight());
        badge.setPadding(dp(12), dp(6), dp(12), dp(6));
        if (!ok) glow(badge, AMBER, 6);
        LinearLayout.LayoutParams blp = lp(-2, -2, 0);
        blp.leftMargin = dp(8);
        row.addView(badge, blp);
        if (!ok) {
            row.setBackground(pressable(null, 0));
            row.setOnClickListener(fix);
        }
        g.addView(row);
    }

    interface NumCb { void set(double v); }

    void numberSheet(String title, String help, String suffix, String current, final NumCb cb) {
        LinearLayout f = vbox();
        f.addView(body(help, 14, SUB), fullWidth(16));
        final EditText e = field(f, "Valeur", current, "", true, suffix);
        sheet(title, f, "Enregistrer", false, new Save() {
            public boolean run() {
                double v = Fmt.parse(e.getText().toString());
                if (!(v > 0)) { toast("Indique une valeur"); return false; }
                cb.set(v);
                render();
                return true;
            }
        }, null, null);
    }

    void journalSheet() {
        LinearLayout f = vbox();
        String log = EventLog.get(this);
        TextView t = text(log.isEmpty() ? "Rien pour l'instant." : log, 12, SUB, W_REG);
        t.setTypeface(android.graphics.Typeface.MONOSPACE);
        t.setLineSpacing(0, 1.3f);
        t.setTextIsSelectable(true);
        f.addView(t, fullWidth(8));
        final String all = log;
        f.addView(tonalButton("Partager le journal", R.drawable.i_download, BLUE, new Click() {
            public void run() { share("Journal Trajo", all); }
        }), fullWidth(0));
        sheet("Journal de détection", f, null, false, null, "Vider le journal", new Runnable() {
            public void run() { EventLog.clear(MainActivity.this); }
        });
    }

    void wifiSheet() {
        LinearLayout f = vbox();
        f.addView(body("C'est le Wi-Fi créé par ton boîtier CarPlay / Android Auto sans fil (ex. : AutoBox-9678). Le téléphone s'y connecte quand la voiture démarre.", 14, SUB), fullWidth(16));
        String ssid = Prefs.carSsid(this);
        final EditText e = field(f, "Nom du Wi-Fi", ssid == null ? "" : ssid, "AutoBox-9678", false, null);
        final String cur = WifiWatch.currentSsid(this);
        if (cur != null) {
            f.addView(tonalButton("Utiliser « " + cur + " »", R.drawable.i_wifi, BLUE, new Click() {
                public void run() { e.setText(cur); }
            }), fullWidth(4));
        } else {
            f.addView(text("Astuce : connecte-toi au boîtier, puis reviens ici pour le choisir en un appui.", 12, MUTED, W_REG));
        }
        sheet("Wi-Fi de la voiture", f, "Enregistrer", false, new Save() {
            public boolean run() {
                String v = e.getText().toString().trim();
                Prefs.get(MainActivity.this).edit().putString("car_ssid", v).apply();
                WifiWatch.register(MainActivity.this);
                toast(v.isEmpty() ? "Détection Wi-Fi désactivée" : "Wi-Fi enregistré");
                render();
                return true;
            }
        }, ssid == null ? null : "Désactiver la détection Wi-Fi", new Runnable() {
            public void run() {
                Prefs.get(MainActivity.this).edit().putString("car_ssid", "").apply();
                WifiWatch.register(MainActivity.this);
                render();
            }
        });
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

        LinearLayout f = vbox();
        f.addView(body("Choisis le Bluetooth de ta voiture (il doit déjà être appairé avec le téléphone).", 14, SUB), fullWidth(14));
        LinearLayout g = vbox();
        g.setBackground(surface(SURF2, 18));
        g.setClipToOutline(true);
        f.addView(g, fullWidth(4));
        final Dialog[] holder = new Dialog[1];
        String current = Prefs.carAddress(this);
        int count = 0;
        for (int pass = 0; pass < 2; pass++) {
            for (final BluetoothDevice d : bonded) {
                final String n = d.getName() == null ? d.getAddress() : d.getName();
                String u = n.toUpperCase();
                boolean looksCar = u.contains("PEUGEOT") || u.contains("208") || u.contains("CAR") || u.contains("AUTO");
                if ((pass == 0) != looksCar) continue;
                count++;
                boolean sel = d.getAddress().equalsIgnoreCase(current == null ? "" : current);
                listRow(g, looksCar ? R.drawable.i_car : R.drawable.i_bluetooth, sel ? GOOD : BLUE, n, sel ? "Sélectionné" : null,
                        null, null, TXT, new Click() {
                            public void run() {
                                Prefs.get(MainActivity.this).edit().putString("car_addr", d.getAddress()).putString("car_name", n).apply();
                                toast("Voiture enregistrée : " + n);
                                if (holder[0] != null) holder[0].dismiss();
                                render();
                            }
                        });
            }
        }
        if (count == 0) f.addView(text("Aucun appareil appairé. Connecte d'abord ton téléphone à ta voiture en Bluetooth.", 14, AMBER, W_REG));
        holder[0] = sheet("Bluetooth de la voiture", f, null, false, null,
                current == null ? null : "Ne plus utiliser le Bluetooth", new Runnable() {
                    public void run() {
                        Prefs.get(MainActivity.this).edit().remove("car_addr").remove("car_name").apply();
                        render();
                    }
                });
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
        share("Pleins – Trajo", sb.toString());
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
}
