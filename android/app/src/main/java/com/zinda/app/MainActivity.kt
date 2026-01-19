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
        // #region agent log
        try {
            val logData = org.json.JSONObject().apply {
                put("sessionId", "debug-session")
                put("runId", "run1")
                put("hypothesisId", "A")
                put("location", "MainActivity.kt:54")
                put("message", "handleShareIntent called")
                put("timestamp", System.currentTimeMillis())
                put("data", org.json.JSONObject().apply {
                    put("intentAction", intent?.action)
                    put("intentIsNull", intent == null)
                })
            }
            android.util.Log.d("DebugAgent", "LOG: $logData")
        } catch (e: Exception) {
            android.util.Log.e("DebugAgent", "Logging failed", e)
        }
        // #endregion
        
        if (intent?.action == Intent.ACTION_SEND) {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
            val sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
            
            // #region agent log
            try {
                val logData = org.json.JSONObject().apply {
                    put("sessionId", "debug-session")
                    put("runId", "run1")
                    put("hypothesisId", "A")
                    put("location", "MainActivity.kt:57")
                    put("message", "Intent ACTION_SEND matched, extracted extras")
                    put("timestamp", System.currentTimeMillis())
                    put("data", org.json.JSONObject().apply {
                        put("sharedText", sharedText)
                        put("sharedSubject", sharedSubject)
                    })
                }
                android.util.Log.d("DebugAgent", "LOG: $logData")
            } catch (e: Exception) {
                android.util.Log.e("DebugAgent", "Logging failed", e)
            }
            // #endregion
            
            if (sharedText != null || sharedSubject != null) {
                android.util.Log.d("ShareIntent", "Received share: text=$sharedText, subject=$sharedSubject")
                
                // Extract URL from shared text if it contains one
                val extractedUrl = sharedText?.takeIf { 
                    android.util.Patterns.WEB_URL.matcher(it).find() 
                } ?: ""
                
                // #region agent log
                try {
                    val logData = org.json.JSONObject().apply {
                        put("sessionId", "debug-session")
                        put("runId", "run1")
                        put("hypothesisId", "D")
                        put("location", "MainActivity.kt:63")
                        put("message", "URL extracted from shared text")
                        put("timestamp", System.currentTimeMillis())
                        put("data", org.json.JSONObject().apply {
                            put("extractedUrl", extractedUrl)
                        })
                    }
                    android.util.Log.d("DebugAgent", "LOG: $logData")
                } catch (e: Exception) {
                    android.util.Log.e("DebugAgent", "Logging failed", e)
                }
                // #endregion
                
                // Build query parameters with proper encoding
                val textParam = sharedText?.let { "text=${android.net.Uri.encode(it)}" } ?: ""
                val titleParam = sharedSubject?.let { "title=${android.net.Uri.encode(it)}" } ?: ""
                val urlParam = extractedUrl.takeIf { it.isNotEmpty() }?.let { "url=${android.net.Uri.encode(it)}" } ?: ""
                
                val params = listOfNotNull(textParam, titleParam, urlParam).joinToString("&")
                
                // #region agent log
                try {
                    val logData = org.json.JSONObject().apply {
                        put("sessionId", "debug-session")
                        put("runId", "run1")
                        put("hypothesisId", "D")
                        put("location", "MainActivity.kt:72")
                        put("message", "Query params built")
                        put("timestamp", System.currentTimeMillis())
                        put("data", org.json.JSONObject().apply {
                            put("params", params)
                            put("textParam", textParam)
                            put("titleParam", titleParam)
                            put("urlParam", urlParam)
                        })
                    }
                    android.util.Log.d("DebugAgent", "LOG: $logData")
                } catch (e: Exception) {
                    android.util.Log.e("DebugAgent", "Logging failed", e)
                }
                // #endregion
                
                // Use JavaScript to update the URL without reloading the page
                val jsCode = """
                    (function() {
                        const queryString = '$params';
                        const logEndpoint = 'http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c';
                        const log = (msg, data) => {
                            fetch(logEndpoint, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    sessionId: 'debug-session',
                                    runId: 'run1',
                                    hypothesisId: 'C',
                                    location: 'MainActivity.kt:JS',
                                    message: msg,
                                    data: data || {},
                                    timestamp: Date.now()
                                })
                            }).catch(() => {});
                        };
                        console.log('[ShareIntent] Executing JS with queryString:', queryString);
                        log('JS execution started', {queryString, currentUrl: window.location.href});
                        if (queryString) {
                            try {
                                const url = new URL(window.location.href);
                                const params = new URLSearchParams(queryString);
                                params.forEach((value, key) => {
                                    url.searchParams.set(key, value);
                                });
                                const newUrl = url.toString();
                                console.log('[ShareIntent] New URL:', newUrl);
                                log('URL constructed', {newUrl, oldUrl: window.location.href});
                                window.history.replaceState({}, '', newUrl);
                                log('history.replaceState called', {newUrl});
                                console.log('[ShareIntent] Dispatching popstate event');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                                log('PopStateEvent dispatched', {newUrl});
                                console.log('[ShareIntent] JS execution complete');
                            } catch (e) {
                                log('JS execution error', {error: e.message, stack: e.stack});
                            }
                        } else {
                            log('No query string to process', {});
                        }
                    })();
                """.trimIndent()
                
                // Execute JavaScript after ensuring the webview is ready
                val handler = android.os.Handler(android.os.Looper.getMainLooper())
                
                var retryCount = 0
                val maxRetries = 10
                
                // Local function that can reference itself recursively
                fun executeJs() {
                    val webView = bridge?.webView
                    
                    // #region agent log
                    try {
                        val logData = org.json.JSONObject().apply {
                            put("sessionId", "debug-session")
                            put("runId", "run1")
                            put("hypothesisId", "B")
                            put("location", "MainActivity.kt:94")
                            put("message", "Attempting to execute JS")
                            put("timestamp", System.currentTimeMillis())
                            put("data", org.json.JSONObject().apply {
                                put("webViewIsNull", webView == null)
                                put("bridgeIsNull", bridge == null)
                                put("retryCount", retryCount)
                            })
                        }
                        android.util.Log.d("DebugAgent", "LOG: $logData")
                    } catch (e: Exception) {
                        android.util.Log.e("DebugAgent", "Logging failed", e)
                    }
                    // #endregion
                    
                    if (webView != null) {
                        // #region agent log
                        try {
                            val logData = org.json.JSONObject().apply {
                                put("sessionId", "debug-session")
                                put("runId", "run1")
                                put("hypothesisId", "C")
                                put("location", "MainActivity.kt:97")
                                put("message", "WebView available, executing JS")
                                put("timestamp", System.currentTimeMillis())
                                put("data", org.json.JSONObject().apply {
                                    put("jsCodeLength", jsCode.length)
                                })
                            }
                            android.util.Log.d("DebugAgent", "LOG: $logData")
                        } catch (e: Exception) {
                            android.util.Log.e("DebugAgent", "Logging failed", e)
                        }
                        // #endregion
                        
                        webView.evaluateJavascript(jsCode, null)
                    } else {
                        retryCount++
                        if (retryCount < maxRetries) {
                            // Retry after a delay if bridge isn't ready yet
                            handler.postDelayed({ executeJs() }, 200)
                        } else {
                            // #region agent log
                            try {
                                val logData = org.json.JSONObject().apply {
                                    put("sessionId", "debug-session")
                                    put("runId", "run1")
                                    put("hypothesisId", "B")
                                    put("location", "MainActivity.kt:100")
                                    put("message", "WebView not available, max retries reached")
                                    put("timestamp", System.currentTimeMillis())
                                    put("data", org.json.JSONObject().apply {
                                        put("retryCount", retryCount)
                                    })
                                }
                                android.util.Log.e("DebugAgent", "LOG: $logData")
                            } catch (e: Exception) {
                                android.util.Log.e("DebugAgent", "Logging failed", e)
                            }
                            // #endregion
                        }
                    }
                }
                
                // Start trying to execute after a short delay
                handler.postDelayed({ executeJs() }, 500)
            } else {
                // #region agent log
                try {
                    val logData = org.json.JSONObject().apply {
                        put("sessionId", "debug-session")
                        put("runId", "run1")
                        put("hypothesisId", "A")
                        put("location", "MainActivity.kt:106")
                        put("message", "No shared text or subject found")
                        put("timestamp", System.currentTimeMillis())
                    }
                    android.util.Log.d("DebugAgent", "LOG: $logData")
                } catch (e: Exception) {
                    android.util.Log.e("DebugAgent", "Logging failed", e)
                }
                // #endregion
            }
        } else {
            // #region agent log
            try {
                val logData = org.json.JSONObject().apply {
                    put("sessionId", "debug-session")
                    put("runId", "run1")
                    put("hypothesisId", "A")
                    put("location", "MainActivity.kt:107")
                    put("message", "Intent action does not match ACTION_SEND")
                    put("timestamp", System.currentTimeMillis())
                    put("data", org.json.JSONObject().apply {
                        put("intentAction", intent?.action)
                    })
                }
                android.util.Log.d("DebugAgent", "LOG: $logData")
            } catch (e: Exception) {
                android.util.Log.e("DebugAgent", "Logging failed", e)
            }
            // #endregion
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
