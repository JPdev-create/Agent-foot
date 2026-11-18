package fr.compteur208;

import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.Dialog;
import android.content.res.ColorStateList;
import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.LinearGradient;
import android.graphics.Outline;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Build;
import android.text.InputType;
import android.view.Gravity;
import android.view.MotionEvent;
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
 * Système de design « Dark Cockpit & Telemetry » : palette, typographie, surfaces
 * (bordure fine + reflet en haut), halos lumineux, micro-interactions et composants.
 *
 * Attention : pas de lambdas Java (->, ::) dans ce projet, l'outil de build ne les convertit pas.
 */
abstract class BaseUi extends Activity {
    // ---- Palette ----
    static final int BG = 0xFF090B10,             // noir obsidienne
            SURF = 0xFF12151E,                     // cartes
            SURF2 = 0xFF191D28,                    // champs, éléments imbriqués
            STROKE = 0x12FFFFFF,                   // bordure 1px rgba(255,255,255,.07)
            HILITE = 0x0FFFFFFF,                   // reflet haut rgba(255,255,255,.06)
            TXT = 0xFFF4F6FA, SUB = 0xFF8A93A6, MUTED = 0xFF586174,
            BLUE = 0xFF3B82F6, CYAN = 0xFF06B6D4,  // télémétrie / km
            GOOD = 0xFF10B981,                     // actif / OK
            AMBER = 0xFFF59E0B,                    // carburant / coûts
            VIOLET = 0xFF8B5CF6,                   // entretien
            BAD = 0xFFEF4444, WHITE = 0xFFFFFFFF;
    // Anciens noms conservés
    static final int ACC = BLUE, ACC2 = VIOLET, WARN = AMBER;
    static final int W_REG = 0, W_MED = 1, W_LIGHT = 2, W_BOLD = 3;

    /** Clic sans lambda : new Click() { public void run() { ... } } */
    abstract static class Click implements View.OnClickListener, Runnable {
        public void onClick(View v) { run(); }
    }

    interface Save { boolean run(); }

    // =====================================================================
    // Surface : fond arrondi, bordure 1px, reflet en haut, dégradé « mesh » optionnel
    // =====================================================================

    static final class Surface extends Drawable {
        final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG), border = new Paint(Paint.ANTI_ALIAS_FLAG),
                hl = new Paint(Paint.ANTI_ALIAS_FLAG), blob = new Paint(Paint.ANTI_ALIAS_FLAG);
        final float r, px;
        int color;
        int[] gradient;           // dégradé linéaire diagonal (facultatif)
        float[][] blobs;          // {x, y, rayon} en fractions de la taille
        int[] blobColors;
        boolean highlight = true;

        Surface(int color, float radiusPx, float onePx) {
            this.color = color; this.r = radiusPx; this.px = onePx;
            border.setStyle(Paint.Style.STROKE);
            border.setStrokeWidth(onePx);
            border.setColor(STROKE);
            hl.setStrokeWidth(onePx);
            hl.setColor(HILITE);
        }

        Surface stroke(int c) { border.setColor(c); return this; }
        Surface noHighlight() { highlight = false; return this; }
        Surface gradient(int a, int b) { gradient = new int[]{a, b}; return this; }
        Surface blobs(float[][] b, int... colors) { blobs = b; blobColors = colors; return this; }

        @Override public void draw(Canvas cv) {
            Rect b = getBounds();
            RectF rf = new RectF(b.left + px / 2, b.top + px / 2, b.right - px / 2, b.bottom - px / 2);
            Path clip = new Path();
            clip.addRoundRect(new RectF(b), r, r, Path.Direction.CW);
            if (gradient != null) fill.setShader(new LinearGradient(b.left, b.top, b.right, b.bottom, gradient[0], gradient[1], Shader.TileMode.CLAMP));
            else { fill.setShader(null); fill.setColor(color); }
            cv.drawRoundRect(new RectF(b), r, r, fill);
            if (blobs != null) {
                cv.save();
                cv.clipPath(clip);
                for (int k = 0; k < blobs.length; k++) {
                    float[] bl = blobs[k];
                    float cx = b.left + b.width() * bl[0], cy = b.top + b.height() * bl[1];
                    float rad = Math.max(1, Math.max(b.width(), b.height()) * bl[2]);
                    int col = blobColors[k];
                    blob.setShader(new RadialGradient(cx, cy, rad, col, col & 0x00FFFFFF, Shader.TileMode.CLAMP));
                    cv.drawCircle(cx, cy, rad, blob);
                }
                cv.restore();
            }
            if (highlight) {
                cv.save();
                cv.clipPath(clip);
                cv.drawLine(b.left + r * 0.6f, b.top + px * 1.5f, b.right - r * 0.6f, b.top + px * 1.5f, hl);
                cv.restore();
            }
            if (border.getColor() != 0) cv.drawRoundRect(rf, r, r, border);
        }

        @Override public void getOutline(Outline o) { o.setRoundRect(getBounds(), r); }
        @Override public void setAlpha(int a) { fill.setAlpha(a); }
        @Override public void setColorFilter(ColorFilter cf) { fill.setColorFilter(cf); }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    Surface surface(int color, float radiusDp) { return new Surface(color, dp(radiusDp), Math.max(1, dp(1))); }

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

    /** Tous les textes ont des chiffres tabulaires (alignés). */
    TextView text(String s, float sp, int color, int w) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(face(w));
        t.setFontFeatureSettings("tnum");
        return t;
    }

    TextView body(String s, float sp, int color) {
        TextView t = text(s, sp, color, W_REG);
        t.setLineSpacing(0, 1.3f);
        return t;
    }

    /** Grand chiffre de KPI, gras et serré. */
    TextView number(String s, float sp, int color) {
        TextView t = text(s, sp, color, W_BOLD);
        t.setLetterSpacing(-0.03f);
        return t;
    }

    /** Libellé « micro-capitales » façon cockpit. */
    TextView label(String s, int color) {
        TextView t = text(s.toUpperCase(Fmt.FR), 11, color, W_MED);
        t.setLetterSpacing(0.08f);
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

    /** Badge d'icône : carré arrondi avec léger dégradé interne de la couleur. */
    View bubble(int res, int color, int sizeDp) {
        FrameLayout f = new FrameLayout(this);
        Surface s = surface(alpha(color, 0x1A), sizeDp * 0.32f).gradient(alpha(color, 0x38), alpha(color, 0x10)).stroke(alpha(color, 0x2E));
        f.setBackground(s);
        int ic = Math.round(sizeDp * 0.5f);
        f.addView(icon(res, color), new FrameLayout.LayoutParams(dp(ic), dp(ic), Gravity.CENTER));
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

    /** Halo lumineux radial (pour mettre en valeur une icône ou un chiffre). */
    GradientDrawable halo(int color, float radiusDp) {
        GradientDrawable g = new GradientDrawable();
        g.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        g.setGradientRadius(dp(radiusDp));
        g.setColors(new int[]{alpha(color, 0x55), alpha(color, 0x00)});
        return g;
    }

    Drawable pressable(Drawable bg, float r) {
        return new RippleDrawable(ColorStateList.valueOf(alpha(WHITE, 0x14)), bg, round(WHITE, r));
    }

    /** Micro-interaction : léger rétrécissement au toucher (équivalent de :active { scale(.97) }). */
    void pressScale(View v) {
        v.setOnTouchListener(new View.OnTouchListener() {
            public boolean onTouch(View view, MotionEvent e) {
                int a = e.getActionMasked();
                if (a == MotionEvent.ACTION_DOWN) view.animate().scaleX(0.97f).scaleY(0.97f).setDuration(90).start();
                else if (a == MotionEvent.ACTION_UP || a == MotionEvent.ACTION_CANCEL)
                    view.animate().scaleX(1f).scaleY(1f).setDuration(180).start();
                return false;
            }
        });
    }

    /** Ombre colorée (lueur) sous un élément, Android 9+. */
    void glow(View v, int color, float elevationDp) {
        v.setElevation(dp(elevationDp));
        if (Build.VERSION.SDK_INT >= 28) {
            v.setOutlineAmbientShadowColor(color);
            v.setOutlineSpotShadowColor(color);
        }
    }

    /** Point lumineux qui pulse. */
    View pulseDot(int color, int sizeDp) {
        FrameLayout f = new FrameLayout(this);
        View ring = new View(this);
        GradientDrawable rg = new GradientDrawable();
        rg.setShape(GradientDrawable.OVAL);
        rg.setColor(alpha(color, 0x55));
        ring.setBackground(rg);
        f.addView(ring, new FrameLayout.LayoutParams(dp(sizeDp), dp(sizeDp), Gravity.CENTER));
        View dot = new View(this);
        GradientDrawable dg = new GradientDrawable();
        dg.setShape(GradientDrawable.OVAL);
        dg.setColor(color);
        dot.setBackground(dg);
        f.addView(dot, new FrameLayout.LayoutParams(dp(sizeDp * 0.55f), dp(sizeDp * 0.55f), Gravity.CENTER));
        final android.animation.ObjectAnimator[] anims = {
                android.animation.ObjectAnimator.ofFloat(ring, "scaleX", 0.6f, 1.6f),
                android.animation.ObjectAnimator.ofFloat(ring, "scaleY", 0.6f, 1.6f),
                android.animation.ObjectAnimator.ofFloat(ring, "alpha", 0.9f, 0f)};
        for (android.animation.ObjectAnimator o : anims) {
            o.setDuration(1400);
            o.setRepeatCount(android.animation.ValueAnimator.INFINITE);
        }
        // L'animation ne tourne que tant que la vue est affichée (pas de fuite ni de batterie gâchée).
        f.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            public void onViewAttachedToWindow(View v) { for (android.animation.ObjectAnimator o : anims) o.start(); }
            public void onViewDetachedFromWindow(View v) { for (android.animation.ObjectAnimator o : anims) o.cancel(); }
        });
        return f;
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

    void header(ViewGroup parent, String title, String sub, View right) {
        LinearLayout row = hbox();
        row.setGravity(Gravity.TOP);
        LinearLayout col = vbox();
        TextView t = text(title, 32, TXT, W_BOLD);
        t.setLetterSpacing(-0.02f);
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
        parent.addView(row, fullWidth(22));
    }

    /** En-tête de l'accueil avec le logo. */
    void headerLogo(ViewGroup parent, String title, String sub, View right) {
        LinearLayout row = hbox();
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        logo.setBackground(surface(0xFF171920, 15));
        logo.setClipToOutline(true);
        glow(logo, BLUE, 6);
        LinearLayout.LayoutParams lpLogo = lp(dp(50), dp(50), 0);
        lpLogo.rightMargin = dp(14);
        row.addView(logo, lpLogo);
        LinearLayout col = vbox();
        TextView t = text(title, 28, TXT, W_BOLD);
        t.setLetterSpacing(-0.02f);
        col.addView(t);
        TextView s = text(sub, 13, SUB, W_REG);
        s.setPadding(0, dp(2), 0, 0);
        col.addView(s);
        row.addView(col, lp(0, -2, 1f));
        if (right != null) row.addView(right, lp(-2, -2, 0));
        parent.addView(row, fullWidth(22));
    }

    void section(ViewGroup parent, String title) {
        TextView t = label(title, SUB);
        t.setAlpha(0.85f);
        t.setPadding(dp(4), dp(16), 0, dp(10));
        parent.addView(t);
    }

    LinearLayout card(ViewGroup parent) {
        LinearLayout c = vbox();
        c.setBackground(surface(SURF, 22));
        c.setPadding(dp(18), dp(16), dp(18), dp(16));
        parent.addView(c, fullWidth(12));
        return c;
    }

    LinearLayout group(ViewGroup parent) {
        LinearLayout c = vbox();
        c.setBackground(surface(SURF, 22));
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
        p.rightMargin = dp(16);
        g.addView(v, p);
    }

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
        mid.addView(text(title, 15, TXT, W_MED));
        if (sub != null && !sub.isEmpty()) {
            TextView s = text(sub, 13, SUB, W_REG);
            s.setPadding(0, dp(3), 0, 0);
            mid.addView(s);
        }
        row.addView(mid, lp(0, -2, 1f));
        if (value != null) {
            LinearLayout right = vbox();
            right.setGravity(Gravity.END);
            TextView v = text(value, 15, valueColor, W_BOLD);
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
            LinearLayout.LayoutParams cp = lp(dp(16), dp(16), 0);
            cp.leftMargin = dp(8);
            row.addView(icon(R.drawable.i_chevron, MUTED), cp);
            row.setBackground(pressable(null, 0));
            row.setOnClickListener(click);
        }
        g.addView(row, new LinearLayout.LayoutParams(-1, -2));
        return row;
    }

    /** Interrupteur premium : piste émeraude quand actif, pastille blanche. */
    Switch styledSwitch(boolean checked) {
        Switch sw = new Switch(this);
        StateListDrawable track = new StateListDrawable();
        GradientDrawable on = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{GOOD, 0xFF34D399});
        on.setCornerRadius(dp(16));
        on.setSize(dp(50), dp(30));
        GradientDrawable off = roundStroke(SURF2, 16, alpha(WHITE, 0x1F));
        off.setSize(dp(50), dp(30));
        track.addState(new int[]{android.R.attr.state_checked}, on);
        track.addState(new int[]{}, off);
        GradientDrawable thumb = new GradientDrawable();
        thumb.setShape(GradientDrawable.OVAL);
        thumb.setColor(WHITE);
        thumb.setSize(dp(24), dp(24));
        sw.setTrackDrawable(track);
        sw.setThumbDrawable(new android.graphics.drawable.InsetDrawable(thumb, dp(3)));
        sw.setTrackTintList(null);
        sw.setThumbTintList(null);
        sw.setSwitchMinWidth(dp(52));
        sw.setChecked(checked);
        return sw;
    }

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
        Switch sw = styledSwitch(checked);
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

    void tile(LinearLayout row, int iconRes, int color, String label, String value, String sub) {
        LinearLayout t = vbox();
        Surface s = surface(SURF, 22).blobs(new float[][]{{1.0f, 0f, 0.75f}}, alpha(color, 0x1C));
        t.setBackground(s);
        t.setPadding(dp(16), dp(16), dp(16), dp(16));
        t.addView(bubble(iconRes, color, 36), lp(dp(36), dp(36), 0));
        space(t, 16);
        TextView l = label(label, SUB);
        t.addView(l);
        TextView v = number(value, 22, TXT);
        v.setPadding(0, dp(6), 0, 0);
        v.setSingleLine(true);
        t.addView(v);
        if (sub != null) {
            TextView st = text(sub, 12, MUTED, W_REG);
            st.setPadding(0, dp(3), 0, 0);
            t.addView(st);
        }
        LinearLayout.LayoutParams p = lp(0, -1, 1f);
        if (row.getChildCount() > 0) p.leftMargin = dp(12);
        row.addView(t, p);
    }

    /** Bouton principal : dégradé cobalt → cyan, lueur colorée, effet d'appui. */
    TextView primaryButton(String label, int iconRes, View.OnClickListener click) {
        Surface s = surface(BLUE, 18).gradient(BLUE, 0xFF2563EB).blobs(new float[][]{{0.9f, 0f, 0.9f}}, alpha(CYAN, 0x88))
                .stroke(alpha(WHITE, 0x22));
        TextView b = filledButton(label, iconRes, s, WHITE, click);
        glow(b, BLUE, 10);
        return b;
    }

    TextView filledButton(String label, int iconRes, Drawable bg, int textColor, View.OnClickListener click) {
        TextView b = text(label, 16, textColor, W_BOLD);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(56));
        b.setPadding(dp(18), dp(15), dp(18), dp(15));
        b.setBackground(pressable(bg, 18));
        if (iconRes != 0) {
            b.setCompoundDrawablesRelative(tintedIcon(iconRes, textColor, 20), null, null, null);
            b.setCompoundDrawablePadding(dp(10));
        }
        b.setOnClickListener(click);
        pressScale(b);
        return b;
    }

    /** Bouton secondaire « verre » : fond translucide teinté + bordure fine. */
    TextView tonalButton(String label, int iconRes, int color, View.OnClickListener click) {
        TextView b = text(label, 15, color, W_MED);
        b.setGravity(Gravity.CENTER);
        b.setMinHeight(dp(52));
        b.setPadding(dp(16), dp(12), dp(16), dp(12));
        b.setBackground(pressable(surface(alpha(color, 0x14), 18).stroke(alpha(color, 0x38)), 18));
        if (iconRes != 0) {
            b.setCompoundDrawablesRelative(tintedIcon(iconRes, color, 18), null, null, null);
            b.setCompoundDrawablePadding(dp(8));
        }
        b.setOnClickListener(click);
        pressScale(b);
        return b;
    }

    TextView chip(String s, int color) {
        TextView t = text(s, 12, color, W_MED);
        t.setBackground(surface(alpha(color, 0x1C), 100).stroke(alpha(color, 0x33)).noHighlight());
        t.setPadding(dp(10), dp(5), dp(10), dp(5));
        return t;
    }

    /** Pastille de statut avec point lumineux pulsant. */
    LinearLayout liveBadge(String s, int color, int textColor, int bg) {
        LinearLayout b = hbox();
        b.setBackground(surface(bg, 100).stroke(alpha(WHITE, 0x1F)).noHighlight());
        b.setPadding(dp(8), dp(6), dp(12), dp(6));
        b.addView(pulseDot(color, 12), lp(dp(14), dp(14), 0));
        TextView t = text(s, 12, textColor, W_MED);
        t.setPadding(dp(6), 0, 0, 0);
        b.addView(t);
        return b;
    }

    View progress(double frac, int color) {
        frac = Math.max(0, Math.min(1, frac));
        LinearLayout track = new LinearLayout(this);
        track.setBackground(round(alpha(WHITE, 0x10), 8));
        View fill = new View(this);
        fill.setBackground(new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{alpha(color, 0xAA), color}) {{
            setCornerRadius(dp(8));
        }});
        track.addView(fill, lp(0, -1, (float) frac));
        track.addView(new View(this), lp(0, -1, (float) (1 - frac)));
        track.setLayoutParams(new LinearLayout.LayoutParams(-1, dp(8)));
        return track;
    }

    /** État vide : icône sur halo radial, titre et texte aérés. */
    void empty(ViewGroup parent, int iconRes, String title, String msg) {
        LinearLayout c = card(parent);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setPadding(dp(28), dp(30), dp(28), dp(32));
        FrameLayout h = new FrameLayout(this);
        h.setBackground(halo(BLUE, 70));
        View b = bubble(iconRes, BLUE, 64);
        glow(b, BLUE, 12);
        h.addView(b, new FrameLayout.LayoutParams(dp(64), dp(64), Gravity.CENTER));
        c.addView(h, lp(dp(150), dp(120), 0));
        TextView t = text(title, 18, TXT, W_BOLD);
        t.setGravity(Gravity.CENTER);
        c.addView(t);
        space(c, 8);
        TextView m = body(msg, 14, SUB);
        m.setGravity(Gravity.CENTER);
        c.addView(m);
    }

    // =====================================================================
    // Feuille de saisie (bottom sheet)
    // =====================================================================

    Dialog sheet(String title, View content, String okLabel, boolean okIsDanger, final Save onOk,
                 String dangerLabel, final Runnable onDanger) {
        final Dialog d = new Dialog(this);
        d.requestWindowFeature(Window.FEATURE_NO_TITLE);

        LinearLayout box = vbox();
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(SURF);
        float r = dp(30);
        bg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        bg.setStroke(Math.max(1, dp(1)), STROKE);
        box.setBackground(bg);
        box.setPadding(dp(20), dp(10), dp(20), dp(16));

        View handle = new View(this);
        handle.setBackground(round(alpha(WHITE, 0x33), 4));
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(dp(40), dp(4));
        hp.gravity = Gravity.CENTER_HORIZONTAL;
        hp.bottomMargin = dp(18);
        box.addView(handle, hp);

        TextView t = text(title, 22, TXT, W_BOLD);
        t.setLetterSpacing(-0.01f);
        box.addView(t, fullWidth(18));

        ScrollView sv = new ScrollView(this);
        sv.setVerticalScrollBarEnabled(false);
        sv.addView(content);
        box.addView(sv, new LinearLayout.LayoutParams(-1, -2, 1f));

        if (okLabel != null) {
            View ok = okIsDanger
                    ? filledButton(okLabel, R.drawable.i_trash, surface(BAD, 18).gradient(BAD, 0xFFDC2626), WHITE, null)
                    : primaryButton(okLabel, 0, null);
            ok.setOnClickListener(new Click() { public void run() { if (onOk == null || onOk.run()) d.dismiss(); } });
            LinearLayout.LayoutParams op = fullWidth(0);
            op.topMargin = dp(12);
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
            w.setDimAmount(0.65f);
            if (Build.VERSION.SDK_INT >= 31) {
                w.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND);
                WindowManager.LayoutParams a = w.getAttributes();
                a.setBlurBehindRadius(dp(16));
                w.setAttributes(a);
            }
        }
        d.show();
        return d;
    }

    void confirmDelete(String title, String msg, final Runnable yes) {
        sheet(title, body(msg, 15, SUB), "Supprimer", true, new Save() {
            public boolean run() { yes.run(); return true; }
        }, null, null);
    }

    // ---- Champs de formulaire ----

    EditText field(LinearLayout parent, String label, String value, String hint, boolean number, String suffix) {
        TextView l = label(label, SUB);
        l.setPadding(dp(2), 0, 0, dp(8));
        parent.addView(l);
        final LinearLayout box = hbox();
        box.setBackground(surface(SURF2, 16));
        box.setPadding(dp(16), 0, dp(16), 0);
        box.setMinimumHeight(dp(56));
        EditText e = new EditText(this);
        e.setBackground(null);
        e.setText(value);
        e.setHint(hint == null ? "" : hint);
        e.setHintTextColor(MUTED);
        e.setTextColor(TXT);
        e.setTextSize(17);
        e.setFontFeatureSettings("tnum");
        e.setSingleLine(true);
        e.setPadding(0, dp(14), 0, dp(14));
        if (number) {
            e.setKeyListener(android.text.method.DigitsKeyListener.getInstance("0123456789.,"));
            e.setRawInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        } else {
            e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        }
        e.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            public void onFocusChange(View v, boolean has) {
                box.setBackground(has ? surface(SURF2, 16).stroke(alpha(BLUE, 0xAA)) : surface(SURF2, 16));
            }
        });
        box.addView(e, lp(0, -2, 1f));
        if (suffix != null) box.addView(text(suffix, 15, SUB, W_MED));
        parent.addView(box, fullWidth(16));
        return e;
    }

    void dateField(LinearLayout parent, String label, final long[] date) {
        TextView l = label(label, SUB);
        l.setPadding(dp(2), 0, 0, dp(8));
        parent.addView(l);
        LinearLayout box = hbox();
        box.setBackground(pressable(surface(SURF2, 16), 16));
        box.setPadding(dp(16), 0, dp(16), 0);
        box.setMinimumHeight(dp(56));
        LinearLayout.LayoutParams ip = lp(dp(20), dp(20), 0);
        ip.rightMargin = dp(12);
        box.addView(icon(R.drawable.i_calendar, BLUE), ip);
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
        pressScale(box);
        parent.addView(box, fullWidth(16));
    }

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

    /** Contrôle segmenté (ex. : Pleins | Entretien). */
    LinearLayout segmented(String[] labels, int sel, final SegCb cb) {
        LinearLayout box = new LinearLayout(this);
        box.setBackground(surface(SURF, 16));
        box.setPadding(dp(4), dp(4), dp(4), dp(4));
        for (int i = 0; i < labels.length; i++) {
            final int k = i;
            TextView t = text(labels[i], 14, i == sel ? TXT : SUB, i == sel ? W_BOLD : W_MED);
            t.setGravity(Gravity.CENTER);
            t.setPadding(0, dp(11), 0, dp(11));
            if (i == sel) {
                t.setBackground(surface(SURF2, 12).stroke(alpha(WHITE, 0x1A)));
                glow(t, BLUE, 3);
            }
            t.setOnClickListener(new Click() { public void run() { cb.select(k); } });
            box.addView(t, lp(0, -2, 1f));
        }
        return box;
    }

    interface SegCb { void select(int i); }
}
