package com.choongchoongeestar.workout;

import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;

import android.app.LocaleManager;
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

    @Test
    public void nativeStorageTimerBackupAndLanguage() throws Exception {
        assumeTrue("Requires a disposable emulator and explicit fixture-reset opt-in",
            android.os.Build.VERSION.SDK_INT >= 33 &&
            (android.os.Build.FINGERPRINT.contains("generic") || android.os.Build.MODEL.startsWith("Android SDK built for")) &&
            "true".equals(InstrumentationRegistry.getArguments().getString("allowFixtureReset")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.choongchoongeestar.workout", context.getPackageName());
        context.getSystemService(LocaleManager.class).setApplicationLocales(LocaleList.forLanguageTags("en"));
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
            clickLabel("Increase kg by 2.5");
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
            context.getSystemService(LocaleManager.class).setApplicationLocales(LocaleList.forLanguageTags("ko"));
            scenario.recreate();
            until("document.documentElement.lang==='ko'");
            until("document.body.innerText.includes('벤치프레스')");
            assertEquals(11, new JSONObject(new String(Files.readAllBytes(data.toPath()), StandardCharsets.UTF_8)).getJSONArray("sessions").getJSONObject(0)
                .getJSONArray("exercises").getJSONObject(0).getJSONArray("sets").getJSONObject(0).getInt("reps"));
        } finally {
            if (scenario != null) scenario.close();
        }
    }
}
