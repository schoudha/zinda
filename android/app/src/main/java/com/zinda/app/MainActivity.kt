package com.zinda.app

import android.os.Bundle
import android.content.Intent
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.PermissionController
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    var healthPermissionLauncher: ActivityResultLauncher<Set<String>>? = null
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize permission launcher before super.onCreate()
        try {
            healthPermissionLauncher = registerForActivityResult(
                PermissionController.createRequestPermissionResultContract()
            ) { grantedPermissions: Set<String> ->
                android.util.Log.d("HealthConnect", "Permission callback triggered. Granted: $grantedPermissions")
                // You could notify the plugin here via an event if needed
            }
        } catch (e: Exception) {
            android.util.Log.e("HealthConnect", "Failed to register permission launcher", e)
            healthPermissionLauncher = null
        }
        
        registerPlugin(UsageStatsPlugin::class.java)
        registerPlugin(HealthConnectPlugin::class.java)
        registerPlugin(AppBlockingPlugin::class.java)
        registerPlugin(CallLogPlugin::class.java)
        super.onCreate(savedInstanceState)

        handleHealthConnectRationale(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleHealthConnectRationale(intent)
    }

    private fun handleHealthConnectRationale(intent: Intent?) {
        if (intent?.action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE") {
            // TODO: Navigate to your Privacy Policy page or show a dialog explaining why you need access
            android.util.Log.d("HealthConnect", "Rationale intent received")
            Toast.makeText(this, "Access to health data is required to show your exercise stats.", Toast.LENGTH_LONG).show()
        }
    }
    
    fun requestHealthConnectPermissions(permissions: Set<String>) {
        android.util.Log.d("HealthConnect", "requestHealthConnectPermissions called with: $permissions")
        
        if (healthPermissionLauncher == null) {
            android.util.Log.e("HealthConnect", "Permission launcher is null! Attempting to re-register...")
            // Try to re-register if it's null (shouldn't happen, but just in case)
            try {
                healthPermissionLauncher = registerForActivityResult(
                    PermissionController.createRequestPermissionResultContract()
                ) { grantedPermissions: Set<String> ->
                    android.util.Log.d("HealthConnect", "Permission callback triggered. Granted: $grantedPermissions")
                }
            } catch (e: Exception) {
                android.util.Log.e("HealthConnect", "Failed to re-register permission launcher", e)
                return
            }
        }
        
        try {
            android.util.Log.d("HealthConnect", "Launching permission request launcher")
            healthPermissionLauncher?.launch(permissions)
            android.util.Log.d("HealthConnect", "Permission request launcher called successfully")
        } catch (e: Exception) {
            android.util.Log.e("HealthConnect", "Error launching permission request", e)
            e.printStackTrace()
        }
    }
}
