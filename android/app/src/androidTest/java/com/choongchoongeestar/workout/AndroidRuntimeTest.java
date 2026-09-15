package com.choongchoongeestar.workout;

import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;

import android.app.LocaleManager;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.NotificationManager;
import android.service.notification.StatusBarNotification;
import androidx.lifecycle.Lifecycle;
import android.content.Intent;
import android.net.Uri;
import android.content.Context;
import android.os.LocaleList;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs only on the dedicated emulator: exercises real WebView and native plugins. */
@RunWith(AndroidJUnit4.class)
public class AndroidRuntimeTest {
    private ActivityScenario<MainActivity> scenario;

    private String js(String expression) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
            expression, result -> { value.set(result); done.countDown(); }));
        assertTrue("JavaScript callback timed out", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    private void until(String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(js(expression))) return;
            SystemClock.sleep(150);
        }
        fail("Condition failed: " + expression + "\nDOM: " + js("document.body.innerText"));
    }

    private void clickLabel(String label) throws Exception {
        String selector = "[aria-label=\"" + label + "\"]";
        until("!!document.querySelector(" + JSONObject.quote(selector) + ")");
        js("document.querySelector(" + JSONObject.quote(selector) + ").click()");
    }

    private void tab(String path) throws Exception {
        js("document.querySelector('a[href=\"" + path + "\"]').click()");
        until("location.pathname === '" + path + "'");
    }

    private void button(String label) throws Exception {
        String expression = "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===" + JSONObject.quote(label) + ")";
        until("!!(" + expression + ")");
        js(expression + ".click()");
    }

    private void touchButton(String label) throws Exception {
        String expression = "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===" + JSONObject.quote(label) + ")";
        touchElement(expression);
    }

    private void touchElement(String expression) throws Exception {
        java.util.concurrent.atomic.AtomicBoolean focused = new java.util.concurrent.atomic.AtomicBoolean();
        long focusDeadline = SystemClock.elapsedRealtime() + 5000;
        do {
            scenario.onActivity(activity -> focused.set(activity.hasWindowFocus()));
            if (focused.get()) break;
            SystemClock.sleep(100);
        } while (SystemClock.elapsedRealtime() < focusDeadline);
        assertTrue("Activity window must be focused before injecting touch", focused.get());
        js(expression + ".scrollIntoView({block:'center'})");
        js("window.touchReady=false; requestAnimationFrame(()=>requestAnimationFrame(()=>window.touchReady=true))");
        until("window.touchReady===true");
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        JSONObject point = new JSONObject(js("(() => { const r=(" + expression + ").getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()"));
        float[] coordinates = new float[2];
        scenario.onActivity(activity -> {
            int[] location = new int[2];
            activity.getBridge().getWebView().getLocationOnScreen(location);
            float density = activity.getResources().getDisplayMetrics().density;
            coordinates[0] = location[0] + (float) point.optDouble("x") * density;
            coordinates[1] = location[1] + (float) point.optDouble("y") * density;
        });
        long now = SystemClock.uptimeMillis();
        var automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        var down = android.view.MotionEvent.obtain(now, now, android.view.MotionEvent.ACTION_DOWN, coordinates[0], coordinates[1], 0);
        var up = android.view.MotionEvent.obtain(now, now + 60, android.view.MotionEvent.ACTION_UP, coordinates[0], coordinates[1], 0);
        down.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
        up.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
        assertTrue(automation.injectInputEvent(down, true));
        SystemClock.sleep(60);
        assertTrue(automation.injectInputEvent(up, true));
        down.recycle(); up.recycle();
    }

    private void keyboardVisible(boolean expected) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 7000;
        java.util.concurrent.atomic.AtomicBoolean shown = new java.util.concurrent.atomic.AtomicBoolean(!expected);
        while (SystemClock.elapsedRealtime() < deadline) {
            scenario.onActivity(activity -> {
                var insets = androidx.core.view.ViewCompat.getRootWindowInsets(activity.getBridge().getWebView());
                shown.set(insets != null && insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime()));
            });
            if (shown.get() == expected) return;
            SystemClock.sleep(100);
        }
        assertEquals("Keyboard visibility", expected, shown.get());
    }

    private void captureStoreScreen(Context context, String name) throws Exception {
        if (!"true".equals(InstrumentationRegistry.getArguments().getString("captureStoreScreens"))) return;
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        js("window.captureReady=false; requestAnimationFrame(()=>requestAnimationFrame(()=>window.captureReady=true))");
        until("window.captureReady===true");
        var bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull("Screenshot unavailable", bitmap);
        try (var output = new java.io.FileOutputStream(new File(context.getExternalFilesDir(null), name + ".png"))) {
            assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, output));
        } finally { bitmap.recycle(); }
    }

    private void setLanguage(Context context, String language) {
        context.getSystemService(LocaleManager.class).setApplicationLocales(LocaleList.forLanguageTags(language));
        long deadline = SystemClock.elapsedRealtime() + 10000;
        while (!language.equals(context.getResources().getConfiguration().getLocales().get(0).getLanguage()) && SystemClock.elapsedRealtime() < deadline) {
            SystemClock.sleep(100);
        }
        assertEquals(language, context.getResources().getConfiguration().getLocales().get(0).getLanguage());
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }

    // The real app produces and consumes the content URI. Only the external
    // share receiver/file picker result is supplied by the instrumentation.
    private void backupRoundTrip(Context context, File data) throws Exception {
        AtomicReference<Uri> exportedUri = new AtomicReference<>();
        CountDownLatch exported = new CountDownLatch(1);
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        Instrumentation.ActivityMonitor share = new Instrumentation.ActivityMonitor() {
            @Override public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                if (!Intent.ACTION_CHOOSER.equals(intent.getAction())) return null;
                Intent send = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
                assertEquals(Intent.ACTION_SEND, send.getAction());
                assertTrue((send.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0);
                Uri uri = send.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
                if (uri == null) uri = send.getClipData().getItemAt(0).getUri();
                exportedUri.set(uri);
                exported.countDown();
                return new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent());
            }
        };
        instrumentation.addMonitor(share);
        try {
            button("Export workouts (.md)");
            assertTrue("Share intent not received", exported.await(10, TimeUnit.SECONDS));
            until("document.body.innerText.includes('Export complete')");
        } finally { instrumentation.removeMonitor(share); }
        Uri uri = exportedUri.get();
        assertEquals("content", uri.getScheme());
        String markdown;
        try (var input = context.getContentResolver().openInputStream(uri)) {
            markdown = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        assertTrue(markdown.contains("workout-backup:v1"));
        assertTrue(markdown.contains("42.5kg × 11 reps"));
        scenario.close();
        Files.write(data.toPath(), "{\"version\":1,\"exercises\":[],\"sessions\":[]}".getBytes(StandardCharsets.UTF_8));
        scenario = ActivityScenario.launch(MainActivity.class);
        until("!!document.querySelector('a[href=\"/settings\"]')");
        tab("/settings");
        Instrumentation.ActivityMonitor picker = new Instrumentation.ActivityMonitor() {
            @Override public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                if (!Intent.ACTION_GET_CONTENT.equals(intent.getAction()) && !Intent.ACTION_OPEN_DOCUMENT.equals(intent.getAction())) return null;
                return new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
            }
        };
        instrumentation.addMonitor(picker);
        try {
            touchButton("Import workouts (.md)");
            until("!!document.querySelector('[aria-label=\"Import preview\"]')");
            button("Import");
            until("document.body.innerText.includes('Sessions added: 1')");
            touchButton("Import workouts (.md)");
            until("document.body.innerText.includes('Every date already has a workout')");
            button("Cancel");
        } finally { instrumentation.removeMonitor(picker); }
        tab("/session");
        until("!!document.querySelector('[aria-label=\"Edit reps: 11 reps\"]')");
        long deadline = SystemClock.elapsedRealtime() + 10000;
        while (new JSONObject(new String(Files.readAllBytes(data.toPath()), StandardCharsets.UTF_8)).getJSONArray("sessions").length() != 1 && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(100);
        assertEquals(1, new JSONObject(new String(Files.readAllBytes(data.toPath()), StandardCharsets.UTF_8)).getJSONArray("sessions").length());
    }

    private void backgroundAlert(Context context) throws Exception {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.cancelAll();
        js("localStorage.setItem('wl_rest_seconds','10')");
        clickLabel("Mark set as complete");
        until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
        long pendingDeadline = SystemClock.elapsedRealtime() + 7000;
        do {
            js("window.probe=null; Capacitor.nativePromise('LocalNotifications','getPending',{}).then(x=>window.probe=x.notifications.length)");
            until("window.probe!==null");
            if ("1".equals(js("window.probe"))) break;
            SystemClock.sleep(100);
        } while (SystemClock.elapsedRealtime() < pendingDeadline);
        assertEquals("1", js("window.probe"));
        scenario.moveToState(Lifecycle.State.CREATED);
        long deadline = SystemClock.elapsedRealtime() + 90000;
        StatusBarNotification delivered = null;
        while (SystemClock.elapsedRealtime() < deadline && delivered == null) {
            for (StatusBarNotification notification : manager.getActiveNotifications()) {
                if (notification.getId() == 1101) delivered = notification;
            }
            SystemClock.sleep(200);
        }
        assertNotNull("Rest notification did not arrive while app was stopped", delivered);
        assertEquals("Rest complete", delivered.getNotification().extras.getString("android.title"));
        var channel = manager.getNotificationChannel(delivered.getNotification().getChannelId());
        assertNotNull("Notification channel has no configured sound", channel.getSound());
        scenario.moveToState(Lifecycle.State.RESUMED);
        until("!document.querySelector('[aria-label=\"Rest timer\"]')");
        manager.cancelAll();
    }

    @Test
    public void nativeStorageTimerBackupAndLanguage() throws Exception {
        assumeTrue("Requires a disposable emulator and explicit fixture-reset opt-in",
            android.os.Build.VERSION.SDK_INT >= 33 &&
            (android.os.Build.FINGERPRINT.contains("generic") || android.os.Build.MODEL.startsWith("Android SDK built for")) &&
            "true".equals(InstrumentationRegistry.getArguments().getString("allowFixtureReset")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.choongchoongeestar.workout", context.getPackageName());
        // This scenario tests granted notifications; denial is exercised separately.
        // Gradle reinstalls the APK, so never depend on a previous emulator grant.
        InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(
            context.getPackageName(), android.Manifest.permission.POST_NOTIFICATIONS);
        setLanguage(context, "en");
        String today = java.time.LocalDate.now().toString();
        File data = new File(context.getFilesDir(), "workout-data.json");
        String fixture = "{\"version\":1,\"exercises\":[{\"id\":\"bench-press\",\"name\":\"Bench Press\",\"category\":\"Chest\",\"type\":\"weight\"}],\"sessions\":[{\"id\":\"" + today + "\",\"date\":\"" + today + "\",\"duration_min\":40,\"exercises\":[{\"exerciseId\":\"bench-press\",\"equipment\":\"barbell\",\"sets\":[{\"weight\":40,\"reps\":10,\"done\":false}]}]}]}";
        Files.write(data.toPath(), fixture.getBytes(StandardCharsets.UTF_8));
        try {
            scenario = ActivityScenario.launch(MainActivity.class);
            until("document.body.innerText.includes('Bench Press')");
            assertEquals("\"android\"", js("Capacitor.getPlatform()"));
            js("localStorage.setItem('wl_rest_seconds', '60')");
            clickLabel("Increase reps by 1");
            until("!!document.querySelector('[aria-label=\"Edit reps: 11 reps\"]')");
            clickLabel("Increase kg by 2.5");
            until("document.body.innerText.includes('42.5')");
            clickLabel("Mark set as complete");
            until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
            for (String path : new String[]{"/history", "/weight", "/settings", "/session"}) {
                tab(path);
                until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
            }
            js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Skip').click()");
            until("!document.querySelector('[aria-label=\"Rest timer\"]')");
            long deadline = SystemClock.elapsedRealtime() + 10000;
            JSONObject saved = null;
            while (SystemClock.elapsedRealtime() < deadline) {
                saved = new JSONObject(new String(Files.readAllBytes(data.toPath()), StandardCharsets.UTF_8)).getJSONArray("sessions").getJSONObject(0)
                    .getJSONArray("exercises").getJSONObject(0).getJSONArray("sets").getJSONObject(0);
                if (saved.getInt("reps") == 11 && saved.getBoolean("done")) break;
                SystemClock.sleep(150);
            }
            assertEquals(11, saved.getInt("reps"));
            assertEquals(42.5, saved.getDouble("weight"), 0.001);
            assertTrue(saved.getBoolean("done"));
            clickLabel("Mark set as incomplete");
            until("!!document.querySelector('[aria-label=\"Mark set as complete\"]')");
            clickLabel("Mark set as complete");
            until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
            scenario.recreate();
            until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
            button("Skip");
            until("!document.querySelector('[aria-label=\"Rest timer\"]')");
            scenario.close();
            scenario = ActivityScenario.launch(MainActivity.class);
            until("document.body.innerText.includes('Bench Press')");
            until("!!document.querySelector('[aria-label=\"Edit reps: 11 reps\"]')");
            js("window.probe=null; Capacitor.nativePromise('AppSettings','getLanguage',{}).then(x=>window.probe=x.language).catch(e=>window.probe='ERROR:'+e.message)");
            until("typeof window.probe==='string'");
            assertTrue(js("window.probe").startsWith("\"en"));
            js("window.probe=null; Capacitor.nativePromise('Filesystem','writeFile',{path:'runtime-backup.md',directory:'CACHE',encoding:'utf8',data:'# Runtime backup\\n42.5 kg × 11 회'}).then(()=>Capacitor.nativePromise('Filesystem','readFile',{path:'runtime-backup.md',directory:'CACHE',encoding:'utf8'})).then(x=>window.probe=x.data).catch(e=>window.probe='ERROR:'+e.message)");
            until("typeof window.probe==='string'");
            assertTrue(js("window.probe").contains("42.5 kg × 11 회"));
            js("window.probe=null; Capacitor.nativePromise('LocalNotifications','getPending',{}).then(x=>window.probe=x.notifications.length).catch(e=>window.probe='ERROR:'+e.message)");
            until("window.probe!==null");
            assertEquals("0", js("window.probe"));
            captureStoreScreen(context, "01-workout-en");
            tab("/history");
            captureStoreScreen(context, "02-history-en");
            tab("/settings");
            until("document.body.innerText.includes('Google Play')");
            captureStoreScreen(context, "03-settings-en");
            assertEquals("false", js("document.body.innerText.includes('Check for updates')"));
            js("document.querySelector('a[href=\"/privacy\"]').click()");
            until("location.pathname==='/privacy'");
            assertEquals("true", js("window.history.state.idx > 0"));
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            until("location.pathname==='/settings'");
            backupRoundTrip(context, data);
            clickLabel("Mark set as incomplete");
            clickLabel("Edit reps: 11 reps");
            until("!!document.querySelector('dialog[open]')");
            touchElement("document.querySelector('dialog input')");
            keyboardVisible(true);
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            keyboardVisible(false);
            until("!!document.querySelector('dialog[open]')");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            until("!document.querySelector('dialog[open]')");
            until("location.pathname==='/session'");
            backgroundAlert(context);
            // LocaleManager can recreate the activity itself. Close before changing
            // language so an explicit recreate cannot race the OS recreation.
            scenario.close();
            setLanguage(context, "ko");
            scenario = ActivityScenario.launch(MainActivity.class);
            until("document.documentElement.lang==='ko'");
            until("document.body.innerText.includes('벤치프레스')");
            captureStoreScreen(context, "04-workout-ko");
            assertEquals(11, new JSONObject(new String(Files.readAllBytes(data.toPath()), StandardCharsets.UTF_8)).getJSONArray("sessions").getJSONObject(0)
                .getJSONArray("exercises").getJSONObject(0).getJSONArray("sets").getJSONObject(0).getInt("reps"));
        } finally {
            if (scenario != null) scenario.close();
        }
    }

    @Test
    public void deniedNotificationsKeepWorkoutUsable() throws Exception {
        assumeTrue("Run separately after revoking POST_NOTIFICATIONS on the disposable emulator",
            "true".equals(InstrumentationRegistry.getArguments().getString("testDeniedPermission")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        setLanguage(context, "en");
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            until("!!document.querySelector('a[href=\"/settings\"]')");
            tab("/settings");
            until("document.body.innerText.includes('Disabled')");
            button("Enable alerts");
            until("document.body.innerText.includes('Notifications are blocked')");
            assertEquals("false", js("document.body.innerText.includes('iPhone Settings')"));
            tab("/session");
            until("document.body.innerText.includes('Bench Press')");
            clickLabel("Mark set as incomplete");
            js("localStorage.setItem('wl_rest_seconds','60')");
            clickLabel("Mark set as complete");
            until("!!document.querySelector('[aria-label=\"Rest timer\"]')");
            button("Skip");
            until("!document.querySelector('[aria-label=\"Rest timer\"]')");
        } finally { scenario.close(); }
    }
}
