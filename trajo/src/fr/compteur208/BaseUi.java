package fr.compteur208;

import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.Dialog;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Calendar;

/**
 * Système de design de l'appli : couleurs, typographie et composants (cartes, listes,
 * tuiles, boutons, feuilles de saisie). Tout est construit en code, sans XML.
 *
 * Attention : pas de lambdas Java (->, ::) dans ce projet, l'outil de build ne les convertit pas.
 */
abstract class BaseUi extends Activity {
    // ---- Palette ----
    static final int BG = 0xFF0A0C10, SURF = 0xFF14171D, SURF2 = 0xFF1D2129, STROKE = 0xFF242933,
            TXT = 0xFFF5F7FA, SUB = 0xFF8E96A3, MUTED = 0xFF5F6673,
            ACC = 0xFF4F8CFF, ACC2 = 0xFF7A5CFF, GOOD = 0xFF2FD47F, WARN = 0xFFFFB547, BAD = 0xFFFF5D5D,
            WHITE = 0xFFFFFFFF;
    static final int W_REG = 0, W_MED = 1, W_LIGHT = 2, W_BOLD = 3;

    /** Clic sans lambda : new Click() { public void run() { ... } } */
    abstract static class Click implements View.OnClickListener, Runnable {
        public void onClick(View v) { run(); }
    }

    interface Save { boolean run(); }

    // =====================================================================
    // Bases
    // =====================================================================

    int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    static int alpha(int color, int a) { return (color & 0x00FFFFFF) | (a << 24); }

    static Typeface face(int w) {
        switch (w) {
            case W_MED: return Typeface.create("sans-serif-medium", Typeface.NORMAL);
            case W_LIGHT: return Typeface.create("sans-serif-light", Typeface.NORMAL);
            case W_BOLD: return Typeface.create("sans-serif", Typeface.BOLD);
            default: return Typeface.create("sans-serif", Typeface.NORMAL);
        }
    }

    TextView text(String s, float sp, int color, int w) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(face(w));
        return t;
    }

    /** Texte « paragraphe » avec un interlignage confortable. */
    TextView body(String s, float sp, int color) {
        TextView t = text(s, sp, color, W_REG);
        t.setLineSpacing(0, 1.25f);
        return t;
    }

    /** Grand chiffre (chiffres à largeur fixe). */
    TextView number(String s, float sp, int color) {
        TextView t = text(s, sp, color, W_LIGHT);
        t.setFontFeatureSettings("tnum");
        t.setLetterSpacing(-0.02f);
        return t;
    }

    ImageView icon(int res, int color) {
        ImageView iv = new ImageView(this);
        iv.setImageResource(res);
        iv.setImageTintList(ColorStateList.valueOf(color));
        iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
        return iv;
    }

    Drawable tintedIcon(int res, int color, int sizeDp) {
        Drawable d = getDrawable(res).mutate();
        d.setTint(color);
        d.setBounds(0, 0, dp(sizeDp), dp(sizeDp));
        return d;
    }

    /** Pastille ronde colorée avec une icône au centre. */
    View bubble(int res, int color, int sizeDp) {
        FrameLayout f = new FrameLayout(this);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(alpha(color, 0x26));
        f.setBackground(g);
        int s = Math.round(sizeDp * 0.5f);
        f.addView(icon(res, color), new FrameLayout.LayoutParams(dp(s), dp(s), Gravity.CENTER));
        return f;
    }

    GradientDrawable round(int color, float r) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(r));
        return g;
    }

    GradientDrawable roundStroke(int color, float r, int stroke) {
        GradientDrawable g = round(color, r);
        g.setStroke(Math.max(1, dp(1)), stroke);
        return g;
    }

    GradientDrawable gradient(int c1, int c2, float r) {
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{c1, c2});
        g.setCornerRadius(dp(r));
        return g;
    }

    /** Effet d'appui (ripple) par-dessus un fond. */
    Drawable pressable(Drawable bg, float r) {
        return new RippleDrawable(ColorStateList.valueOf(alpha(WHITE, 0x1C)), bg, round(WHITE, r));
    }

    View space(ViewGroup g, int sizeDp) {
        View v = new View(this);
        g.addView(v, new LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp)));
        return v;
    }

    LinearLayout.LayoutParams lp(int w, int h, float weight) { return new LinearLayout.LayoutParams(w, h, weight); }

    LinearLayout.LayoutParams fullWidth(int bottomMarginDp) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.bottomMargin = dp(bottomMarginDp);
        return p;
    }

    LinearLayout vbox() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }

    LinearLayout hbox() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.HORIZONTAL);
        l.setGravity(Gravity.CENTER_VERTICAL);
        return l;
    }

    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_LONG).show(); }

    // =====================================================================
    // Composants
    // =====================================================================

    /** En-tête d'écran : grand titre, sous-titre et élément optionnel à droite. */
    void header(ViewGroup parent, String title, String sub, View right) {
        LinearLayout row = hbox();
        row.setGravity(Gravity.TOP);
        LinearLayout col = vbox();
        TextView t = text(title, 30, TXT, W_MED);
        t.setLetterSpacing(-0.01f);
        col.addView(t);
        if (sub != null) {
            TextView s = text(sub, 14, SUB, W_REG);
            s.setPadding(0, dp(4), 0, 0);
            col.addView(s);
        }
        row.addView(col, lp(0, -2, 1f));
        if (right != null) {
            LinearLayout.LayoutParams p = lp(-2, -2, 0);
            p.topMargin = dp(8);
            row.addView(right, p);
        }
        parent.addView(row, fullWidth(20));
    }

    /** En-tête de l'accueil avec le logo de l'appli à gauche du titre. */
    void headerLogo(ViewGroup parent, String title, String sub, View right) {
        LinearLayout row = hbox();
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        logo.setBackground(round(0xFF171920, 14));
        logo.setClipToOutline(true);
        LinearLayout.LayoutParams lpLogo = lp(dp(52), dp(52), 0);
        lpLogo.rightMargin = dp(14);
        row.addView(logo, lpLogo);
        LinearLayout col = vbox();
        TextView t = text(title, 30, TXT, W_MED);
        t.setLetterSpacing(-0.01f);
        col.addView(t);
        TextView s = text(sub, 14, SUB, W_REG);
        s.setPadding(0, dp(2), 0, 0);
        col.addView(s);
        row.addView(col, lp(0, -2, 1f));
        if (right != null) row.addView(right, lp(-2, -2, 0));
        parent.addView(row, fullWidth(20));
    }

    void section(ViewGroup parent, String title) {
        TextView t = text(title.toUpperCase(Fmt.FR), 12, SUB, W_MED);
        t.setLetterSpacing(0.08f);
        t.setPadding(dp(4), dp(14), 0, dp(10));
        parent.addView(t);
    }

    LinearLayout card(ViewGroup parent) {
        LinearLayout c = vbox();
        c.setBackground(roundStroke(SURF, 20, STROKE));
        c.setPadding(dp(18), dp(16), dp(18), dp(16));
        parent.addView(c, fullWidth(12));
        return c;
    }

    /** Carte-liste : des lignes séparées par de fins traits. */
    LinearLayout group(ViewGroup parent) {
        LinearLayout c = vbox();
        c.setBackground(roundStroke(SURF, 20, STROKE));
        c.setPadding(0, dp(4), 0, dp(4));
        c.setClipToOutline(true);
        parent.addView(c, fullWidth(12));
        return c;
    }

    void divider(LinearLayout g) {
        View v = new View(this);
        v.setBackgroundColor(STROKE);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, Math.max(1, dp(0.7f)));
        p.leftMargin = dp(70);
        g.addView(v, p);
    }

    /** Ligne de liste : pastille-icône, titre, sous-titre, valeur à droite, chevron si cliquable. */
    LinearLayout listRow(LinearLayout g, int iconRes, int iconColor, String title, String sub,
                         String value, String valueSub, int valueColor, View.OnClickListener click) {
        if (g.getChildCount() > 0) divider(g);
        LinearLayout row = hbox();
        row.setPadding(dp(16), dp(13), dp(14), dp(13));
        row.setMinimumHeight(dp(64));
        if (iconRes != 0) {
            LinearLayout.LayoutParams bp = lp(dp(40), dp(40), 0);
            bp.rightMargin = dp(14);
            row.addView(bubble(iconRes, iconColor, 40), bp);
        }
        LinearLayout mid = vbox();
        TextView t = text(title, 15, TXT, W_MED);
        mid.addView(t);
        if (sub != null && !sub.isEmpty()) {
            TextView s = text(sub, 13, SUB, W_REG);
            s.setPadding(0, dp(3), 0, 0);
            mid.addView(s);
        }
        row.addView(mid, lp(0, -2, 1f));
        if (value != null) {
            LinearLayout right = vbox();
            right.setGravity(Gravity.END);
            TextView v = text(value, 15, valueColor, W_MED);
            v.setFontFeatureSettings("tnum");
            v.setGravity(Gravity.END);
            right.addView(v);
            if (valueSub != null && !valueSub.isEmpty()) {
                TextView vs = text(valueSub, 12, SUB, W_REG);
                vs.setGravity(Gravity.END);
                vs.setPadding(0, dp(3), 0, 0);
                right.addView(vs);
            }
            LinearLayout.LayoutParams rp = lp(-2, -2, 0);
            rp.leftMargin = dp(10);
            row.addView(right, rp);
        }
        if (click != null) {
            LinearLayout.LayoutParams cp = lp(dp(18), dp(18), 0);
            cp.leftMargin = dp(6);
            row.addView(icon(R.drawable.i_chevron, MUTED), cp);
            row.setBackground(pressable(null, 0));
            row.setOnClickListener(click);
        }
        g.addView(row, new LinearLayout.LayoutParams(-1, -2));
        return row;
    }

    /** Ligne avec un interrupteur à droite. */
    Switch switchRow(LinearLayout g, int iconRes, int color, String title, String sub, boolean checked) {
        if (g.getChildCount() > 0) divider(g);
        LinearLayout row = hbox();
        row.setPadding(dp(16), dp(13), dp(14), dp(13));
        LinearLayout.LayoutParams bp = lp(dp(40), dp(40), 0);
        bp.rightMargin = dp(14);
        row.addView(bubble(iconRes, color, 40), bp);
        LinearLayout mid = vbox();
        mid.addView(text(title, 15, TXT, W_MED));
        if (sub != null) {
            TextView s = text(sub, 13, SUB, W_REG);
            s.setPadding(0, dp(3), 0, 0);
            mid.addView(s);
        }
        row.addView(mid, lp(0, -2, 1f));
        Switch sw = new Switch(this);
        sw.setChecked(checked);
        row.addView(sw);
        g.addView(row);
        return sw;
    }

    LinearLayout tilesRow(ViewGroup parent) {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        parent.addView(r, fullWidth(12));
        return r;
    }

    /** Tuile de statistique (2 par ligne). */
    void tile(LinearLayout row, int iconRes, int color, String label, String value, String sub) {
        LinearLayout t = vbox();
        t.setBackground(roundStroke(SURF, 20, STROKE));
        t.setPadding(dp(16), dp(16), dp(16), dp(16));
        t.addView(bubble(iconRes, color, 34), lp(dp(34), dp(34), 0));
        space(t, 14);
        t.addView(text(label, 12, SUB, W_REG));
        TextView v = text(value, 21, TXT, W_MED);
        v.setFontFeatureSettings("tnum");
        v.setPadding(0, dp(4), 0, 0);
        v.setSingleLine(true);
        t.addView(v);
        if (sub != null) {
            TextView s = text(sub, 11, MUTED, W_REG);
            s.setPadding(0, dp(2), 0, 0);
            t.addView(s);
        }
        LinearLayout.LayoutParams p = lp(0, -1, 1f);
        if (row.getChildCount() > 0) p.leftMargin = dp(12);
        row.addView(t, p);
    }

    TextView primaryButton(String label, int iconRes, View.OnClickListener click) {
        return filledButton(label, iconRes, gradient(ACC, ACC2, 16), WHITE, click);
    }

    TextView filledButton(String label, int iconRes, Drawable bg, int textColor, View.OnClickListener click) {
        TextView b = text(label, 16, textColor, W_MED);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(54));
        b.setPadding(dp(18), dp(14), dp(18), dp(14));
        b.setBackground(pressable(bg, 16));
        if (iconRes != 0) {
            b.setCompoundDrawablesRelative(tintedIcon(iconRes, textColor, 20), null, null, null);
            b.setCompoundDrawablePadding(dp(10));
        }
        b.setOnClickListener(click);
        return b;
    }

    TextView tonalButton(String label, int iconRes, int color, View.OnClickListener click) {
        TextView b = text(label, 15, color, W_MED);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(50));
        b.setPadding(dp(16), dp(12), dp(16), dp(12));
        b.setBackground(pressable(round(alpha(color, 0x1F), 16), 16));
        if (iconRes != 0) {
            b.setCompoundDrawablesRelative(tintedIcon(iconRes, color, 18), null, null, null);
            b.setCompoundDrawablePadding(dp(8));
        }
        b.setOnClickListener(click);
        return b;
    }

    TextView chip(String s, int color) {
        TextView t = text(s, 12, color, W_MED);
        t.setBackground(round(alpha(color, 0x22), 100));
        t.setPadding(dp(10), dp(5), dp(10), dp(5));
        return t;
    }

    /** Barre de progression arrondie. */
    View progress(double frac, int color) {
        frac = Math.max(0, Math.min(1, frac));
        LinearLayout track = new LinearLayout(this);
        track.setBackground(round(alpha(WHITE, 0x14), 8));
        View fill = new View(this);
        fill.setBackground(round(color, 8));
        track.addView(fill, lp(0, -1, (float) frac));
        track.addView(new View(this), lp(0, -1, (float) (1 - frac)));
        track.setLayoutParams(new LinearLayout.LayoutParams(-1, dp(8)));
        return track;
    }

    void empty(ViewGroup parent, int iconRes, String title, String msg) {
        LinearLayout c = card(parent);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setPadding(dp(24), dp(28), dp(24), dp(28));
        c.addView(bubble(iconRes, ACC, 60), lp(dp(60), dp(60), 0));
        space(c, 16);
        TextView t = text(title, 17, TXT, W_MED);
        t.setGravity(Gravity.CENTER);
        c.addView(t);
        space(c, 6);
        TextView m = body(msg, 14, SUB);
        m.setGravity(Gravity.CENTER);
        c.addView(m);
    }

    // =====================================================================
    // Feuille de saisie (bottom sheet)
    // =====================================================================

    /**
     * Ouvre une feuille qui glisse depuis le bas. onOk renvoie true pour fermer la feuille.
     * okLabel null = pas de bouton principal ; dangerLabel null = pas de bouton rouge.
     */
    Dialog sheet(String title, View content, String okLabel, boolean okIsDanger, final Save onOk,
                 String dangerLabel, final Runnable onDanger) {
        final Dialog d = new Dialog(this);
        d.requestWindowFeature(Window.FEATURE_NO_TITLE);

        LinearLayout box = vbox();
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(SURF);
        float r = dp(28);
        bg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        box.setBackground(bg);
        box.setPadding(dp(20), dp(10), dp(20), dp(16));

        View handle = new View(this);
        handle.setBackground(round(alpha(WHITE, 0x33), 4));
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(dp(40), dp(4));
        hp.gravity = Gravity.CENTER_HORIZONTAL;
        hp.bottomMargin = dp(18);
        box.addView(handle, hp);

        TextView t = text(title, 21, TXT, W_MED);
        box.addView(t, fullWidth(18));

        ScrollView sv = new ScrollView(this);
        sv.setVerticalScrollBarEnabled(false);
        sv.addView(content);
        box.addView(sv, new LinearLayout.LayoutParams(-1, -2, 1f));

        if (okLabel != null) {
            View ok = okIsDanger
                    ? filledButton(okLabel, R.drawable.i_trash, round(BAD, 16), WHITE, null)
                    : primaryButton(okLabel, 0, null);
            ok.setOnClickListener(new Click() { public void run() { if (onOk == null || onOk.run()) d.dismiss(); } });
            LinearLayout.LayoutParams op = fullWidth(0);
            op.topMargin = dp(10);
            box.addView(ok, op);
        }
        if (dangerLabel != null) {
            TextView del = tonalButton(dangerLabel, R.drawable.i_trash, BAD, new Click() {
                public void run() { d.dismiss(); onDanger.run(); }
            });
            LinearLayout.LayoutParams dpp = fullWidth(0);
            dpp.topMargin = dp(10);
            box.addView(del, dpp);
        }
        TextView cancel = text("Annuler", 15, SUB, W_MED);
        cancel.setGravity(Gravity.CENTER);
        cancel.setPadding(0, dp(14), 0, dp(6));
        cancel.setOnClickListener(new Click() { public void run() { d.dismiss(); } });
        box.addView(cancel, fullWidth(0));

        d.setContentView(box);
        Window w = d.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(0));
            w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setGravity(Gravity.BOTTOM);
            w.setWindowAnimations(android.R.style.Animation_InputMethod);
            w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            w.setDimAmount(0.6f);
        }
        d.show();
        return d;
    }

    /** Feuille de confirmation de suppression. */
    void confirmDelete(String title, String msg, final Runnable yes) {
        sheet(title, body(msg, 15, SUB), "Supprimer", true, new Save() {
            public boolean run() { yes.run(); return true; }
        }, null, null);
    }

    // ---- Champs de formulaire ----

    /** Champ « rempli » avec libellé au-dessus et unité à droite. */
    EditText field(LinearLayout parent, String label, String value, String hint, boolean number, String suffix) {
        TextView l = text(label, 13, SUB, W_MED);
        l.setPadding(dp(2), 0, 0, dp(8));
        parent.addView(l);
        final LinearLayout box = hbox();
        box.setBackground(roundStroke(SURF2, 14, STROKE));
        box.setPadding(dp(16), 0, dp(16), 0);
        box.setMinimumHeight(dp(54));
        EditText e = new EditText(this);
        e.setBackground(null);
        e.setText(value);
        e.setHint(hint == null ? "" : hint);
        e.setHintTextColor(MUTED);
        e.setTextColor(TXT);
        e.setTextSize(17);
        e.setSingleLine(true);
        e.setPadding(0, dp(14), 0, dp(14));
        if (number) {
            e.setKeyListener(android.text.method.DigitsKeyListener.getInstance("0123456789.,"));
            e.setRawInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        } else {
            e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        }
        e.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            public void onFocusChange(View v, boolean has) { box.setBackground(roundStroke(SURF2, 14, has ? ACC : STROKE)); }
        });
        box.addView(e, lp(0, -2, 1f));
        if (suffix != null) box.addView(text(suffix, 15, SUB, W_MED));
        parent.addView(box, fullWidth(16));
        return e;
    }

    /** Champ date : ouvre le calendrier. date[0] contient la date choisie. */
    void dateField(LinearLayout parent, String label, final long[] date) {
        TextView l = text(label, 13, SUB, W_MED);
        l.setPadding(dp(2), 0, 0, dp(8));
        parent.addView(l);
        LinearLayout box = hbox();
        box.setBackground(pressable(roundStroke(SURF2, 14, STROKE), 14));
        box.setPadding(dp(16), 0, dp(16), 0);
        box.setMinimumHeight(dp(54));
        LinearLayout.LayoutParams ip = lp(dp(20), dp(20), 0);
        ip.rightMargin = dp(12);
        box.addView(icon(R.drawable.i_calendar, ACC), ip);
        final TextView v = text(Fmt.date(date[0]), 16, TXT, W_REG);
        box.addView(v, lp(0, -2, 1f));
        box.setOnClickListener(new Click() {
            public void run() {
                Calendar cal = Calendar.getInstance();
                cal.setTimeInMillis(date[0]);
                new DatePickerDialog(BaseUi.this, new DatePickerDialog.OnDateSetListener() {
                    public void onDateSet(DatePicker p, int y, int m, int day) {
                        Calendar c2 = Calendar.getInstance();
                        c2.setTimeInMillis(date[0]);
                        c2.set(y, m, day);
                        date[0] = c2.getTimeInMillis();
                        v.setText(Fmt.date(date[0]));
                    }
                }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show();
            }
        });
        parent.addView(box, fullWidth(16));
    }

    /** Deux colonnes côte à côte dans un formulaire. */
    LinearLayout[] twoColumns(LinearLayout parent) {
        LinearLayout row = new LinearLayout(this);
        LinearLayout a = vbox(), b = vbox();
        row.addView(a, lp(0, -2, 1f));
        LinearLayout.LayoutParams bp = lp(0, -2, 1f);
        bp.leftMargin = dp(12);
        row.addView(b, bp);
        parent.addView(row, new LinearLayout.LayoutParams(-1, -2));
        return new LinearLayout[]{a, b};
    }
}
