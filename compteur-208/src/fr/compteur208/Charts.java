package fr.compteur208;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
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
        g.setColor(BaseUi.STROKE);
        g.setStrokeWidth(dp(c, 1));
        g.setStyle(Paint.Style.STROKE);
        g.setPathEffect(new DashPathEffect(new float[]{dp(c, 4), dp(c, 4)}, 0));
        return g;
    }

    /** Histogramme : la barre mise en avant est en dégradé, les autres en gris. */
    static final class Bars extends View {
        final double[] values; final String[] labels; final int highlight;
        final Paint bar = new Paint(Paint.ANTI_ALIAS_FLAG), grid;
        final Paint lab, labHi, val, valHi;

        Bars(Context c, double[] values, String[] labels, int highlight) {
            super(c);
            this.values = values; this.labels = labels; this.highlight = highlight;
            grid = gridPaint(c);
            lab = textPaint(c, 11, BaseUi.MUTED, false);
            labHi = textPaint(c, 11, BaseUi.TXT, true);
            val = textPaint(c, 10, BaseUi.SUB, false);
            valHi = textPaint(c, 12, BaseUi.TXT, true);
        }

        @Override protected void onDraw(Canvas cv) {
            int n = values.length;
            if (n == 0) return;
            Context c = getContext();
            float w = getWidth(), h = getHeight();
            float top = dp(c, 22), bottom = dp(c, 24), chartH = h - top - bottom;
            double max = 0;
            for (double v : values) max = Math.max(max, v);
            if (max <= 0) max = 1;
            for (int i = 0; i <= 2; i++) {
                float y = top + chartH * i / 2f;
                cv.drawLine(0, y, w, y, grid);
            }
            float slot = w / n, bw = Math.min(slot * 0.52f, dp(c, 30)), r = dp(c, 7);
            for (int i = 0; i < n; i++) {
                float cx = slot * (i + 0.5f);
                float bh = (float) (chartH * values[i] / max);
                if (values[i] > 0) bh = Math.max(bh, dp(c, 6));
                float y = top + chartH - bh;
                boolean hi = i == highlight;
                if (hi) {
                    bar.setShader(new LinearGradient(0, y, 0, top + chartH, BaseUi.ACC2, BaseUi.ACC, Shader.TileMode.CLAMP));
                } else {
                    bar.setShader(null);
                    bar.setColor(0xFF2A3040);
                }
                if (bh > 0) cv.drawRoundRect(new RectF(cx - bw / 2, y, cx + bw / 2, top + chartH), r, r, bar);
                if (values[i] > 0)
                    cv.drawText(String.format(Fmt.FR, "%,.0f", values[i]), cx, y - dp(c, 7), hi ? valHi : val);
                cv.drawText(labels[i], cx, h - dp(c, 6), hi ? labHi : lab);
            }
        }
    }

    /** Courbe avec remplissage dégradé (ex. : consommation au fil des pleins). */
    static final class Line extends View {
        final double[] values; final String[] labels; final int decimals;
        final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG),
                dot = new Paint(Paint.ANTI_ALIAS_FLAG), grid, lab, valHi;

        Line(Context c, double[] values, String[] labels, int decimals) {
            super(c);
            this.values = values; this.labels = labels; this.decimals = decimals;
            line.setColor(BaseUi.ACC);
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
            float padX = dp(c, 16), top = dp(c, 26), bottom = dp(c, 24), chartH = h - top - bottom;
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
            fill.setShader(new LinearGradient(0, top, 0, top + chartH, BaseUi.alpha(BaseUi.ACC, 0x55), BaseUi.alpha(BaseUi.ACC, 0x00), Shader.TileMode.CLAMP));
            cv.drawPath(area, fill);
            cv.drawPath(p, line);

            int step = Math.max(1, (int) Math.ceil(n / 6.0));
            for (int i = 0; i < n; i++) {
                boolean last = i == n - 1;
                if (last) {
                    dot.setColor(BaseUi.WHITE); cv.drawCircle(xs[i], ys[i], dp(c, 6), dot);
                    dot.setColor(BaseUi.ACC); cv.drawCircle(xs[i], ys[i], dp(c, 4), dot);
                    cv.drawText(Fmt.num(values[i], decimals), Math.min(xs[i], w - dp(c, 22)), ys[i] - dp(c, 12), valHi);
                } else {
                    dot.setColor(BaseUi.ACC); cv.drawCircle(xs[i], ys[i], dp(c, 3), dot);
                }
                if (i % step == 0 || last) {
                    float lx = Math.max(dp(c, 18), Math.min(xs[i], w - dp(c, 18)));
                    cv.drawText(labels[i], lx, h - dp(c, 6), lab);
                }
            }
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
     * Tracé GPS d'un trajet sur une vraie carte (tuiles sombres OpenStreetMap / CARTO,
     * téléchargées puis gardées en cache). Sans connexion : simple grille.
     */
    static final class Trace extends View {
        static final java.util.concurrent.ExecutorService NET = java.util.concurrent.Executors.newFixedThreadPool(4);
        static final android.util.LruCache<String, android.graphics.Bitmap> MEM = new android.util.LruCache<>(48);

        final List<double[]> pts;
        final java.util.Set<String> requested = new java.util.HashSet<>();
        final Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG), line = new Paint(Paint.ANTI_ALIAS_FLAG),
                dot = new Paint(Paint.ANTI_ALIAS_FLAG), grid = new Paint(), tilePaint = new Paint(Paint.FILTER_BITMAP_FLAG), txt, attr;

        Trace(Context c, List<double[]> pts) {
            super(c);
            this.pts = pts;
            glow.setStyle(Paint.Style.STROKE); glow.setStrokeWidth(dp(c, 12));
            glow.setStrokeCap(Paint.Cap.ROUND); glow.setStrokeJoin(Paint.Join.ROUND);
            glow.setColor(BaseUi.alpha(BaseUi.ACC, 0x40));
            line.setStyle(Paint.Style.STROKE); line.setStrokeWidth(dp(c, 4));
            line.setStrokeCap(Paint.Cap.ROUND); line.setStrokeJoin(Paint.Join.ROUND);
            line.setColor(BaseUi.ACC);
            grid.setColor(0x0DFFFFFF); grid.setStrokeWidth(dp(c, 1));
            txt = textPaint(c, 14, BaseUi.SUB, false);
            attr = textPaint(c, 9, 0x99FFFFFF, false);
            attr.setTextAlign(Paint.Align.RIGHT);
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
            if (pts.size() < 2) { cv.drawText("Pas de tracé GPS pour ce trajet", w / 2, h / 2, txt); return; }

            double minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            for (double[] p : pts) {
                minLat = Math.min(minLat, p[0]); maxLat = Math.max(maxLat, p[0]);
                minLon = Math.min(minLon, p[1]); maxLon = Math.max(maxLon, p[1]);
            }
            float tile = dp(c, 256);       // taille d'une tuile à l'écran
            float pad = dp(c, 36);
            int z = 17;
            for (; z > 2; z--) {
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
            if (anyTile) cv.drawText("© OpenStreetMap © CARTO", w - dp(c, 8), h - dp(c, 7), attr);
        }

        /** Tuile en mémoire, sinon lancement du chargement (disque puis internet). */
        android.graphics.Bitmap tile(final int z, final int x, final int y) {
            final String key = z + "_" + x + "_" + y;
            android.graphics.Bitmap b = MEM.get(key);
            if (b != null || requested.contains(key)) return b;
            requested.add(key);
            final java.io.File dir = new java.io.File(getContext().getCacheDir(), "tuiles");
            NET.execute(new Runnable() {
                public void run() {
                    try {
                        java.io.File f = new java.io.File(dir, key + ".png");
                        android.graphics.Bitmap bm = f.exists() ? android.graphics.BitmapFactory.decodeFile(f.getPath()) : null;
                        if (bm == null) {
                            String host = "abcd".charAt((x + y) % 4) + ".basemaps.cartocdn.com";
                            java.net.HttpURLConnection con = (java.net.HttpURLConnection)
                                    new java.net.URL("https://" + host + "/dark_all/" + z + "/" + x + "/" + y + "@2x.png").openConnection();
                            con.setConnectTimeout(8000);
                            con.setReadTimeout(10000);
                            con.setRequestProperty("User-Agent", "Compteur208/2.2 (Android)");
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

        void marker(Canvas cv, float x, float y, int color) {
            Context c = getContext();
            dot.setColor(BaseUi.alpha(color, 0x40)); cv.drawCircle(x, y, dp(c, 14), dot);
            dot.setColor(BaseUi.WHITE); cv.drawCircle(x, y, dp(c, 8), dot);
            dot.setColor(color); cv.drawCircle(x, y, dp(c, 5), dot);
        }
    }
}
