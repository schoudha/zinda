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
import java.util.TimeZone

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {
    
    companion object {
        private const val TAG = "UsageStatsPlugin"
        private const val TEN_MINUTES_MS = 10 * 60 * 1000L // 10 minutes in milliseconds
    }

    @PluginMethod
    fun getUsage(call: PluginCall) {
        val period = call.getString("period", "today")
        val startHour = call.getInt("startHour", -1) // -1 means no time window filter
        val endHour = call.getInt("endHour", -1)

        val context = context
        val pm = context.packageManager
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        // Use system default timezone explicitly to ensure consistent timezone handling
        val timeZone = TimeZone.getDefault()
        val endCalendar = Calendar.getInstance(timeZone)
        val endTime = endCalendar.timeInMillis
        var startTime: Long
        var intervalType: Int

        when (period) {
            "week" -> {
                val calendar = Calendar.getInstance(timeZone)
                calendar.add(Calendar.DAY_OF_YEAR, -7)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "month" -> {
                val calendar = Calendar.getInstance(timeZone)
                calendar.add(Calendar.DAY_OF_YEAR, -30)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "year" -> {
                val calendar = Calendar.getInstance(timeZone)
                calendar.add(Calendar.DAY_OF_YEAR, -365)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_DAILY
            }
            "today" -> {
                // Get a fresh calendar instance for today's start to ensure correct timezone handling
                // This ensures we get midnight (00:00:00.000) in the device's current timezone
                val calendar = Calendar.getInstance(timeZone)
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
                // Use INTERVAL_BEST for single day queries to get accurate partial-day data
                intervalType = UsageStatsManager.INTERVAL_BEST
            }
            else -> {
                // Default to today's start
                val calendar = Calendar.getInstance(timeZone)
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                startTime = calendar.timeInMillis
                intervalType = UsageStatsManager.INTERVAL_BEST
            }
        }

        val timePerPackage = mutableMapOf<String, Long>()

        // Log timezone info for debugging
        Log.d(TAG, "Querying usage stats for period: $period")
        Log.d(TAG, "Timezone: ${timeZone.id} (${timeZone.displayName})")
        Log.d(TAG, "Time range: startTime=$startTime, endTime=$endTime, interval=$intervalType")
        Log.d(TAG, "Time range (readable): ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS Z", java.util.Locale.getDefault()).format(java.util.Date(startTime))} to ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS Z", java.util.Locale.getDefault()).format(java.util.Date(endTime))}")
        
        // Use queryEvents for all periods to ensure we only track actual foreground usage
        // This prevents counting background usage (e.g., Instagram playing music in background)
        Log.d(TAG, "Using queryEvents for precise foreground-only tracking")
        if (startHour >= 0 && endHour >= 0) {
            Log.d(TAG, "Time window filter: $startHour:00 - $endHour:00")
        }
        
        // Helper function to check if a timestamp falls within the time window (if specified)
        fun isWithinTimeWindow(timestamp: Long): Boolean {
            if (startHour < 0 || endHour < 0) return true // No time window filter
            
            val cal = Calendar.getInstance(timeZone)
            cal.timeInMillis = timestamp
            val hour = cal.get(Calendar.HOUR_OF_DAY)
            
            // Handle case where window spans midnight (e.g., 22-2)
            return if (startHour <= endHour) {
                hour >= startHour && hour < endHour
            } else {
                hour >= startHour || hour < endHour
            }
        }
        
        // Helper function to calculate overlap between a time range and the time window
        fun calculateWindowOverlap(start: Long, end: Long): Long {
            if (startHour < 0 || endHour < 0) return end - start // No time window filter
            
            var overlap: Long = 0
            val cal = Calendar.getInstance(timeZone)
            
            // Process each day that the range spans
            var currentStart = start
            while (currentStart < end) {
                cal.timeInMillis = currentStart
                val dayOfYear = cal.get(Calendar.DAY_OF_YEAR)
                val year = cal.get(Calendar.YEAR)
                
                // Calculate window start for this day
                val windowStartCal = Calendar.getInstance(timeZone)
                windowStartCal.set(Calendar.YEAR, year)
                windowStartCal.set(Calendar.DAY_OF_YEAR, dayOfYear)
                windowStartCal.set(Calendar.HOUR_OF_DAY, startHour)
                windowStartCal.set(Calendar.MINUTE, 0)
                windowStartCal.set(Calendar.SECOND, 0)
                windowStartCal.set(Calendar.MILLISECOND, 0)
                
                // Calculate window end for this day
                val windowEndCal = Calendar.getInstance(timeZone)
                windowEndCal.set(Calendar.YEAR, year)
                windowEndCal.set(Calendar.DAY_OF_YEAR, dayOfYear)
                if (startHour <= endHour) {
                    windowEndCal.set(Calendar.HOUR_OF_DAY, endHour)
                } else {
                    // Window spans midnight, so end is next day
                    windowEndCal.add(Calendar.DAY_OF_YEAR, 1)
                    windowEndCal.set(Calendar.HOUR_OF_DAY, endHour)
                }
                windowEndCal.set(Calendar.MINUTE, 0)
                windowEndCal.set(Calendar.SECOND, 0)
                windowEndCal.set(Calendar.MILLISECOND, 0)
                
                val windowStart = windowStartCal.timeInMillis
                val windowEnd = windowEndCal.timeInMillis
                
                // Calculate overlap for this day
                val overlapStart = maxOf(currentStart, windowStart)
                val overlapEnd = minOf(end, windowEnd)
                
                if (overlapStart < overlapEnd) {
                    overlap += overlapEnd - overlapStart
                }
                
                // Move to start of next day
                cal.add(Calendar.DAY_OF_YEAR, 1)
                cal.set(Calendar.HOUR_OF_DAY, 0)
                cal.set(Calendar.MINUTE, 0)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                currentStart = cal.timeInMillis
            }
            
            return overlap
        }
        
        // 1. Get the raw event stream for the specified period
        val events = usm.queryEvents(startTime, endTime)
        val startMap = mutableMapOf<String, Long>()
        
        while (events.hasNextEvent()) {
            val event = android.app.usage.UsageEvents.Event()
            events.getNextEvent(event)
            val pkg = event.packageName.toLowerCase()

            // Exclude YouTube Music packages
            if (pkg.contains("youtubemusic") || pkg.contains("youtube.music")) {
                continue
            }

            // 2. Track when apps move to foreground (only count when app is actually in use)
            if (event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                startMap[pkg] = event.timeStamp
            } 
            // 3. Calculate duration when they move to background
            else if (event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND) {
                val start = startMap[pkg]
                // Only count if we saw the start event inside our 'startTime' window
                if (start != null && start >= startTime) {
                    // Calculate overlap with time window if specified
                    val duration = if (startHour >= 0 && endHour >= 0) {
                        calculateWindowOverlap(start, event.timeStamp)
                    } else {
                        event.timeStamp - start
                    }
                    if (duration > 0) {
                        timePerPackage[pkg] = (timePerPackage[pkg] ?: 0L) + duration
                    }
                    // Reset for next session
                    startMap.remove(pkg) 
                }
            }
        }

        // 4. Handle apps that are STILL open right now (no background event yet)
        // Only count if the start time is within our query window
        for ((pkg, start) in startMap) {
            if (start >= startTime) {
                // Calculate overlap with time window if specified
                val duration = if (startHour >= 0 && endHour >= 0) {
                    calculateWindowOverlap(start, endTime)
                } else {
                    endTime - start
                }
                if (duration > 0) {
                    timePerPackage[pkg] = (timePerPackage[pkg] ?: 0L) + duration
                }
            }
        }
        
        Log.d(TAG, "Processed event stream for ${timePerPackage.size} packages")

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


