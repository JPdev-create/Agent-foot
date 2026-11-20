package fr.compteur208;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.RadialGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.view.View;

import java.util.List;

/** Graphiques dessinés à la main : barres, courbe, jauge de vitesse, tracé GPS. */
final class Charts {
    private Charts() {}

    static float dp(Context c, float v) { return v * c.getResources().getDisplayMetrics().density; }

    static Paint textPaint(Context c, float sizeDp, int color, boolean medium) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setTextSize(dp(c, sizeDp));
        p.setColor(color);
        p.setTextAlign(Paint.Align.CENTER);
        p.setTypeface(Typeface.create(medium ? "sans-serif-medium" : "sans-serif", Typeface.NORMAL));
        return p;
    }

    static Paint gridPaint(Context c) {
        Paint g = new Paint(Paint.ANTI_ALIAS_FLAG);
        g.setColor(0x14FFFFFF);
        g.setStrokeWidth(dp(c, 1.2f));
        g.setStrokeCap(Paint.Cap.ROUND);
        g.setStyle(Paint.Style.STROKE);
        g.setPathEffect(new DashPathEffect(new float[]{dp(c, 0.5f), dp(c, 6)}, 0));
        return g;
    }

    /** Histogramme : barres fines, la barre active en dégradé cobalt → cyan avec halo. */
    static final class Bars extends View {
        final double[] values; final String[] labels; final int highlight;
        final Paint bar = new Paint(Paint.ANTI_ALIAS_FLAG), glow = new Paint(Paint.ANTI_ALIAS_FLAG), grid;
        final Paint lab, labHi, val, valHi;

        Bars(Context c, double[] values, String[] labels, int highlight) {
            super(c);
            this.values = values; this.labels = labels; this.highlight = highlight;
            grid = gridPaint(c);
            lab = textPaint(c, 11, BaseUi.MUTED, false);
            labHi = textPaint(c, 11, BaseUi.TXT, true);
            val = textPaint(c, 10, BaseUi.MUTED, false);
            valHi = textPaint(c, 12, BaseUi.TXT, true);
        }

        @Override protected void onDraw(Canvas cv) {
            int n = values.length;
            if (n == 0) return;
            Context c = getContext();
            float w = getWidth(), h = getHeight();
            float top = dp(c, 24), bottom = dp(c, 24), chartH = h - top - bottom;
            double max = 0;
            for (double v : values) max = Math.max(max, v);
            if (max <= 0) max = 1;
            for (int i = 0; i <= 2; i++) {
                float y = top + chartH * i / 2f;
                cv.drawLine(0, y, w, y, grid);
            }
            float slot = w / n, bw = Math.min(slot * 0.36f, dp(c, n > 12 ? 7 : 12)), r = bw / 2;
            boolean dense = n > 12;
            for (int i = 0; i < n; i++) {
                float cx = slot * (i + 0.5f);
                float bh = (float) (chartH * values[i] / max);
                if (values[i] > 0) bh = Math.max(bh, bw);
                float y = top + chartH - bh;
                boolean hi = i == highlight;
                if (hi && bh > 0) {
                    float gr = Math.max(bw * 3f, dp(c, 26));
                    glow.setShader(new RadialGradient(cx, top + chartH - bh / 2, gr + bh / 2,
                            BaseUi.alpha(BaseUi.BLUE, 0x50), BaseUi.alpha(BaseUi.BLUE, 0), Shader.TileMode.CLAMP));
                    cv.drawCircle(cx, top + chartH - bh / 2, gr + bh / 2, glow);
                    bar.setShader(new LinearGradient(0, top + chartH, 0, y, BaseUi.BLUE, BaseUi.CYAN, Shader.TileMode.CLAMP));
                } else {
                    bar.setShader(null);
                    bar.setColor(0xFF232838);
                }
                if (bh > 0) cv.drawRoundRect(new RectF(cx - bw / 2, y, cx + bw / 2, top + chartH), r, r, bar);
                if (values[i] > 0 && (!dense || hi))
                    cv.drawText(String.format(Fmt.FR, "%,.0f", values[i]), cx, y - dp(c, 8), hi ? valHi : val);
                if (labels[i] != null && !labels[i].isEmpty())
                    cv.drawText(labels[i], cx, h - dp(c, 6), hi ? labHi : lab);
            }
        }
    }

    /** Courbe dégradée avec remplissage (ex. : consommation au fil des pleins). */
    static final class Line extends View {
        final double[] values; final String[] labels; final int decimals;
        final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG),
                dot = new Paint(Paint.ANTI_ALIAS_FLAG), grid, lab, valHi;

        Line(Context c, double[] values, String[] labels, int decimals) {
            super(c);
            this.values = values; this.labels = labels; this.decimals = decimals;
            line.setStyle(Paint.Style.STROKE);
            line.setStrokeWidth(dp(c, 2.5f));
            line.setStrokeJoin(Paint.Join.ROUND);
            line.setStrokeCap(Paint.Cap.ROUND);
            grid = gridPaint(c);
            lab = textPaint(c, 11, BaseUi.MUTED, false);
            valHi = textPaint(c, 12, BaseUi.TXT, true);
        }

        @Override protected void onDraw(Canvas cv) {
            int n = values.length;
            if (n < 2) return;
            Context c = getContext();
            float w = getWidth(), h = getHeight();
            float padX = dp(c, 16), top = dp(c, 28), bottom = dp(c, 24), chartH = h - top - bottom;
            double min = Double.MAX_VALUE, max = -Double.MAX_VALUE;
            for (double v : values) { min = Math.min(min, v); max = Math.max(max, v); }
            double span = max - min;
            if (span < 1e-6) span = Math.max(1, Math.abs(max) * 0.2);
            min -= span * 0.15; max += span * 0.15;
            for (int i = 0; i <= 2; i++) cv.drawLine(0, top + chartH * i / 2f, w, top + chartH * i / 2f, grid);

            float[] xs = new float[n], ys = new float[n];
            for (int i = 0; i < n; i++) {
                xs[i] = padX + (w - 2 * padX) * i / (n - 1f);
                ys[i] = top + (float) (chartH * (1 - (values[i] - min) / (max - min)));
            }
            Path p = new Path();
            p.moveTo(xs[0], ys[0]);
            for (int i = 1; i < n; i++) {
                float mx = (xs[i - 1] + xs[i]) / 2;
                p.cubicTo(mx, ys[i - 1], mx, ys[i], xs[i], ys[i]);
            }
            Path area = new Path(p);
            area.lineTo(xs[n - 1], top + chartH);
            area.lineTo(xs[0], top + chartH);
            area.close();
            fill.setShader(new LinearGradient(0, top, 0, top + chartH, BaseUi.alpha(BaseUi.BLUE, 0x50), BaseUi.alpha(BaseUi.BLUE, 0x00), Shader.TileMode.CLAMP));
            cv.drawPath(area, fill);
            line.setShader(new LinearGradient(0, 0, w, 0, BaseUi.BLUE, BaseUi.CYAN, Shader.TileMode.CLAMP));
            cv.drawPath(p, line);

            int step = Math.max(1, (int) Math.ceil(n / 6.0));
            for (int i = 0; i < n; i++) {
                boolean last = i == n - 1;
                if (last) {
                    dot.setShader(new RadialGradient(xs[i], ys[i], dp(c, 16), BaseUi.alpha(BaseUi.CYAN, 0x66), 0, Shader.TileMode.CLAMP));
                    cv.drawCircle(xs[i], ys[i], dp(c, 16), dot);
                    dot.setShader(null);
                    dot.setColor(BaseUi.WHITE); cv.drawCircle(xs[i], ys[i], dp(c, 5.5f), dot);
                    dot.setColor(BaseUi.CYAN); cv.drawCircle(xs[i], ys[i], dp(c, 3.5f), dot);
                    cv.drawText(Fmt.num(values[i], decimals), Math.min(xs[i], w - dp(c, 22)), ys[i] - dp(c, 13), valHi);
                }
                if (i % step == 0 || last) {
                    float lx = Math.max(dp(c, 18), Math.min(xs[i], w - dp(c, 18)));
                    cv.drawText(labels[i], lx, h - dp(c, 6), lab);
                }
            }
        }
    }

    /** Anneau de score (éco-conduite) : arc de 270° en dégradé, chiffre au centre. */
    static final class Ring extends View {
        final int value; final String caption;
        final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG),
                glowP = new Paint(Paint.ANTI_ALIAS_FLAG), big, small;
        final int color;

        Ring(Context c, int value, String caption, int color) {
            super(c);
            this.value = value; this.caption = caption; this.color = color;
            track.setStyle(Paint.Style.STROKE); track.setStrokeCap(Paint.Cap.ROUND);
            track.setStrokeWidth(dp(c, 11)); track.setColor(0x14FFFFFF);
            arc.setStyle(Paint.Style.STROKE); arc.setStrokeCap(Paint.Cap.ROUND); arc.setStrokeWidth(dp(c, 11));
            big = textPaint(c, 38, BaseUi.TXT, false);
            big.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            big.setFontFeatureSettings("tnum");
            small = textPaint(c, 11, BaseUi.SUB, true);
            small.setLetterSpacing(0.08f);
        }

        @Override protected void onDraw(Canvas cv) {
            Context c = getContext();
            float s = Math.min(getWidth(), getHeight()), pad = dp(c, 12);
            RectF r = new RectF((getWidth() - s) / 2 + pad, (getHeight() - s) / 2 + pad, (getWidth() + s) / 2 - pad, (getHeight() + s) / 2 - pad);
            glowP.setShader(new RadialGradient(r.centerX(), r.centerY(), s / 2, BaseUi.alpha(color, 0x30), 0, Shader.TileMode.CLAMP));
            cv.drawCircle(r.centerX(), r.centerY(), s / 2, glowP);
            cv.drawArc(r, 135, 270, false, track);
            if (value > 0) {
                arc.setShader(new android.graphics.SweepGradient(r.centerX(), r.centerY(),
                        new int[]{BaseUi.CYAN, color, color, BaseUi.CYAN}, new float[]{0f, 0.375f, 0.9f, 1f}));
                cv.drawArc(r, 135, 270 * value / 100f, false, arc);
            }
            cv.drawText(value >= 0 ? String.valueOf(value) : "—", r.centerX(), r.centerY() + dp(c, 12), big);
            cv.drawText(caption.toUpperCase(Fmt.FR), r.centerX(), r.centerY() + dp(c, 32), small);
        }
    }

    /** Jauge de vitesse (arc de 240°), dessinée en blanc sur le bandeau « trajet en cours ». */
    static final class Gauge extends View {
        float kmh;
        final float max = 160;
        final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Paint big, small;

        Gauge(Context c) {
            super(c);
            track.setStyle(Paint.Style.STROKE); track.setStrokeCap(Paint.Cap.ROUND);
            track.setStrokeWidth(dp(c, 9)); track.setColor(0x40FFFFFF);
            arc.setStyle(Paint.Style.STROKE); arc.setStrokeCap(Paint.Cap.ROUND);
            arc.setStrokeWidth(dp(c, 9)); arc.setColor(0xFFFFFFFF);
            big = textPaint(c, 30, 0xFFFFFFFF, false);
            big.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
            small = textPaint(c, 11, 0xCCFFFFFF, true);
        }

        void setValue(float v) { kmh = Math.max(0, v); invalidate(); }

        @Override protected void onDraw(Canvas cv) {
            float s = Math.min(getWidth(), getHeight()), pad = dp(getContext(), 8);
            RectF r = new RectF((getWidth() - s) / 2 + pad, (getHeight() - s) / 2 + pad, (getWidth() + s) / 2 - pad, (getHeight() + s) / 2 - pad);
            cv.drawArc(r, 150, 240, false, track);
            float sweep = 240 * Math.min(1, kmh / max);
            if (sweep > 0.5f) cv.drawArc(r, 150, sweep, false, arc);
            float cy = r.centerY();
            cv.drawText(String.valueOf(Math.round(kmh)), r.centerX(), cy + dp(getContext(), 8), big);
            cv.drawText("km/h", r.centerX(), cy + dp(getContext(), 26), small);
        }
    }

    /**
     * Tracé GPS d'un trajet sur une vraie carte (tuiles OpenStreetMap assombries,
     * téléchargées puis gardées en cache). Sans connexion : simple grille.
     */
    static final class Trace extends View {
        static final java.util.concurrent.ExecutorService NET = java.util.concurrent.Executors.newFixedThreadPool(4);
        static final android.util.LruCache<String, android.graphics.Bitmap> MEM = new android.util.LruCache<>(48);

        final List<double[]> pts;
        /** Mode « voiture garée » : un seul point, carte centrée dessus. */
        boolean spot;
        /** Mode « carte de chaleur » : tous les trajets superposés. */
        List<List<double[]>> heat;
        float phase;
        android.animation.ValueAnimator radar;
        /** Mode « groupe » : position des membres. */
        List<Member> members;

        static final class Member {
            double lat, lon;
            int color;
            String name, label;
            boolean live;
            List<double[]> trail;
        }

        Trace(Context c, List<Member> ms, int unused) {
            this(c, new java.util.ArrayList<double[]>());
            members = ms;
            for (Member m : ms) {
                pts.add(new double[]{m.lat, m.lon});
                if (m.trail != null) pts.addAll(m.trail);
            }
        }
        final java.util.Set<String> requested = new java.util.HashSet<>();
        final Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG), line = new Paint(Paint.ANTI_ALIAS_FLAG),
                dot = new Paint(Paint.ANTI_ALIAS_FLAG), grid = new Paint(), tilePaint = new Paint(Paint.FILTER_BITMAP_FLAG), txt, attr;

        Trace(Context c, List<double[]> pts) {
            super(c);
            this.pts = pts;
            glow.setStyle(Paint.Style.STROKE); glow.setStrokeWidth(dp(c, 12));
            glow.setStrokeCap(Paint.Cap.ROUND); glow.setStrokeJoin(Paint.Join.ROUND);
            glow.setColor(BaseUi.alpha(BaseUi.BLUE, 0x40));
            line.setStyle(Paint.Style.STROKE); line.setStrokeWidth(dp(c, 4));
            line.setStrokeCap(Paint.Cap.ROUND); line.setStrokeJoin(Paint.Join.ROUND);
            line.setColor(BaseUi.CYAN);
            grid.setColor(0x0DFFFFFF); grid.setStrokeWidth(dp(c, 1));
            txt = textPaint(c, 14, BaseUi.SUB, false);
            attr = textPaint(c, 9, 0x99FFFFFF, false);
            attr.setTextAlign(Paint.Align.RIGHT);
            tilePaint.setColorFilter(new android.graphics.ColorMatrixColorFilter(darkMap()));
        }

        /** Carte de chaleur de plusieurs trajets. */
        Trace(Context c, List<List<double[]>> paths, boolean heatMode) {
            this(c, new java.util.ArrayList<double[]>());
            heat = paths;
            for (List<double[]> p : paths) pts.addAll(p);
        }

        @Override protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            boolean anyLive = false;
            if (members != null) for (Member m : members) anyLive |= m.live;
            if (!spot && !anyLive) return;
            radar = android.animation.ValueAnimator.ofFloat(0f, 1f);
            radar.setDuration(2200);
            radar.setRepeatCount(android.animation.ValueAnimator.INFINITE);
            radar.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener() {
                public void onAnimationUpdate(android.animation.ValueAnimator a) { phase = (Float) a.getAnimatedValue(); invalidate(); }
            });
            radar.start();
        }

        @Override protected void onDetachedFromWindow() {
            if (radar != null) radar.cancel();
            super.onDetachedFromWindow();
        }

        /** Carte centrée sur la voiture garée. */
        Trace(Context c, double lat, double lon) {
            this(c, new java.util.ArrayList<double[]>());
            pts.add(new double[]{lat, lon});
            spot = true;
        }

        /**
         * Transforme la carte OpenStreetMap (claire) en carte sombre :
         * inversion des couleurs + rotation de teinte de 180° (l'eau reste bleue, la végétation verte),
         * puis éclaircissement léger et désaturation.
         */
        static android.graphics.ColorMatrix darkMap() {
            android.graphics.ColorMatrix invert = new android.graphics.ColorMatrix(new float[]{
                    -1, 0, 0, 0, 255,
                    0, -1, 0, 0, 255,
                    0, 0, -1, 0, 255,
                    0, 0, 0, 1, 0});
            android.graphics.ColorMatrix hue = new android.graphics.ColorMatrix(new float[]{
                    -0.574f, 1.430f, 0.144f, 0, 0,
                    0.426f, 0.430f, 0.144f, 0, 0,
                    0.426f, 1.430f, -0.856f, 0, 0,
                    0, 0, 0, 1, 0});
            android.graphics.ColorMatrix sat = new android.graphics.ColorMatrix();
            sat.setSaturation(0.6f);
            float k = 1.05f;
            android.graphics.ColorMatrix dim = new android.graphics.ColorMatrix(new float[]{
                    k, 0, 0, 0, 22,
                    0, k, 0, 0, 25,
                    0, 0, k, 0, 32,
                    0, 0, 0, 1, 0});
            android.graphics.ColorMatrix m = new android.graphics.ColorMatrix();
            m.postConcat(invert);
            m.postConcat(hue);
            m.postConcat(sat);
            m.postConcat(dim);
            return m;
        }

        // Projection Web Mercator : coordonnées "monde" en pixels écran pour un zoom donné.
        static double wx(double lon, double world) { return (lon + 180.0) / 360.0 * world; }
        static double wy(double lat, double world) {
            double r = Math.toRadians(Math.max(-85, Math.min(85, lat)));
            return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * world;
        }

        @Override protected void onDraw(Canvas cv) {
            Context c = getContext();
            float w = getWidth(), h = getHeight();
            float cell = dp(c, 28);
            for (float x = cell; x < w; x += cell) cv.drawLine(x, 0, x, h, grid);
            for (float y = cell; y < h; y += cell) cv.drawLine(0, y, w, y, grid);
            if (pts.size() < (spot ? 1 : 2)) { cv.drawText("Pas de tracé GPS pour ce trajet", w / 2, h / 2, txt); return; }

            double minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            for (double[] p : pts) {
                minLat = Math.min(minLat, p[0]); maxLat = Math.max(maxLat, p[0]);
                minLon = Math.min(minLon, p[1]); maxLon = Math.max(maxLon, p[1]);
            }
            float tile = dp(c, 192);       // taille d'une tuile à l'écran (source 256 px)
            float pad = dp(c, 36);
            int z = spot ? 16 : members != null ? 16 : 17;
            for (; z > 2 && !spot; z--) {
                double world = tile * Math.pow(2, z);
                double bw = wx(maxLon, world) - wx(minLon, world), bh = wy(minLat, world) - wy(maxLat, world);
                if (bw <= w - 2 * pad && bh <= h - 2 * pad) break;
            }
            double world = tile * Math.pow(2, z);
            double cx = (wx(minLon, world) + wx(maxLon, world)) / 2, cy = (wy(minLat, world) + wy(maxLat, world)) / 2;
            double ox = cx - w / 2, oy = cy - h / 2;

            // Fond de carte
            int n = 1 << z;
            int tx0 = (int) Math.floor(ox / tile), tx1 = (int) Math.floor((ox + w) / tile);
            int ty0 = (int) Math.floor(oy / tile), ty1 = (int) Math.floor((oy + h) / tile);
            boolean anyTile = false;
            for (int tx = tx0; tx <= tx1; tx++) {
                for (int ty = ty0; ty <= ty1; ty++) {
                    if (ty < 0 || ty >= n) continue;
                    int x = ((tx % n) + n) % n;
                    android.graphics.Bitmap b = tile(z, x, ty);
                    if (b == null) continue;
                    anyTile = true;
                    float left = (float) (tx * tile - ox), top = (float) (ty * tile - oy);
                    cv.drawBitmap(b, null, new RectF(left, top, left + tile, top + tile), tilePaint);
                }
            }

            if (members != null) {
                drawMembers(cv, world, ox, oy);
                if (anyTile) cv.drawText("© les contributeurs d'OpenStreetMap", w - dp(c, 8), h - dp(c, 7), attr);
                return;
            }

            if (spot) {
                float px = (float) (wx(pts.get(0)[1], world) - ox), py = (float) (wy(pts.get(0)[0], world) - oy);
                // Halo « radar » : deux ondes qui s'élargissent et s'estompent
                for (int k = 0; k < 2; k++) {
                    float ph = (phase + k * 0.5f) % 1f;
                    dot.setColor(BaseUi.alpha(BaseUi.BLUE, (int) (0x70 * (1 - ph))));
                    cv.drawCircle(px, py, dp(c, 18 + 44 * ph), dot);
                }
                dot.setShader(new android.graphics.RadialGradient(px, py, dp(c, 34), BaseUi.alpha(BaseUi.BLUE, 0x66), 0, android.graphics.Shader.TileMode.CLAMP));
                cv.drawCircle(px, py, dp(c, 34), dot);
                dot.setShader(null);
                dot.setColor(BaseUi.WHITE); cv.drawCircle(px, py, dp(c, 19), dot);
                dot.setColor(BaseUi.BLUE); cv.drawCircle(px, py, dp(c, 16), dot);
                android.graphics.drawable.Drawable car = c.getDrawable(R.drawable.i_car).mutate();
                car.setTint(BaseUi.WHITE);
                int r = (int) dp(c, 10);
                car.setBounds((int) px - r, (int) py - r, (int) px + r, (int) py + r);
                car.draw(cv);
                if (anyTile) cv.drawText("© les contributeurs d'OpenStreetMap", w - dp(c, 8), h - dp(c, 7), attr);
                return;
            }

            if (heat != null) {
                // Chaque trajet est dessiné en cyan translucide ; les passages se cumulent (mode ADD).
                Paint hp = new Paint(Paint.ANTI_ALIAS_FLAG);
                hp.setStyle(Paint.Style.STROKE);
                hp.setStrokeWidth(dp(c, 3));
                hp.setStrokeCap(Paint.Cap.ROUND);
                hp.setStrokeJoin(Paint.Join.ROUND);
                hp.setColor(BaseUi.alpha(BaseUi.CYAN, 0x60));
                hp.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.ADD));
                Paint gp = new Paint(hp);
                gp.setStrokeWidth(dp(c, 9));
                gp.setColor(BaseUi.alpha(BaseUi.BLUE, 0x22));
                int save = cv.saveLayer(0, 0, w, h, null);
                for (int pass = 0; pass < 2; pass++) {
                    for (List<double[]> tr : heat) {
                        if (tr.size() < 2) continue;
                        Path hpth = new Path();
                        for (int i = 0; i < tr.size(); i++) {
                            float x = (float) (wx(tr.get(i)[1], world) - ox), y = (float) (wy(tr.get(i)[0], world) - oy);
                            if (i == 0) hpth.moveTo(x, y); else hpth.lineTo(x, y);
                        }
                        cv.drawPath(hpth, pass == 0 ? gp : hp);
                    }
                }
                cv.restoreToCount(save);
                if (anyTile) cv.drawText("© les contributeurs d'OpenStreetMap", w - dp(c, 8), h - dp(c, 7), attr);
                return;
            }

            Path path = new Path();
            float sx = 0, sy = 0, ex = 0, ey = 0;
            for (int i = 0; i < pts.size(); i++) {
                double[] p = pts.get(i);
                float x = (float) (wx(p[1], world) - ox), y = (float) (wy(p[0], world) - oy);
                if (i == 0) { path.moveTo(x, y); sx = x; sy = y; } else path.lineTo(x, y);
                ex = x; ey = y;
            }
            cv.drawPath(path, glow);
            cv.drawPath(path, line);
            marker(cv, sx, sy, BaseUi.GOOD);
            marker(cv, ex, ey, BaseUi.ACC2);
            if (anyTile) cv.drawText("© les contributeurs d'OpenStreetMap", w - dp(c, 8), h - dp(c, 7), attr);
        }

        /** Tuile en mémoire, sinon lancement du chargement (disque puis internet). */
        android.graphics.Bitmap tile(final int z, final int x, final int y) {
            final String key = z + "_" + x + "_" + y;
            android.graphics.Bitmap b = MEM.get(key);
            if (b != null || requested.contains(key)) return b;
            requested.add(key);
            final java.io.File dir = new java.io.File(getContext().getCacheDir(), "tuiles_osm");
            NET.execute(new Runnable() {
                public void run() {
                    try {
                        java.io.File f = new java.io.File(dir, key + ".png");
                        android.graphics.Bitmap bm = f.exists() ? android.graphics.BitmapFactory.decodeFile(f.getPath()) : null;
                        if (bm == null) {
                            java.net.HttpURLConnection con = (java.net.HttpURLConnection)
                                    new java.net.URL("https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png").openConnection();
                            con.setConnectTimeout(8000);
                            con.setReadTimeout(10000);
                            con.setRequestProperty("User-Agent", "Trajo/3.0 (application Android personnelle)");
                            if (con.getResponseCode() != 200) { con.disconnect(); return; }
                            java.io.InputStream in = con.getInputStream();
                            java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                            byte[] tmp = new byte[16384];
                            int r;
                            while ((r = in.read(tmp)) > 0) buf.write(tmp, 0, r);
                            in.close();
                            con.disconnect();
                            byte[] data = buf.toByteArray();
                            bm = android.graphics.BitmapFactory.decodeByteArray(data, 0, data.length);
                            if (bm != null) {
                                dir.mkdirs();
                                java.io.FileOutputStream out = new java.io.FileOutputStream(f);
                                out.write(data);
                                out.close();
                            }
                        }
                        if (bm != null) { MEM.put(key, bm); postInvalidate(); }
                    } catch (Exception ignored) {
                        // pas de réseau : la grille reste affichée
                    }
                }
            });
            return null;
        }

        /** Membres du groupe : trace en direct, halo pulsant si en route, « P » si garé, étiquette. */
        void drawMembers(Canvas cv, double world, double ox, double oy) {
            Context c = getContext();
            Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
            tp.setStyle(Paint.Style.STROKE); tp.setStrokeWidth(dp(c, 4));
            tp.setStrokeCap(Paint.Cap.ROUND); tp.setStrokeJoin(Paint.Join.ROUND);
            for (Member m : members) {
                if (!m.live || m.trail == null || m.trail.size() < 2) continue;
                Path p = new Path();
                for (int i = 0; i < m.trail.size(); i++) {
                    float x = (float) (wx(m.trail.get(i)[1], world) - ox), y = (float) (wy(m.trail.get(i)[0], world) - oy);
                    if (i == 0) p.moveTo(x, y); else p.lineTo(x, y);
                }
                p.lineTo((float) (wx(m.lon, world) - ox), (float) (wy(m.lat, world) - oy));
                tp.setColor(BaseUi.alpha(m.color, 0x40)); tp.setStrokeWidth(dp(c, 10)); cv.drawPath(p, tp);
                tp.setColor(m.color); tp.setStrokeWidth(dp(c, 4)); cv.drawPath(p, tp);
            }
            Paint ini = textPaint(c, 13, BaseUi.WHITE, true);
            ini.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            Paint lbl = textPaint(c, 11, BaseUi.WHITE, true);
            Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
            for (Member m : members) {
                float x = (float) (wx(m.lon, world) - ox), y = (float) (wy(m.lat, world) - oy);
                if (m.live) {
                    for (int k = 0; k < 2; k++) {
                        float ph = (phase + k * 0.5f) % 1f;
                        dot.setColor(BaseUi.alpha(m.color, (int) (0x70 * (1 - ph))));
                        cv.drawCircle(x, y, dp(c, 16 + 30 * ph), dot);
                    }
                    dot.setColor(BaseUi.WHITE); cv.drawCircle(x, y, dp(c, 16), dot);
                    dot.setColor(m.color); cv.drawCircle(x, y, dp(c, 13.5f), dot);
                    String in = m.name.isEmpty() ? "?" : m.name.substring(0, 1).toUpperCase(Fmt.FR);
                    cv.drawText(in, x, y + dp(c, 4.5f), ini);
                } else {
                    float r = dp(c, 13);
                    dot.setColor(BaseUi.WHITE);
                    cv.drawRoundRect(new RectF(x - r - dp(c, 2), y - r - dp(c, 2), x + r + dp(c, 2), y + r + dp(c, 2)), dp(c, 9), dp(c, 9), dot);
                    dot.setColor(BaseUi.alpha(m.color, 0xFF));
                    cv.drawRoundRect(new RectF(x - r, y - r, x + r, y + r), dp(c, 7), dp(c, 7), dot);
                    cv.drawText("P", x, y + dp(c, 4.5f), ini);
                }
                String t = m.label;
                float tw = lbl.measureText(t) + dp(c, 14);
                RectF rr = new RectF(x - tw / 2, y + dp(c, 20), x + tw / 2, y + dp(c, 40));
                bg.setColor(0xE60B0E16);
                cv.drawRoundRect(rr, dp(c, 10), dp(c, 10), bg);
                cv.drawText(t, x, rr.bottom - dp(c, 6), lbl);
            }
        }

        void marker(Canvas cv, float x, float y, int color) {
            Context c = getContext();
            dot.setColor(BaseUi.alpha(color, 0x40)); cv.drawCircle(x, y, dp(c, 14), dot);
            dot.setColor(BaseUi.WHITE); cv.drawCircle(x, y, dp(c, 8), dot);
            dot.setColor(color); cv.drawCircle(x, y, dp(c, 5), dot);
        }
    }
}
