package fr.compteur208;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Connexion au serveur Supabase : compte anonyme (pseudo), groupes, invitations et partage de position.
 * Tous les appels réseau sont bloquants : à lancer sur Cloud.IO, jamais sur le fil principal.
 */
final class Cloud {
    private Cloud() {}

    static final ExecutorService IO = Executors.newSingleThreadExecutor();
    static final int[] COLORS = {0xFF3B82F6, 0xFF10B981, 0xFFF59E0B, 0xFF8B5CF6, 0xFFEF4444, 0xFF06B6D4, 0xFFEC4899, 0xFF84CC16};

    static final class CloudException extends Exception {
        CloudException(String m) { super(m); }
    }

    static SharedPreferences p(Context c) { return c.getSharedPreferences("cloud", Context.MODE_PRIVATE); }

    // ---------- Configuration ----------

    static String url(Context c) { return p(c).getString("url", null); }
    /** Adresse du projet Supabase de l'administrateur, proposée par défaut. */
    static final String DEFAULT_URL = "https://pwpsbsnxyazockuzxyrt.supabase.co";
    static String key(Context c) { return p(c).getString("key", null); }
    static boolean configured(Context c) { return url(c) != null && key(c) != null; }

    static void configure(Context c, String url, String key) {
        url = url.trim();
        if (!url.startsWith("http")) url = "https://" + url;
        // Garde seulement « https://xxxx.supabase.co » (on accepte un lien collé avec /rest/v1/…).
        try {
            android.net.Uri u = android.net.Uri.parse(url);
            if (u.getHost() != null) url = (u.getScheme() == null ? "https" : u.getScheme()) + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "");
        } catch (Exception ignored) {}
        while (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        String old = url(c);
        SharedPreferences.Editor e = p(c).edit().putString("url", url).putString("key", key.trim());
        if (old != null && !old.equals(url)) e.remove("access").remove("refresh").remove("exp").remove("uid");
        e.apply();
    }

    static String userId(Context c) { return p(c).getString("uid", null); }
    static String name(Context c) { return p(c).getString("name", null); }
    static int color(Context c) { return p(c).getInt("color", 0); }
    static boolean hasProfile(Context c) { return configured(c) && name(c) != null && userId(c) != null; }

    /** Interrupteur général « partager ma position pendant les trajets ». */
    static boolean shareEnabled(Context c) { return p(c).getBoolean("share", true); }
    static void setShareEnabled(Context c, boolean on) { p(c).edit().putBoolean("share", on).apply(); }
    /** Nombre de groupes connu (dernier chargement), pour éviter des envois inutiles. */
    static int groupCount(Context c) { return p(c).getInt("groups", 0); }
    static boolean sharingActive(Context c) { return hasProfile(c) && shareEnabled(c) && groupCount(c) > 0; }

    // ---------- HTTP ----------

    static String http(Context c, String method, String path, String body, boolean auth) throws Exception {
        return http(c, method, path, body, auth, true);
    }

    private static String http(Context c, String method, String path, String body, boolean auth, boolean retry) throws Exception {
        if (!configured(c)) throw new CloudException("Serveur non configuré");
        HttpURLConnection con = (HttpURLConnection) new URL(url(c) + path).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(15000);
        con.setRequestMethod(method);
        con.setRequestProperty("apikey", key(c));
        con.setRequestProperty("Authorization", "Bearer " + (auth ? token(c) : key(c)));
        con.setRequestProperty("Content-Type", "application/json");
        con.setRequestProperty("Accept", "application/json");
        if (body != null) {
            con.setDoOutput(true);
            OutputStream os = con.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.close();
        }
        int code = con.getResponseCode();
        InputStream in = code >= 400 ? con.getErrorStream() : con.getInputStream();
        String res = "";
        if (in != null) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int r;
            while ((r = in.read(b)) > 0) buf.write(b, 0, r);
            in.close();
            res = buf.toString("UTF-8");
        }
        con.disconnect();
        if (code == 401 && auth && retry) {
            p(c).edit().putLong("exp", 0).apply();
            return http(c, method, path, body, true, false);
        }
        if (code >= 400) throw new CloudException(friendly(res, code));
        return res;
    }

    /** Messages d'erreur compréhensibles. */
    static String friendly(String res, int code) {
        String m = res;
        try {
            JSONObject o = new JSONObject(res);
            m = o.optString("message", o.optString("msg", o.optString("error_description", o.optString("error", res))));
        } catch (Exception ignored) {}
        if (m.contains("invite_invalid")) return "Invitation expirée ou annulée";
        if (m.contains("invite_not_found")) return "Invitation introuvable";
        if (m.contains("not_admin")) return "Réservé aux administrateurs du groupe";
        if (m.contains("not_member")) return "Tu ne fais plus partie de ce groupe";
        if (m.contains("not_owner")) return "Seul le créateur peut supprimer le groupe";
        if (m.contains("too_many_groups")) return "Limite de 20 groupes atteinte";
        if (m.toLowerCase(Locale.ROOT).contains("anonymous")) return "Active « Allow anonymous sign-ins » dans Supabase (Authentication → Sign In / Providers)";
        if (m.contains("Could not find the function") || m.contains("PGRST202")) return "Base pas prête : exécute le fichier schema.sql dans Supabase";
        if (code == 401 || code == 403) return "Accès refusé par le serveur (vérifie l'adresse et la clé)";
        if (code == 404) return "Serveur introuvable (vérifie l'adresse)";
        return m.length() > 160 ? m.substring(0, 160) : m;
    }

    // ---------- Compte (connexion anonyme) ----------

    private static void saveSession(Context c, JSONObject o) throws Exception {
        long exp = System.currentTimeMillis() + o.optLong("expires_in", 3600) * 1000;
        SharedPreferences.Editor e = p(c).edit()
                .putString("access", o.getString("access_token"))
                .putString("refresh", o.getString("refresh_token"))
                .putLong("exp", exp);
        JSONObject u = o.optJSONObject("user");
        if (u != null) e.putString("uid", u.getString("id"));
        e.apply();
    }

    static synchronized void ensureSession(Context c) throws Exception {
        if (p(c).getString("refresh", null) != null) return;
        String res = http(c, "POST", "/auth/v1/signup", "{}", false);
        saveSession(c, new JSONObject(res));
    }

    static synchronized String token(Context c) throws Exception {
        ensureSession(c);
        if (System.currentTimeMillis() > p(c).getLong("exp", 0) - 60_000) {
            JSONObject b = new JSONObject().put("refresh_token", p(c).getString("refresh", ""));
            String res = http(c, "POST", "/auth/v1/token?grant_type=refresh_token", b.toString(), false);
            saveSession(c, new JSONObject(res));
        }
        return p(c).getString("access", "");
    }

    static String rpc(Context c, String fn, JSONObject args) throws Exception {
        return http(c, "POST", "/rest/v1/rpc/" + fn, (args == null ? new JSONObject() : args).toString(), true);
    }

    static void saveProfile(Context c, String name, int color) throws Exception {
        ensureSession(c);
        rpc(c, "save_profile", new JSONObject().put("p_name", name).put("p_color", color));
        p(c).edit().putString("name", name).putInt("color", color).apply();
    }

    // ---------- Groupes ----------

    static JSONArray myGroups(Context c) throws Exception {
        JSONArray a = new JSONArray(rpc(c, "my_groups", null));
        p(c).edit().putInt("groups", a.length()).apply();
        return a;
    }

    static String createGroup(Context c, String name) throws Exception {
        return unquote(rpc(c, "create_group", new JSONObject().put("p_name", name)));
    }

    static JSONObject groupState(Context c, String id) throws Exception {
        return new JSONObject(rpc(c, "group_state", new JSONObject().put("p_group", id)));
    }

    static String createInvite(Context c, String group) throws Exception {
        return unquote(rpc(c, "create_invite", new JSONObject().put("p_group", group)));
    }

    static JSONObject inviteInfo(Context c, String code) throws Exception {
        return new JSONObject(rpc(c, "invite_info", new JSONObject().put("p_code", code)));
    }

    static String acceptInvite(Context c, String code) throws Exception {
        return unquote(rpc(c, "accept_invite", new JSONObject().put("p_code", code)));
    }

    static void call(Context c, String fn, JSONObject args) throws Exception { rpc(c, fn, args); }

    static String unquote(String s) {
        s = s.trim();
        return s.length() >= 2 && s.startsWith("\"") ? s.substring(1, s.length() - 1) : s;
    }

    // ---------- Invitations ----------

    /** Lien d'invitation : contient l'adresse du serveur, sa clé publique et le code. */
    static String inviteLink(Context c, String code) {
        return "trajo://rejoindre?c=" + code + "&u=" + Uri.encode(url(c)) + "&k=" + Uri.encode(key(c));
    }

    /** Extrait {code, url, clé} d'un lien ou d'un message collé (url et clé peuvent être null). */
    static String[] parseInvite(String text) {
        if (text == null) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("trajo://rejoindre\\?\\S+").matcher(text);
        if (m.find()) {
            Uri u = Uri.parse(m.group());
            String code = u.getQueryParameter("c");
            if (code != null) return new String[]{code.toUpperCase(Locale.ROOT), u.getQueryParameter("u"), u.getQueryParameter("k")};
        }
        java.util.regex.Matcher m2 = java.util.regex.Pattern.compile("\\b([A-Za-z0-9]{8})\\b").matcher(text.trim());
        if (text.trim().length() <= 12 && m2.find()) return new String[]{m2.group(1).toUpperCase(Locale.ROOT), null, null};
        return null;
    }

    // ---------- Partage de position (appelé par TripService) ----------

    private static volatile boolean pushing;

    static void pushLive(final Context c, final double lat, final double lon, final float kmh,
                         final long tripStart, final double km, final List<double[]> pts) {
        if (!sharingActive(c) || pushing) return;
        final String trail = trail(pts);
        pushing = true;
        IO.execute(new Runnable() {
            public void run() {
                try {
                    rpc(c, "update_position", new JSONObject()
                            .put("p_live", true).put("p_lat", lat).put("p_lon", lon).put("p_speed", kmh)
                            .put("p_trip_start", iso(tripStart)).put("p_trip_km", km).put("p_trail", trail)
                            .put("p_parked_lat", JSONObject.NULL).put("p_parked_lon", JSONObject.NULL).put("p_parked_at", JSONObject.NULL));
                } catch (Exception ignored) {
                } finally { pushing = false; }
            }
        });
    }

    /** Fin de trajet : plus en direct, voiture garée ici. */
    static void pushParked(final Context c, final double lat, final double lon, final long at) {
        if (!sharingActive(c)) return;
        IO.execute(new Runnable() {
            public void run() {
                try {
                    rpc(c, "update_position", new JSONObject()
                            .put("p_live", false).put("p_lat", JSONObject.NULL).put("p_lon", JSONObject.NULL).put("p_speed", JSONObject.NULL)
                            .put("p_trip_start", JSONObject.NULL).put("p_trip_km", JSONObject.NULL).put("p_trail", JSONObject.NULL)
                            .put("p_parked_lat", lat).put("p_parked_lon", lon).put("p_parked_at", iso(at)));
                } catch (Exception ignored) {}
            }
        });
    }

    /** Les 80 derniers points du trajet, pour dessiner sa trace chez les autres membres. */
    static String trail(List<double[]> pts) {
        StringBuilder sb = new StringBuilder();
        int n = pts.size(), from = Math.max(0, n - 400), step = Math.max(1, (n - from) / 80);
        for (int i = from; i < n; i += step) {
            if (sb.length() > 0) sb.append(';');
            sb.append(String.format(Locale.US, "%.5f,%.5f", pts.get(i)[0], pts.get(i)[1]));
        }
        return sb.toString();
    }

    static String iso(long ts) {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return f.format(new java.util.Date(ts));
    }

    static long parseTs(String s) {
        if (s == null || s.isEmpty() || "null".equals(s)) return 0;
        try { return java.time.OffsetDateTime.parse(s).toInstant().toEpochMilli(); }
        catch (Exception e) {
            try { return java.time.OffsetDateTime.parse(s.replace(" ", "T")).toInstant().toEpochMilli(); }
            catch (Exception e2) { return 0; }
        }
    }
}
