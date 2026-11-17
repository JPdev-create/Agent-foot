package fr.compteur208;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

import java.util.List;

/** Petites vues de dessin : histogramme et tracé GPS. */
final class Charts {
    private Charts() {}

    static float dp(Context c, float v) { return v * c.getResources().getDisplayMetrics().density; }

    /** Histogramme simple (ex. : km par mois). */
    static final class Bars extends View {
        final double[] values; final String[] labels; final int color;
        final Paint bar = new Paint(Paint.ANTI_ALIAS_FLAG), txt = new Paint(Paint.ANTI_ALIAS_FLAG), val = new Paint(Paint.ANTI_ALIAS_FLAG);

        Bars(Context c, double[] values, String[] labels, int color, int textColor, int subColor) {
            super(c);
            this.values = values; this.labels = labels; this.color = color;
            bar.setColor(color);
            txt.setColor(subColor); txt.setTextSize(dp(c, 11)); txt.setTextAlign(Paint.Align.CENTER);
            val.setColor(textColor); val.setTextSize(dp(c, 11)); val.setTextAlign(Paint.Align.CENTER); val.setFakeBoldText(true);
        }

        @Override protected void onDraw(Canvas cv) {
            int n = values.length;
            if (n == 0) return;
            float w = getWidth(), h = getHeight();
            float top = dp(getContext(), 20), bottom = dp(getContext(), 22);
            double max = 1;
            for (double v : values) max = Math.max(max, v);
            float slot = w / n, bw = Math.min(slot * 0.62f, dp(getContext(), 44)), r = dp(getContext(), 6);
            for (int i = 0; i < n; i++) {
                float cx = slot * (i + 0.5f);
                float bh = (float) ((h - top - bottom) * values[i] / max);
                float y = h - bottom - Math.max(bh, values[i] > 0 ? dp(getContext(), 3) : 0);
                bar.setAlpha(i == n - 1 ? 255 : 150);
                cv.drawRoundRect(new RectF(cx - bw / 2, y, cx + bw / 2, h - bottom), r, r, bar);
                if (values[i] > 0) cv.drawText(String.format(Fmt.FR, "%,.0f", values[i]), cx, y - dp(getContext(), 5), val);
                cv.drawText(labels[i], cx, h - dp(getContext(), 6), txt);
            }
        }
    }

    /** Dessin du parcours GPS d'un trajet (sans fond de carte). */
    static final class Trace extends View {
        final List<double[]> pts;
        final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG), dot = new Paint(Paint.ANTI_ALIAS_FLAG), txt = new Paint(Paint.ANTI_ALIAS_FLAG);
        final int startColor, endColor;

        Trace(Context c, List<double[]> pts, int color, int startColor, int endColor, int subColor) {
            super(c);
            this.pts = pts; this.startColor = startColor; this.endColor = endColor;
            line.setColor(color); line.setStyle(Paint.Style.STROKE); line.setStrokeWidth(dp(c, 4));
            line.setStrokeCap(Paint.Cap.ROUND); line.setStrokeJoin(Paint.Join.ROUND);
            txt.setColor(subColor); txt.setTextSize(dp(c, 14)); txt.setTextAlign(Paint.Align.CENTER);
        }

        @Override protected void onDraw(Canvas cv) {
            float w = getWidth(), h = getHeight();
            if (pts.size() < 2) { cv.drawText("Pas de tracé GPS pour ce trajet", w / 2, h / 2, txt); return; }
            double minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            for (double[] p : pts) {
                minLat = Math.min(minLat, p[0]); maxLat = Math.max(maxLat, p[0]);
                minLon = Math.min(minLon, p[1]); maxLon = Math.max(maxLon, p[1]);
            }
            double k = Math.cos(Math.toRadians((minLat + maxLat) / 2));
            double spanX = Math.max((maxLon - minLon) * k, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
            float pad = dp(getContext(), 20);
            double s = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
            float ox = (float) ((w - spanX * s) / 2), oy = (float) ((h - spanY * s) / 2);
            Path path = new Path();
            float sx = 0, sy = 0, ex = 0, ey = 0;
            for (int i = 0; i < pts.size(); i++) {
                double[] p = pts.get(i);
                float x = ox + (float) ((p[1] - minLon) * k * s);
                float y = oy + (float) ((maxLat - p[0]) * s);
                if (i == 0) { path.moveTo(x, y); sx = x; sy = y; } else path.lineTo(x, y);
                ex = x; ey = y;
            }
            cv.drawPath(path, line);
            float r = dp(getContext(), 7);
            dot.setColor(startColor); cv.drawCircle(sx, sy, r, dot);
            dot.setColor(endColor); cv.drawCircle(ex, ey, r, dot);
        }
    }
}
