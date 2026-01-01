package com.zinda.app

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.content.ComponentName
import android.content.SharedPreferences

@CapacitorPlugin(name = "AppBlocking")
class AppBlockingPlugin : Plugin() {
    
    companion object {
        private const val TAG = "AppBlockingPlugin"
        private const val PREFS_NAME = "app_blocking_prefs"
        private const val KEY_BLOCKING_ENABLED = "blocking_enabled"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
    }
    
    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    @PluginMethod
    fun isAccessibilityEnabled(call: PluginCall) {
        val isEnabled = isAccessibilityServiceEnabled()
        val result = JSObject()
        result.put("enabled", isEnabled)
        call.resolve(result)
    }
    
    @PluginMethod
    fun requestAccessibilityPermission(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity?.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open accessibility settings", e)
            call.reject("Failed to open accessibility settings: ${e.message}")
        }
    }
    
    @PluginMethod
    fun enableBlocking(call: PluginCall) {
        val packageNames = call.getArray("packageNames")
        
        if (packageNames == null || packageNames.length() == 0) {
            call.reject("packageNames array is required")
            return
        }
        
        val packages = mutableSetOf<String>()
        for (i in 0 until packageNames.length()) {
            val pkg = packageNames.getString(i)
            if (pkg != null) {
                packages.add(pkg)
            }
        }
        
        // Save blocked packages
        prefs.edit()
            .putString(KEY_BLOCKED_PACKAGES, packages.joinToString(","))
            .putBoolean(KEY_BLOCKING_ENABLED, true)
            .apply()
        
        // Update service if it's running
        updateServiceBlockingState(true, packages)
        
        Log.d(TAG, "Blocking enabled for packages: $packages")
        call.resolve()
    }
    
    @PluginMethod
    fun disableBlocking(call: PluginCall) {
        prefs.edit()
            .putBoolean(KEY_BLOCKING_ENABLED, false)
            .apply()
        
        // Update service if it's running
        updateServiceBlockingState(false, emptySet())
        
        Log.d(TAG, "Blocking disabled")
        call.resolve()
    }
    
    @PluginMethod
    fun isBlockingEnabled(call: PluginCall) {
        val isEnabled = prefs.getBoolean(KEY_BLOCKING_ENABLED, false)
        val result = JSObject()
        result.put("enabled", isEnabled)
        
        val packagesString = prefs.getString(KEY_BLOCKED_PACKAGES, null)
        val packages = if (packagesString != null) {
            packagesString.split(",").toList()
        } else {
            emptyList()
        }
        result.put("blockedPackages", JSArray.from(packages))
        
        call.resolve(result)
    }
    
    private fun isAccessibilityServiceEnabled(): Boolean {
        val accessibilityManager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = accessibilityManager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC)
        
        val serviceName = ComponentName(context, AppBlockingService::class.java)
        
        return enabledServices.any { serviceInfo ->
            serviceInfo.resolveInfo.serviceInfo.componentName == serviceName
        }
    }
    
    private fun updateServiceBlockingState(enabled: Boolean, packages: Set<String>) {
        // The service will read from SharedPreferences on next event
        // We can also try to get the service instance, but it's not straightforward
        // The service reads from SharedPreferences, so just updating prefs should be enough
        Log.d(TAG, "Updated blocking state in preferences: enabled=$enabled, packages=$packages")
    }
}

