package org.osretthanawy.service;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * تنزيل APK التحديث والتحقق منه ثم فتح مثبّت أندرويد.
 * - HTTPS فقط، حد أقصى للحجم، التحقق من SHA-256 (إن وُجدت).
 * - رفض الملف لو اسم الحزمة مختلف أو رقم الإصدار ليس أحدث أو شهادة التوقيع مختلفة (قبل فتح المثبّت).
 * - لا تثبيت صامت: أندرويد نفسه يطلب موافقة المستخدم.
 * لا يحتوي على أي سر أو توكن.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
    private static final long MAX_BYTES = 150L * 1024 * 1024;
    private volatile boolean busy = false;

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, "update.apk");
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getContext().getPackageManager().canRequestPackageInstalls();
        r.put("allowed", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("SETTINGS_FAILED", e);
        }
    }

    /** يُرجع رقم/اسم إصدار التطبيق المثبّت (للعرض والتشخيص). */
    @PluginMethod
    public void currentVersion(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject r = new JSObject();
            r.put("versionCode", versionCode(pi));
            r.put("versionName", pi.versionName == null ? "" : pi.versionName);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("VERSION_FAILED", e);
        }
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url", "");
        final String sha = call.getString("sha256", "");
        if (url == null || !url.startsWith("https://")) {
            call.reject("BAD_URL");
            return;
        }
        if (busy) {
            call.reject("BUSY");
            return;
        }
        busy = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                File out = apkFile();
                try {
                    if (out.exists()) out.delete();
                    HttpURLConnection c = open(url, 0);
                    long total = c.getContentLengthLong();
                    if (total > MAX_BYTES) throw new Err("TOO_BIG");
                    MessageDigest md = MessageDigest.getInstance("SHA-256");
                    long got = 0, lastTick = 0;
                    try (InputStream in = c.getInputStream(); FileOutputStream fo = new FileOutputStream(out)) {
                        byte[] buf = new byte[32 * 1024];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            got += n;
                            if (got > MAX_BYTES) throw new Err("TOO_BIG");
                            fo.write(buf, 0, n);
                            md.update(buf, 0, n);
                            long now = System.currentTimeMillis();
                            if (now - lastTick > 250) {
                                lastTick = now;
                                JSObject p = new JSObject();
                                p.put("received", got);
                                p.put("total", total);
                                notifyListeners("progress", p);
                            }
                        }
                    }
                    if (got < 100 * 1024) throw new Err("BAD_FILE");
                    String hex = hex(md.digest());
                    if (sha != null && sha.length() == 64 && !sha.equalsIgnoreCase(hex)) throw new Err("HASH_MISMATCH");
                    verifyApk(out);
                    JSObject r = new JSObject();
                    r.put("sha256", hex);
                    r.put("bytes", got);
                    call.resolve(r);
                } catch (Err e) {
                    out.delete();
                    call.reject(e.code);
                } catch (Exception e) {
                    out.delete();
                    call.reject("DOWNLOAD_FAILED", e);
                } finally {
                    busy = false;
                }
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getContext().getPackageManager().canRequestPackageInstalls()) {
                call.reject("NEEDS_PERMISSION");
                return;
            }
            File f = apkFile();
            if (!f.exists()) {
                call.reject("NO_FILE");
                return;
            }
            verifyApk(f); // إعادة تحقق قبل الفتح
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Err e) {
            call.reject(e.code);
        } catch (Exception e) {
            call.reject("INSTALL_FAILED", e);
        }
    }

    // ---------- helpers ----------
    private static class Err extends Exception {
        final String code;
        Err(String c) { super(c); code = c; }
    }

    private HttpURLConnection open(String url, int depth) throws Exception {
        if (depth > 5) throw new Err("TOO_MANY_REDIRECTS");
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        int code = c.getResponseCode();
        if (code >= 300 && code < 400) {
            String loc = c.getHeaderField("Location");
            c.disconnect();
            if (loc == null || !loc.startsWith("https://")) throw new Err("BAD_REDIRECT");
            return open(loc, depth + 1);
        }
        if (code != 200) throw new Err("HTTP_" + code);
        return c;
    }

    private static long versionCode(PackageInfo pi) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? pi.getLongVersionCode() : pi.versionCode;
    }

    private static Set<String> certs(PackageInfo pi) throws Exception {
        Signature[] sigs;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (pi.signingInfo == null) return new HashSet<>();
            sigs = pi.signingInfo.hasMultipleSigners() ? pi.signingInfo.getApkContentsSigners()
                    : pi.signingInfo.getSigningCertificateHistory();
        } else {
            sigs = pi.signatures;
        }
        Set<String> s = new HashSet<>();
        if (sigs != null) for (Signature g : sigs) s.add(hex(MessageDigest.getInstance("SHA-256").digest(g.toByteArray())));
        return s;
    }

    @SuppressWarnings("deprecation")
    private void verifyApk(File f) throws Exception {
        PackageManager pm = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo n = pm.getPackageArchiveInfo(f.getAbsolutePath(), flags);
        if (n == null) throw new Err("BAD_FILE");
        if (!getContext().getPackageName().equals(n.packageName)) throw new Err("WRONG_PACKAGE");
        PackageInfo cur = pm.getPackageInfo(getContext().getPackageName(), flags);
        if (versionCode(n) <= versionCode(cur)) throw new Err("NOT_NEWER");
        Set<String> a = certs(n), b = certs(cur);
        if (a.isEmpty() || b.isEmpty() || Collections_disjoint(a, b)) throw new Err("SIGNATURE_MISMATCH");
    }

    private static boolean Collections_disjoint(Set<String> a, Set<String> b) {
        for (String x : a) if (b.contains(x)) return false;
        return true;
    }

    private static String hex(byte[] d) {
        StringBuilder sb = new StringBuilder();
        for (byte x : d) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
