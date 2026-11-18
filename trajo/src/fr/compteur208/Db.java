package fr.compteur208;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

/** Base de données locale : trajets, pleins et entretien. */
final class Db extends SQLiteOpenHelper {
    private static Db instance;

    static synchronized Db get(Context c) {
        if (instance == null) instance = new Db(c.getApplicationContext());
        return instance;
    }

    private Db(Context c) { super(c, "compteur208.db", null, 3); }

    @Override public void onCreate(SQLiteDatabase d) {
        d.execSQL("CREATE TABLE trips(_id INTEGER PRIMARY KEY AUTOINCREMENT, start INTEGER, end_ts INTEGER, dist REAL, moving INTEGER, vmax REAL, pts TEXT, src TEXT, info TEXT, acc INTEGER DEFAULT -1, brk INTEGER DEFAULT -1, fast INTEGER DEFAULT 0)");
        d.execSQL("CREATE TABLE fuel(_id INTEGER PRIMARY KEY AUTOINCREMENT, date INTEGER, odo REAL, liters REAL, total REAL, full INTEGER, station TEXT)");
        d.execSQL("CREATE TABLE maint(_id INTEGER PRIMARY KEY AUTOINCREMENT, date INTEGER, odo REAL, type TEXT, cost REAL, note TEXT)");
        d.execSQL("CREATE INDEX trips_start ON trips(start)");
    }

    @Override public void onUpgrade(SQLiteDatabase d, int o, int n) {
        if (o < 2) d.execSQL("ALTER TABLE trips ADD COLUMN info TEXT");
        if (o < 3) {
            d.execSQL("ALTER TABLE trips ADD COLUMN acc INTEGER DEFAULT -1");
            d.execSQL("ALTER TABLE trips ADD COLUMN brk INTEGER DEFAULT -1");
            d.execSQL("ALTER TABLE trips ADD COLUMN fast INTEGER DEFAULT 0");
        }
    }

    // ---------- Modèles ----------

    static final class Trip {
        long id = -1, start, end, moving;
        double dist, vmax; // mètres, km/h
        String pts, src, info;
        /** Éco-conduite : accélérations et freinages brusques (-1 = non mesuré), temps au-dessus de 135 km/h (ms). */
        int acc = -1, brk = -1;
        long fast;
        double km() { return dist / 1000.0; }
        long duration() { return Math.max(0, end - start); }
        double avgKmh() {
            long t = moving > 60000 ? moving : duration();
            return t > 0 ? km() / (t / 3600000.0) : 0;
        }
    }

    static final class Fuel {
        long id = -1, date;
        double odo = -1, liters, total;
        boolean full = true;
        String station = "";
        double pricePerL() { return liters > 0 ? total / liters : 0; }
    }

    static final class Maint {
        long id = -1, date;
        double odo = -1, cost;
        String type = "Vidange", note = "";
    }

    // ---------- Trajets ----------

    long addTrip(Trip t) {
        ContentValues v = new ContentValues();
        v.put("start", t.start); v.put("end_ts", t.end); v.put("dist", t.dist);
        v.put("moving", t.moving); v.put("vmax", t.vmax); v.put("pts", t.pts); v.put("src", t.src); v.put("info", t.info);
        v.put("acc", t.acc); v.put("brk", t.brk); v.put("fast", t.fast);
        return getWritableDatabase().insert("trips", null, v);
    }

    void deleteTrip(long id) { getWritableDatabase().delete("trips", "_id=?", new String[]{"" + id}); }

    List<Trip> trips(long from, long to, boolean withPts) {
        String cols = "_id,start,end_ts,dist,moving,vmax,src,acc,brk,fast" + (withPts ? ",pts" : "");
        Cursor c = getReadableDatabase().rawQuery("SELECT " + cols + " FROM trips WHERE start>=? AND start<? ORDER BY start DESC",
                new String[]{"" + from, "" + to});
        List<Trip> out = new ArrayList<>();
        try {
            while (c.moveToNext()) {
                Trip t = new Trip();
                t.id = c.getLong(0); t.start = c.getLong(1); t.end = c.getLong(2); t.dist = c.getDouble(3);
                t.moving = c.getLong(4); t.vmax = c.getDouble(5); t.src = c.getString(6);
                t.acc = c.getInt(7); t.brk = c.getInt(8); t.fast = c.getLong(9);
                if (withPts) t.pts = c.getString(10);
                out.add(t);
            }
        } finally { c.close(); }
        return out;
    }

    Trip trip(long id) {
        Cursor c = getReadableDatabase().rawQuery("SELECT _id,start,end_ts,dist,moving,vmax,src,pts,info,acc,brk,fast FROM trips WHERE _id=?", new String[]{"" + id});
        try {
            if (!c.moveToNext()) return null;
            Trip t = new Trip();
            t.id = c.getLong(0); t.start = c.getLong(1); t.end = c.getLong(2); t.dist = c.getDouble(3);
            t.moving = c.getLong(4); t.vmax = c.getDouble(5); t.src = c.getString(6); t.pts = c.getString(7);
            t.info = c.getString(8);
            t.acc = c.getInt(9); t.brk = c.getInt(10); t.fast = c.getLong(11);
            return t;
        } finally { c.close(); }
    }

    /** Dernier trajet qui a un tracé GPS (pour savoir où la voiture est garée). */
    Trip lastTripWithTrace() {
        Cursor c = getReadableDatabase().rawQuery("SELECT _id FROM trips WHERE pts IS NOT NULL AND pts != '' ORDER BY end_ts DESC LIMIT 1", null);
        try { return c.moveToNext() ? trip(c.getLong(0)) : null; } finally { c.close(); }
    }

    /** Kilomètres parcourus (trajets enregistrés) entre deux dates. */
    double kmBetween(long from, long to) {
        Cursor c = getReadableDatabase().rawQuery("SELECT SUM(dist) FROM trips WHERE start>=? AND start<?", new String[]{"" + from, "" + to});
        try { return c.moveToNext() ? c.getDouble(0) / 1000.0 : 0; } finally { c.close(); }
    }

    // ---------- Pleins ----------

    void saveFuel(Fuel f) {
        ContentValues v = new ContentValues();
        v.put("date", f.date); v.put("odo", f.odo); v.put("liters", f.liters); v.put("total", f.total);
        v.put("full", f.full ? 1 : 0); v.put("station", f.station);
        if (f.id < 0) f.id = getWritableDatabase().insert("fuel", null, v);
        else getWritableDatabase().update("fuel", v, "_id=?", new String[]{"" + f.id});
    }

    void deleteFuel(long id) { getWritableDatabase().delete("fuel", "_id=?", new String[]{"" + id}); }

    /** Tous les pleins, du plus récent au plus ancien. */
    List<Fuel> fuels() {
        Cursor c = getReadableDatabase().rawQuery("SELECT _id,date,odo,liters,total,full,station FROM fuel ORDER BY date DESC, _id DESC", null);
        List<Fuel> out = new ArrayList<>();
        try {
            while (c.moveToNext()) {
                Fuel f = new Fuel();
                f.id = c.getLong(0); f.date = c.getLong(1); f.odo = c.getDouble(2); f.liters = c.getDouble(3);
                f.total = c.getDouble(4); f.full = c.getInt(5) == 1; f.station = c.getString(6);
                if (f.station == null) f.station = "";
                out.add(f);
            }
        } finally { c.close(); }
        return out;
    }

    // ---------- Entretien ----------

    void saveMaint(Maint m) {
        ContentValues v = new ContentValues();
        v.put("date", m.date); v.put("odo", m.odo); v.put("type", m.type); v.put("cost", m.cost); v.put("note", m.note);
        if (m.id < 0) m.id = getWritableDatabase().insert("maint", null, v);
        else getWritableDatabase().update("maint", v, "_id=?", new String[]{"" + m.id});
    }

    void deleteMaint(long id) { getWritableDatabase().delete("maint", "_id=?", new String[]{"" + id}); }

    List<Maint> maints() {
        Cursor c = getReadableDatabase().rawQuery("SELECT _id,date,odo,type,cost,note FROM maint ORDER BY date DESC, _id DESC", null);
        List<Maint> out = new ArrayList<>();
        try {
            while (c.moveToNext()) {
                Maint m = new Maint();
                m.id = c.getLong(0); m.date = c.getLong(1); m.odo = c.getDouble(2); m.type = c.getString(3);
                m.cost = c.getDouble(4); m.note = c.getString(5);
                if (m.note == null) m.note = "";
                out.add(m);
            }
        } finally { c.close(); }
        return out;
    }
}
