package com.zinda.app.platform.services

import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityManager
import android.accessibilityservice.AccessibilityServiceInfo
import com.zinda.app.AppBlockingService

data class BlockingState(
    val enabled: Boolean,
    val blockedPackages: List<String>,
    val accessibilityEnabled: Boolean
)

class AppBlockingManager(context: Context) {
    private val appContext = context.applicationContext
    private val prefs: SharedPreferences =
        appContext.getSharedPreferences("app_blocking_prefs", Context.MODE_PRIVATE)

    fun setEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("blocking_enabled", enabled).apply()
    }

    fun setBlockedPackages(packages: List<String>) {
        prefs.edit().putString("blocked_packages", packages.joinToString(",")).apply()
    }

    fun getState(): BlockingState {
        val blocked = prefs.getString("blocked_packages", "")?.split(",")?.filter { it.isNotBlank() }.orEmpty()
        val enabled = prefs.getBoolean("blocking_enabled", false)
        return BlockingState(enabled, blocked, isAccessibilityEnabled())
    }

    private fun isAccessibilityEnabled(): Boolean {
        val manager = appContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val serviceName = ComponentName(appContext.packageName, AppBlockingService::class.java.name)
        val services = manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC)
        return services.any {
            val componentName = ComponentName(it.resolveInfo.serviceInfo.packageName, it.resolveInfo.serviceInfo.name)
            componentName == serviceName
        }
    }
}
