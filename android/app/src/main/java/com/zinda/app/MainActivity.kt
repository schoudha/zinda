package com.zinda.app

import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.PermissionController
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    private var healthPermissionLauncher: ActivityResultLauncher<Set<String>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize permission launcher before super.onCreate()
        // minSdkVersion is 34, so Health Connect is always available
        try {
            healthPermissionLauncher = registerForActivityResult(
                PermissionController.createRequestPermissionResultContract()
            ) { grantedPermissions: Set<String> ->
                // Permissions granted or denied
                // Notify the plugin to re-check permissions
                // The plugin will check permissions when the app resumes
            }
        } catch (e: Exception) {
            // Health Connect not available (shouldn't happen with minSdk 34)
            healthPermissionLauncher = null
        }
        
        registerPlugin(UsageStatsPlugin::class.java)
        registerPlugin(HealthConnectPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
    
    fun requestHealthConnectPermissions(permissions: Set<String>) {
        healthPermissionLauncher?.launch(permissions)
    }
}

