package com.zinda.app;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import com.getcapacitor.JSArray;
import android.provider.Settings;
import android.os.Process;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    @PluginMethod
    public void getUsage(PluginCall call) {
        String period = call.getString("period", "today");

        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        
        Calendar calendar = Calendar.getInstance();
        long endTime = calendar.getTimeInMillis();
        long startTime;

        switch (period) {
            case "week":
                calendar.add(Calendar.DAY_OF_YEAR, -7);
                startTime = calendar.getTimeInMillis();
                break;
            case "month":
                calendar.add(Calendar.DAY_OF_YEAR, -30);
                startTime = calendar.getTimeInMillis();
                break;
            case "year":
                calendar.add(Calendar.DAY_OF_YEAR, -365);
                startTime = calendar.getTimeInMillis();
                break;
            case "today":
            default:
                // Start of today (00:00:00)
                calendar.set(Calendar.HOUR_OF_DAY, 0);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                startTime = calendar.getTimeInMillis();
                break;
        }

        Map<String, UsageStats> usageStatsMap = usm.queryAndAggregateUsageStats(
            startTime,
            endTime
        );

        JSObject result = new JSObject();
        long totalScreenTime = 0;
        JSArray apps = new JSArray();

        if (usageStatsMap != null && !usageStatsMap.isEmpty()) {
            for (UsageStats stats : usageStatsMap.values()) {
                if (stats.getTotalTimeInForeground() > 0) {
                    String packageName = stats.getPackageName();
                    
                    // Filter out system apps/services that don't have a launch intent
                    Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
                    if (launchIntent == null) {
                        continue;
                    }
                    
                    // Explicitly filter out known non-consumer apps
                    if (packageName.equals("com.android.systemui") || 
                        packageName.equals("android") ||
                        packageName.equals("com.google.android.googlequicksearchbox") ||
                        packageName.contains("launcher") ||
                        packageName.contains("nexuslauncher") ||
                        packageName.contains("pixellauncher")) {
                        continue;
                    }

                    boolean isSystem = false;
                    boolean isUpdatedSystem = false;

                    try {
                        ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
                        isSystem = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                        isUpdatedSystem = (appInfo.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0;
                    } catch (PackageManager.NameNotFoundException e) {
                        // ignore
                    }

                    JSObject appObj = new JSObject();
                    appObj.put("packageName", packageName);
                    appObj.put("time", stats.getTotalTimeInForeground());
                    appObj.put("isSystem", isSystem);
                    appObj.put("isUpdatedSystem", isUpdatedSystem);
                    
                    apps.put(appObj);
                    
                    totalScreenTime += stats.getTotalTimeInForeground();
                }
            }
        }
        
        result.put("totalTime", totalScreenTime);
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        Context context = getContext();
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        );
        
        JSObject ret = new JSObject();
        ret.put("hasPermission", mode == AppOpsManager.MODE_ALLOWED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}

