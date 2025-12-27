package com.zinda.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    private static final String HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";

    @PluginMethod
    public void getExerciseMinutes(PluginCall call) {
        // For now, return mock data or 0 if Health Connect is not available
        // Full implementation requires Health Connect SDK and Android 14+
        JSObject result = new JSObject();
        
        // Mock data for demonstration - replace with actual Health Connect API calls
        String period = call.getString("period", "week");
        long mockMinutes = 0;
        
        switch (period) {
            case "today":
                mockMinutes = 45; // Mock: 45 minutes today
                break;
            case "week":
                mockMinutes = 180; // Mock: 180 minutes this week (3 hours)
                break;
            case "month":
                mockMinutes = 720; // Mock: 720 minutes this month (12 hours)
                break;
        }
        
        result.put("totalMinutes", mockMinutes);
        call.resolve(result);
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        // Check if Health Connect app is installed and accessible
        JSObject result = new JSObject();
        boolean hasHealthConnect = false;
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Check if Health Connect is installed
                getContext().getPackageManager().getPackageInfo(HEALTH_CONNECT_PACKAGE, 0);
                hasHealthConnect = true;
            }
        } catch (Exception e) {
            // Health Connect not available
        }
        
        result.put("hasPermission", hasHealthConnect);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        // Open Health Connect app for permissions
        try {
            Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(HEALTH_CONNECT_PACKAGE);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } else {
                // Open Play Store to install Health Connect
                Intent playStoreIntent = new Intent(Intent.ACTION_VIEW);
                playStoreIntent.setData(Uri.parse("market://details?id=" + HEALTH_CONNECT_PACKAGE));
                playStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(playStoreIntent);
            }
        } catch (Exception e) {
            // Fallback: try to open Play Store via browser
            Intent browserIntent = new Intent(Intent.ACTION_VIEW);
            browserIntent.setData(Uri.parse("https://play.google.com/store/apps/details?id=" + HEALTH_CONNECT_PACKAGE));
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(browserIntent);
        }
        call.resolve();
    }
}

