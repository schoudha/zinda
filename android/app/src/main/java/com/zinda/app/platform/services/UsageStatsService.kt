package com.zinda.app.platform.services

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import java.util.Calendar

data class UsageSummary(
    val totalMillis: Long,
    val topPackages: List<Pair<String, Long>>
)

class UsageStatsService(private val context: Context) {
    fun hasPermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun getTodaySummary(): UsageSummary {
        if (!hasPermission()) return UsageSummary(0, emptyList())
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val startCalendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val stats = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startCalendar.timeInMillis, end)
        val top = stats
            .filter { it.totalTimeInForeground > 0L }
            .sortedByDescending { it.totalTimeInForeground }
            .take(5)
            .map { it.packageName to it.totalTimeInForeground }
        val total = top.sumOf { it.second }
        return UsageSummary(total, top)
    }
}
