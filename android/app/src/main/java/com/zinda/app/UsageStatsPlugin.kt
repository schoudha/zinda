package com.zinda.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {

    @PluginMethod
    fun getUsage(call: PluginCall) {
        val period = call.getString("period", "today")

        val context = context
        val pm = context.packageManager
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val calendar = Calendar.getInstance()
        val endTime = calendar.timeInMillis
        var startTime: Long

        when (period) {
            "week" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -7)
                startTime = calendar.timeInMillis
            }
            "month" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -30)
                startTime = calendar.timeInMillis
            }
            "year" -> {
                calendar.add(Calendar.DAY_OF_YEAR, -365)
                startTime = calendar.timeInMillis
            }
            "today" -> {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
            }
            else -> {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
            }
        }

        val usageStatsMap = usm.queryAndAggregateUsageStats(startTime, endTime)

        val result = JSObject()
        var totalScreenTime: Long = 0
        val apps = JSArray()

        if (usageStatsMap != null && usageStatsMap.isNotEmpty()) {
            for (stats in usageStatsMap.values) {
                if (stats.totalTimeInForeground > 0) {
                    val packageName = stats.packageName

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

                    val appObj = JSObject()
                    appObj.put("packageName", packageName)
                    appObj.put("time", stats.totalTimeInForeground)
                    appObj.put("isSystem", isSystem)
                    appObj.put("isUpdatedSystem", isUpdatedSystem)

                    apps.put(appObj)

                    totalScreenTime += stats.totalTimeInForeground
                }
            }
        }

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

