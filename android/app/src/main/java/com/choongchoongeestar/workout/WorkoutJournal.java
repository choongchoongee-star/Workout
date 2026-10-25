package com.choongchoongeestar.workout;

import android.content.Context;
import android.util.AtomicFile;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Fixed app-private journal. No caller-controlled paths or data-reading API. */
public final class WorkoutJournal {
    private final AtomicFile journal;

    public WorkoutJournal(Context context) {
        journal = new AtomicFile(new File(context.getFilesDir(), "workout-data.journal.json"));
    }

    @JavascriptInterface
    public synchronized boolean write(String snapshot) {
        FileOutputStream stream = null;
        try {
            JSONObject data = new JSONObject(snapshot);
            data.getJSONArray("exercises");
            data.getJSONArray("sessions");
            stream = journal.startWrite();
            stream.write(snapshot.getBytes(StandardCharsets.UTF_8));
            stream.getFD().sync();
            journal.finishWrite(stream);
            return true;
        } catch (Exception error) {
            if (stream != null) journal.failWrite(stream);
            return false;
        }
    }

    @JavascriptInterface
    public synchronized void clear(String committedSnapshot) {
        try {
            String current = new String(journal.readFully(), StandardCharsets.UTF_8);
            if (current.equals(committedSnapshot)) journal.delete();
        } catch (Exception ignored) {
            // A retained journal is replayed on launch; never clear a newer write.
        }
    }
}
