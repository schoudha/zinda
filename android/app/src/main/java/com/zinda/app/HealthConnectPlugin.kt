package com.zinda.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray
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

    // Comprehensive set of all Health Connect permissions
    private fun getAllHealthConnectPermissions(): Set<String> {
        return setOf(
            // Exercise & Activity
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(SpeedRecord::class),
            HealthPermission.getReadPermission(PowerRecord::class),
            
            // Heart & Cardiovascular
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(RestingHeartRateRecord::class),
            HealthPermission.getReadPermission(Vo2MaxRecord::class),
            
            // Body Metrics
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(HeightRecord::class),
            
            // Vital Signs
            HealthPermission.getReadPermission(BloodPressureRecord::class),
            HealthPermission.getReadPermission(BloodGlucoseRecord::class),
            HealthPermission.getReadPermission(OxygenSaturationRecord::class),
            HealthPermission.getReadPermission(RespiratoryRateRecord::class),
            HealthPermission.getReadPermission(BodyTemperatureRecord::class),
            
            // Sleep
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            
            // Nutrition & Hydration
            HealthPermission.getReadPermission(NutritionRecord::class),
            HealthPermission.getReadPermission(HydrationRecord::class),
        )
    }

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
                    "year" -> now.minusDays(365).withHour(0).withMinute(0).withSecond(0).withNano(0)
                    else -> now.minusDays(7).withHour(0).withMinute(0).withSecond(0).withNano(0)
                }

                val timeRangeFilter = TimeRangeFilter.between(
                    startTime.toInstant(),
                    now.toInstant()
                )

                // Use AggregateRequest instead of ReadRecordsRequest
                // This automatically clips duration to the time range provided
                val request = AggregateRequest(
                    metrics = setOf(ExerciseSessionRecord.EXERCISE_DURATION_TOTAL),
                    timeRangeFilter = timeRangeFilter
                )

                val response = client.aggregate(request)
                
                // Get the total duration directly from the aggregation result
                // It returns null if no data exists, so default to Duration.ZERO
                val totalDuration = response[ExerciseSessionRecord.EXERCISE_DURATION_TOTAL] ?: Duration.ZERO
                
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
    fun getExerciseSessions(call: PluginCall) {
        val period = call.getString("period", "week")

        if (healthConnectClient == null) {
            checkAvailabilityInternal()
            if (healthConnectClient == null) {
                val result = JSObject()
                result.put("sessions", JSArray())
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
                    "year" -> now.minusDays(365).withHour(0).withMinute(0).withSecond(0).withNano(0)
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
                
                val sessionsArray = JSArray()
                val startInstant = startTime.toInstant()
                val endInstant = now.toInstant()
                
                for (record in records) {
                    // Clip duration to time range if session extends beyond it
                    val sessionStart = record.startTime
                    val sessionEnd = record.endTime
                    val clippedStart = if (sessionStart.isBefore(startInstant)) startInstant else sessionStart
                    val clippedEnd = if (sessionEnd.isAfter(endInstant)) endInstant else sessionEnd
                    val clippedDuration = Duration.between(clippedStart, clippedEnd)
                    val clippedMinutes = maxOf(0, clippedDuration.toMinutes().toInt())
                    
                    // Log exercise type information for debugging
                    val exerciseTypeValue = record.exerciseType
                    val exerciseTypeName = exerciseTypeValue.toString()
                    
                    android.util.Log.d("HealthConnect", "Exercise session - Type: $exerciseTypeName, Value: $exerciseTypeValue, Title: ${record.title}, Start: ${record.startTime}, End: ${record.endTime}")
                    
                    val sessionObj = JSObject()
                    sessionObj.put("title", record.title ?: exerciseTypeName)
                    sessionObj.put("exerciseType", exerciseTypeName)
                    sessionObj.put("exerciseTypeValue", exerciseTypeValue)
                    sessionObj.put("startTime", record.startTime.toEpochMilli())
                    sessionObj.put("endTime", record.endTime.toEpochMilli())
                    sessionObj.put("durationMinutes", clippedMinutes)
                    sessionObj.put("notes", record.notes ?: "")
                    
                    sessionsArray.put(sessionObj)
                }
                
                val result = JSObject()
                result.put("sessions", sessionsArray)
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }

            } catch (e: Exception) {
                android.util.Log.e("HealthConnect", "Error getting exercise sessions", e)
                val result = JSObject()
                result.put("sessions", JSArray())
                
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
                val permissions = getAllHealthConnectPermissions()
                val grantedPermissions = client.permissionController.getGrantedPermissions()
                
                android.util.Log.d("HealthConnect", "Required permissions count: ${permissions.size}")
                android.util.Log.d("HealthConnect", "Granted permissions count: ${grantedPermissions.size}")
                android.util.Log.d("HealthConnect", "Required: $permissions")
                android.util.Log.d("HealthConnect", "Granted: $grantedPermissions")
                
                val hasAllPermissions = grantedPermissions.containsAll(permissions)
                android.util.Log.d("HealthConnect", "Has all permissions: $hasAllPermissions")
                
                val result = JSObject()
                result.put("hasPermission", hasAllPermissions)
                
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
        // Check SDK availability first
        val availability = try {
            HealthConnectClient.getSdkStatus(context)
        } catch (e: Exception) {
            android.util.Log.e("HealthConnect", "Error checking SDK status", e)
            call.reject("Health Connect SDK not available: ${e.message}")
            return
        }

        if (availability != HealthConnectClient.SDK_AVAILABLE) {
            android.util.Log.e("HealthConnect", "Health Connect SDK not available. Status: $availability")
            call.reject("Health Connect SDK not available. Status: $availability")
            return
        }

        if (healthConnectClient == null) {
            checkAvailabilityInternal()
            if (healthConnectClient == null) {
                call.reject("Failed to initialize Health Connect client")
                return
            }
        }

        val permissions = getAllHealthConnectPermissions()
        
        // Log the actual permission strings to verify they're correct
        android.util.Log.d("HealthConnect", "Requesting ${permissions.size} permissions")
        android.util.Log.d("HealthConnect", "Permission strings (formatted): ${permissions.joinToString(", ")}")
        
        // Verify the permission format matches Health Connect requirements
        permissions.forEach { perm ->
            android.util.Log.d("HealthConnect", "Permission: $perm")
            if (!perm.startsWith("android.permission.health.")) {
                android.util.Log.e("HealthConnect", "WARNING: Permission doesn't match expected format: $perm")
            }
        }
        
        val mainActivity = mainActivity
        if (mainActivity == null) {
            android.util.Log.e("HealthConnect", "MainActivity is null")
            call.reject("MainActivity not found")
            return
        }

        // Ensure we're on the main thread when launching the permission request
        bridge.activity?.runOnUiThread {
            try {
                android.util.Log.d("HealthConnect", "Launching permission request on main thread")
                mainActivity.requestHealthConnectPermissions(permissions)
                call.resolve()
            } catch (e: Exception) {
                android.util.Log.e("HealthConnect", "Error requesting permissions", e)
                e.printStackTrace()
                call.reject(e.message ?: "Failed to request permissions")
            }
        } ?: run {
            android.util.Log.e("HealthConnect", "Bridge activity is null")
            call.reject("Activity context not available")
        }
    }
}
