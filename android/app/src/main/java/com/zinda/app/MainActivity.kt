package com.zinda.app

import android.os.Bundle
import androidx.activity.result.contract.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    private var healthPermissionLauncher: ActivityResultLauncher<Set<String>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize permission launcher before super.onCreate()
        // minSdkVersion is 34, so Health Connect is always available
        try {
            healthPermissionLauncher = registerForActivityResult(
                HealthConnectClient.permissionController.createRequestPermissionsResultContract()
            ) { grantedPermissions ->
                // Permissions granted or denied
                // The plugin will check permissions when needed
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

