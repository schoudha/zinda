package com.zinda.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {
    
    companion object {
        private const val TAG = "UsageStatsPlugin"
        private const val TEN_MINUTES_MS = 10 * 60 * 1000L // 10 minutes in milliseconds
    }

    @PluginMethod
    fun getUsage(call: PluginCall) {
        val period = call.getString("period", "today")

        val context = context
        val pm = context.packageManager
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val calendar = Calendar.getInstance()
        val endTime = calendar.timeInMillis
        var startTime: Long
        var intervalType: Int

        when (period) {
            "week" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -7)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "month" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -30)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "year" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -365)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "today" -> {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
                // Use INTERVAL_BEST for single day queries to get accurate partial-day data
                intervalType = UsageStatsManager.INTERVAL_BEST
            }
            else -> {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_BEST
            }
        }

        val timePerPackage = mutableMapOf<String, Long>()

        Log.d(TAG, "Querying usage stats for period: $period (startTime: $startTime, endTime: $endTime, interval: $intervalType)")
        
        // For "today" queries, use queryAndAggregateUsageStats which handles single-day ranges correctly
        // For multi-day queries (week/month/year), use queryUsageStats and manually aggregate
        if (period == "today") {
            val usageStatsMap = usm.queryAndAggregateUsageStats(startTime, endTime)
            Log.d(TAG, "Using queryAndAggregateUsageStats for today query")
            
            if (usageStatsMap != null && usageStatsMap.isNotEmpty()) {
                Log.d(TAG, "Retrieved ${usageStatsMap.size} aggregated usage stats")
                for ((pkg, stats) in usageStatsMap) {
                    if (stats.totalTimeInForeground > 0) {
                        val minutes = stats.totalTimeInForeground / (60 * 1000)
                        Log.d(TAG, "Aggregated stats: $pkg = ${stats.totalTimeInForeground}ms (${minutes}m)")
                        timePerPackage[pkg] = stats.totalTimeInForeground
                    }
                }
                Log.d(TAG, "Processed ${timePerPackage.size} packages with usage > 0")
            } else {
                Log.w(TAG, "Usage stats map is null or empty")
            }
        } else {
            // For multi-day queries, use queryUsageStats and manually aggregate daily buckets
            val usageStatsList = usm.queryUsageStats(intervalType, startTime, endTime)
            
            if (usageStatsList != null) {
                Log.d(TAG, "Retrieved ${usageStatsList.size} usage stats entries for multi-day query")
                for (stats in usageStatsList) {
                    if (stats.totalTimeInForeground > 0) {
                        val pkg = stats.packageName
                        val current = timePerPackage[pkg] ?: 0L
                        timePerPackage[pkg] = current + stats.totalTimeInForeground
                        Log.d(TAG, "Processing stats: $pkg = ${stats.totalTimeInForeground}ms (accumulated: ${timePerPackage[pkg]}ms)")
                    }
                }
                Log.d(TAG, "Aggregated ${timePerPackage.size} unique packages")
            } else {
                Log.w(TAG, "Usage stats list is null")
            }
        }

        val result = JSObject()
        var totalScreenTime: Long = 0
        val apps = JSArray()

        if (timePerPackage.isNotEmpty()) {
            for ((packageName, time) in timePerPackage) {
                // Filter out system apps/services that don't have a launch intent
                val launchIntent = pm.getLaunchIntentForPackage(packageName)
                if (launchIntent == null) {
                    continue
                }

                // Explicitly filter out known non-consumer apps
                if (packageName == "com.android.systemui" ||
                    packageName == "android" ||
                    packageName == "com.google.android.googlequicksearchbox" ||
                    packageName.contains("launcher") ||
                    packageName.contains("nexuslauncher") ||
                    packageName.contains("pixellauncher")) {
                    continue
                }

                var isSystem = false
                var isUpdatedSystem = false

                try {
                    val appInfo = pm.getApplicationInfo(packageName, 0)
                    isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                    isUpdatedSystem = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
                } catch (e: PackageManager.NameNotFoundException) {
                    // ignore
                }

                // Log apps with usage above 10 minutes
                if (time > TEN_MINUTES_MS) {
                    val minutes = time / (60 * 1000)
                    val hours = minutes / 60
                    val remainingMinutes = minutes % 60
                    val timeString = if (hours > 0) {
                        "${hours}h ${remainingMinutes}m"
                    } else {
                        "${minutes}m"
                    }
                    Log.d(TAG, "App usage > 10min: $packageName = $timeString (${time}ms) [System: $isSystem, UpdatedSystem: $isUpdatedSystem]")
                }

                val appObj = JSObject()
                appObj.put("packageName", packageName)
                appObj.put("time", time)
                appObj.put("isSystem", isSystem)
                appObj.put("isUpdatedSystem", isUpdatedSystem)

                apps.put(appObj)

                totalScreenTime += time
            }
        }

        Log.d(TAG, "Total screen time: ${totalScreenTime}ms (${totalScreenTime / (60 * 1000)} minutes)")
        Log.d(TAG, "Total apps returned: ${apps.length()}")
        
        result.put("totalTime", totalScreenTime)
        result.put("apps", apps)
        call.resolve(result)
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val context = context
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )

        val ret = JSObject()
        ret.put("hasPermission", mode == AppOpsManager.MODE_ALLOWED)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }
}


