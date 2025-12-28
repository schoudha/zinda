package com.zinda.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private var healthConnectClient: HealthConnectClient? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    
    private val mainActivity: MainActivity?
        get() = activity as? MainActivity

    override fun load() {
        super.load()
        checkAvailabilityInternal()
    }

    private fun checkAvailabilityInternal() {
        try {
            val availability = HealthConnectClient.getSdkStatus(context)
            if (availability == HealthConnectClient.SDK_AVAILABLE) {
                healthConnectClient = HealthConnectClient.getOrCreate(context)
            } else {
                android.util.Log.w("HealthConnect", "Health Connect SDK not available. Status: $availability")
            }
        } catch (e: Exception) {
            android.util.Log.e("HealthConnect", "Error checking availability", e)
        }
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val availability = try {
            HealthConnectClient.getSdkStatus(context)
        } catch (e: Exception) {
            HealthConnectClient.SDK_UNAVAILABLE
        }
        
        val result = JSObject()
        result.put("status", availability)
        result.put("isAvailable", availability == HealthConnectClient.SDK_AVAILABLE)
        call.resolve(result)
    }

    @PluginMethod
    fun getExerciseMinutes(call: PluginCall) {
        val period = call.getString("period", "week")

        if (healthConnectClient == null) {
            checkAvailabilityInternal()
            if (healthConnectClient == null) {
                val result = JSObject()
                result.put("totalMinutes", 0)
                call.resolve(result)
                return
            }
        }

        val client = healthConnectClient!! 
        scope.launch {
            try {
                val now = ZonedDateTime.now(ZoneId.systemDefault())
                val startTime: ZonedDateTime = when (period) {
                    "today" -> now.withHour(0).withMinute(0).withSecond(0).withNano(0)
                    "week" -> now.minusDays(7).withHour(0).withMinute(0).withSecond(0).withNano(0)
                    "month" -> now.minusDays(30).withHour(0).withMinute(0).withSecond(0).withNano(0)
                    else -> now.minusDays(7).withHour(0).withMinute(0).withSecond(0).withNano(0)
                }

                val timeRangeFilter = TimeRangeFilter.between(
                    startTime.toInstant(),
                    now.toInstant()
                )

                val request = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = timeRangeFilter
                )

                val response = client.readRecords(request)
                val records = response.records
                
                var totalDuration = Duration.ZERO
                for (record in records) {
                    val sessionDuration = Duration.between(record.startTime, record.endTime)
                    totalDuration = totalDuration.plus(sessionDuration)
                }
                
                val totalMinutes = totalDuration.toMinutes().toInt()

                val result = JSObject()
                result.put("totalMinutes", totalMinutes)
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }

            } catch (e: Exception) {
                android.util.Log.e("HealthConnect", "Error getting exercise minutes", e)
                val result = JSObject()
                result.put("totalMinutes", 0)
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            }
        }
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        if (healthConnectClient == null) {
            checkAvailabilityInternal()
            if (healthConnectClient == null) {
                val result = JSObject()
                result.put("hasPermission", false)
                call.resolve(result)
                return
            }
        }

        val client = healthConnectClient!!
        scope.launch {
            try {
                val permissions = setOf(
                    HealthPermission.getReadPermission(ExerciseSessionRecord::class)
                )
                val grantedPermissions = client.permissionController.getGrantedPermissions()
                
                android.util.Log.d("HealthConnect", "Required: $permissions")
                android.util.Log.d("HealthConnect", "Granted: $grantedPermissions")
                
                val result = JSObject()
                result.put("hasPermission", grantedPermissions.containsAll(permissions))
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            } catch (e: Exception) {
                android.util.Log.e("HealthConnect", "Error checking permissions", e)
                val result = JSObject()
                result.put("hasPermission", false)
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            }
        }
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (healthConnectClient == null) {
            checkAvailabilityInternal()
            if (healthConnectClient == null) {
                call.reject("Health Connect SDK not available")
                return
            }
        }

        try {
            val permissions = setOf(
                HealthPermission.getReadPermission(ExerciseSessionRecord::class)
            )
            
            android.util.Log.d("HealthConnect", "Requesting permissions: $permissions")
            
            val mainActivity = mainActivity
            if (mainActivity != null) {
                mainActivity.requestHealthConnectPermissions(permissions)
                call.resolve()
            } else {
                call.reject("MainActivity not found")
            }
        } catch (e: Exception) {
            android.util.Log.e("HealthConnect", "Error requesting permissions", e)
            call.reject(e.message)
        }
    }
}
