package com.zinda.app

import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    private var healthPermissionLauncher: ActivityResultLauncher<Set<HealthPermission>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize permission launcher before super.onCreate()
        // Must be done unconditionally, but we can make it nullable
        healthPermissionLauncher = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                registerForActivityResult(
                    HealthConnectClient.permissionController.createRequestPermissionsResultContract()
                ) { grantedPermissions ->
                    // Permissions granted or denied
                    // The plugin will check permissions when needed
                }
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
        
        registerPlugin(UsageStatsPlugin::class.java)
        registerPlugin(HealthConnectPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
    
    fun requestHealthConnectPermissions(permissions: Set<HealthPermission>) {
        healthPermissionLauncher?.launch(permissions)
    }
}

