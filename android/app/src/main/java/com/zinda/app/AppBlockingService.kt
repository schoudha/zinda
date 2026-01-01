package com.zinda.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import android.content.SharedPreferences

class AppBlockingService : AccessibilityService() {
    
    companion object {
        private const val TAG = "AppBlockingService"
        private const val PREFS_NAME = "app_blocking_prefs"
        private const val KEY_BLOCKING_ENABLED = "blocking_enabled"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val NOTIFICATION_CHANNEL_ID = "app_blocking_channel"
        private const val NOTIFICATION_ID = 1
        
        // Default blocked apps
        private val DEFAULT_BLOCKED_PACKAGES = setOf(
            "com.twitter.android",      // X (Twitter)
            "com.instagram.android",     // Instagram
            "com.google.android.youtube", // YouTube
            "com.facebook.katana"        // Facebook
        )
    }
    
    private lateinit var prefs: SharedPreferences
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        Log.d(TAG, "AppBlockingService connected")
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        
        // Check if blocking is enabled
        if (!isBlockingEnabled()) {
            return
        }
        
        // Only process window state changes (app launches)
        if (event.eventType == TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString()
            if (packageName != null && isBlockedPackage(packageName)) {
                Log.d(TAG, "Blocking app: $packageName")
                blockApp(packageName)
            }
        }
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
    }
    
    private fun isBlockingEnabled(): Boolean {
        return prefs.getBoolean(KEY_BLOCKING_ENABLED, false)
    }
    
    private fun getBlockedPackages(): Set<String> {
        val packagesString = prefs.getString(KEY_BLOCKED_PACKAGES, null)
        return if (packagesString != null) {
            packagesString.split(",").toSet()
        } else {
            DEFAULT_BLOCKED_PACKAGES
        }
    }
    
    private fun isBlockedPackage(packageName: String): Boolean {
        val blockedPackages = getBlockedPackages()
        return blockedPackages.contains(packageName)
    }
    
    private fun blockApp(packageName: String) {
        // Send HOME action to return to launcher
        performGlobalAction(GLOBAL_ACTION_HOME)
        
        // Show notification
        showBlockingNotification(packageName)
        
        Log.d(TAG, "Blocked and closed app: $packageName")
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "App Blocking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifications for blocked apps"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun showBlockingNotification(packageName: String) {
        val appName = getAppName(packageName)
        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("App Blocked")
            .setContentText("$appName is blocked due to screen time limit")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setAutoCancel(true)
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun getAppName(packageName: String): String {
        return when (packageName) {
            "com.twitter.android" -> "X"
            "com.instagram.android" -> "Instagram"
            "com.google.android.youtube" -> "YouTube"
            "com.facebook.katana" -> "Facebook"
            else -> packageName.split(".").lastOrNull() ?: packageName
        }
    }
    
    fun setBlockingEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BLOCKING_ENABLED, enabled).apply()
        Log.d(TAG, "Blocking ${if (enabled) "enabled" else "disabled"}")
    }
    
    fun setBlockedPackages(packages: Set<String>) {
        prefs.edit().putString(KEY_BLOCKED_PACKAGES, packages.joinToString(",")).apply()
        Log.d(TAG, "Blocked packages updated: $packages")
    }
}

