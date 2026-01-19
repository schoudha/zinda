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
        handleShareIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleHealthConnectRationale(intent)
        handleShareIntent(intent)
    }

    private fun handleHealthConnectRationale(intent: Intent?) {
        if (intent?.action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE") {
            // TODO: Navigate to your Privacy Policy page or show a dialog explaining why you need access
            android.util.Log.d("HealthConnect", "Rationale intent received")
            Toast.makeText(this, "Access to health data is required to show your exercise stats.", Toast.LENGTH_LONG).show()
        }
    }

    private fun handleShareIntent(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND) {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
            val sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
            
            if (sharedText != null || sharedSubject != null) {
                android.util.Log.d("ShareIntent", "Received share: text=$sharedText, subject=$sharedSubject")
                
                // Extract URL from shared text if it contains one
                val extractedUrl = sharedText?.takeIf { 
                    android.util.Patterns.WEB_URL.matcher(it).find() 
                } ?: ""
                
                // Build query parameters with proper encoding
                val textParam = sharedText?.let { "text=${android.net.Uri.encode(it)}" } ?: ""
                val titleParam = sharedSubject?.let { "title=${android.net.Uri.encode(it)}" } ?: ""
                val urlParam = extractedUrl.takeIf { it.isNotEmpty() }?.let { "url=${android.net.Uri.encode(it)}" } ?: ""
                
                val params = listOfNotNull(textParam, titleParam, urlParam).joinToString("&")
                
                // Use JavaScript to update the URL without reloading the page
                val jsCode = """
                    (function() {
                        const queryString = '$params';
                        console.log('[ShareIntent] Executing JS with queryString:', queryString);
                        if (queryString) {
                            const url = new URL(window.location.href);
                            const params = new URLSearchParams(queryString);
                            params.forEach((value, key) => {
                                url.searchParams.set(key, value);
                            });
                            console.log('[ShareIntent] New URL:', url.toString());
                            window.history.replaceState({}, '', url.toString());
                            console.log('[ShareIntent] Dispatching popstate event');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                            console.log('[ShareIntent] JS execution complete');
                        }
                    })();
                """.trimIndent()
                
                // Execute JavaScript after ensuring the webview is ready
                val handler = android.os.Handler(android.os.Looper.getMainLooper())
                
                // Local function that can reference itself recursively
                fun executeJs() {
                    val webView = bridge?.webView
                    if (webView != null) {
                        webView.evaluateJavascript(jsCode, null)
                    } else {
                        // Retry after a delay if bridge isn't ready yet
                        handler.postDelayed({ executeJs() }, 200)
                    }
                }
                
                // Start trying to execute after a short delay
                handler.postDelayed({ executeJs() }, 500)
            }
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
