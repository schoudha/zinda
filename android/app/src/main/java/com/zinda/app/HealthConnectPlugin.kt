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

    /**
     * Converts Health Connect exercise type integer to readable name
     */
    private fun getExerciseName(type: Int): String {
        return when (type) {
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "Running"
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Walking"
            ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "Biking"
            ExerciseSessionRecord.EXERCISE_TYPE_GYMNASTICS -> "Gymnastics"
            ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "Hiking"
            ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "Yoga"
            ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "Weightlifting"
            ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT -> "Other Workout"
            ExerciseSessionRecord.EXERCISE_TYPE_AMERICAN_FOOTBALL -> "American Football"
            ExerciseSessionRecord.EXERCISE_TYPE_ARCHERY -> "Archery"
            ExerciseSessionRecord.EXERCISE_TYPE_AUSTRALIAN_FOOTBALL -> "Australian Football"
            ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON -> "Badminton"
            ExerciseSessionRecord.EXERCISE_TYPE_BASEBALL -> "Baseball"
            ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL -> "Basketball"
            ExerciseSessionRecord.EXERCISE_TYPE_BIATHLON -> "Biathlon"
            ExerciseSessionRecord.EXERCISE_TYPE_BOXING -> "Boxing"
            ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS -> "Calisthenics"
            ExerciseSessionRecord.EXERCISE_TYPE_CRICKET -> "Cricket"
            ExerciseSessionRecord.EXERCISE_TYPE_CROSSFIT -> "Crossfit"
            ExerciseSessionRecord.EXERCISE_TYPE_CURLING -> "Curling"
            ExerciseSessionRecord.EXERCISE_TYPE_DANCING -> "Dancing"
            ExerciseSessionRecord.EXERCISE_TYPE_DIVING -> "Diving"
            ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL -> "Elliptical"
            ExerciseSessionRecord.EXERCISE_TYPE_ERGOMETER -> "Ergometer"
            ExerciseSessionRecord.EXERCISE_TYPE_FENCING -> "Fencing"
            ExerciseSessionRecord.EXERCISE_TYPE_FRISBEE_DISC -> "Frisbee Disc"
            ExerciseSessionRecord.EXERCISE_TYPE_GARDENING -> "Gardening"
            ExerciseSessionRecord.EXERCISE_TYPE_GOLF -> "Golf"
            ExerciseSessionRecord.EXERCISE_TYPE_GUIDED_BREATHING -> "Guided Breathing"
            ExerciseSessionRecord.EXERCISE_TYPE_HANDBALL -> "Handball"
            ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "High Intensity Interval Training"
            ExerciseSessionRecord.EXERCISE_TYPE_HOCKEY -> "Hockey"
            ExerciseSessionRecord.EXERCISE_TYPE_HORSEBACK_RIDING -> "Horseback Riding"
            ExerciseSessionRecord.EXERCISE_TYPE_HOUSEWORK -> "Housework"
            ExerciseSessionRecord.EXERCISE_TYPE_ICE_SKATING -> "Ice Skating"
            ExerciseSessionRecord.EXERCISE_TYPE_INLINE_SKATING -> "Inline Skating"
            ExerciseSessionRecord.EXERCISE_TYPE_JUMPING_ROPE -> "Jumping Rope"
            ExerciseSessionRecord.EXERCISE_TYPE_KAYAKING -> "Kayaking"
            ExerciseSessionRecord.EXERCISE_TYPE_KETTLEBELL_TRAINING -> "Kettlebell Training"
            ExerciseSessionRecord.EXERCISE_TYPE_KICKBOXING -> "Kickboxing"
            ExerciseSessionRecord.EXERCISE_TYPE_KITESURFING -> "Kitesurfing"
            ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS -> "Martial Arts"
            ExerciseSessionRecord.EXERCISE_TYPE_MEDITATION -> "Meditation"
            ExerciseSessionRecord.EXERCISE_TYPE_MIXED_CARDIO -> "Mixed Cardio"
            ExerciseSessionRecord.EXERCISE_TYPE_OPEN_WATER_SWIM -> "Open Water Swim"
            ExerciseSessionRecord.EXERCISE_TYPE_PADDLEBOARDING -> "Paddleboarding"
            ExerciseSessionRecord.EXERCISE_TYPE_PARAGLIDING -> "Paragliding"
            ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "Pilates"
            ExerciseSessionRecord.EXERCISE_TYPE_RACQUETBALL -> "Racquetball"
            ExerciseSessionRecord.EXERCISE_TYPE_ROCK_CLIMBING -> "Rock Climbing"
            ExerciseSessionRecord.EXERCISE_TYPE_ROWING -> "Rowing"
            ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE -> "Rowing Machine"
            ExerciseSessionRecord.EXERCISE_TYPE_RUGBY -> "Rugby"
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_JOGGING -> "Running (Jogging)"
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_SAND -> "Running (Sand)"
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "Running (Treadmill)"
            ExerciseSessionRecord.EXERCISE_TYPE_SAILING -> "Sailing"
            ExerciseSessionRecord.EXERCISE_TYPE_SCUBA_DIVING -> "Scuba Diving"
            ExerciseSessionRecord.EXERCISE_TYPE_SKATEBOARDING -> "Skateboarding"
            ExerciseSessionRecord.EXERCISE_TYPE_SKATING -> "Skating"
            ExerciseSessionRecord.EXERCISE_TYPE_CROSS_COUNTRY_SKIING -> "Cross Country Skiing"
            ExerciseSessionRecord.EXERCISE_TYPE_DOWNHILL_SKIING -> "Downhill Skiing"
            ExerciseSessionRecord.EXERCISE_TYPE_SLEDDING -> "Sledding"
            ExerciseSessionRecord.EXERCISE_TYPE_SLEEPING -> "Sleeping"
            ExerciseSessionRecord.EXERCISE_TYPE_LIGHT_SLEEP -> "Light Sleep"
            ExerciseSessionRecord.EXERCISE_TYPE_DEEP_SLEEP -> "Deep Sleep"
            ExerciseSessionRecord.EXERCISE_TYPE_REM_SLEEP -> "REM Sleep"
            ExerciseSessionRecord.EXERCISE_TYPE_AWAKE_DURING_SLEEP_PERIOD -> "Awake (During Sleep Period)"
            ExerciseSessionRecord.EXERCISE_TYPE_SNOWBOARDING -> "Snowboarding"
            ExerciseSessionRecord.EXERCISE_TYPE_SNOWMOBILE -> "Snowmobile"
            ExerciseSessionRecord.EXERCISE_TYPE_SNOWSHOEING -> "Snowshoeing"
            ExerciseSessionRecord.EXERCISE_TYPE_SOFTBALL -> "Softball"
            ExerciseSessionRecord.EXERCISE_TYPE_SQUASH -> "Squash"
            ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING -> "Stair Climbing"
            ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING_MACHINE -> "Stair Climbing (Machine)"
            ExerciseSessionRecord.EXERCISE_TYPE_STANDUP_PADDLEBOARDING -> "Standup Paddleboarding"
            ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "Strength Training"
            ExerciseSessionRecord.EXERCISE_TYPE_SURFING -> "Surfing"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING -> "Swimming"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "Swimming (Open Water)"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL -> "Swimming (Pool)"
            ExerciseSessionRecord.EXERCISE_TYPE_TABLE_TENNIS -> "Table Tennis"
            ExerciseSessionRecord.EXERCISE_TYPE_TENNIS -> "Tennis"
            ExerciseSessionRecord.EXERCISE_TYPE_TREADMILL -> "Treadmill (Walking/Running)"
            ExerciseSessionRecord.EXERCISE_TYPE_VOLLEYBALL -> "Volleyball"
            ExerciseSessionRecord.EXERCISE_TYPE_VOLLEYBALL_BEACH -> "Volleyball (Beach)"
            ExerciseSessionRecord.EXERCISE_TYPE_VOLLEYBALL_INDOOR -> "Volleyball (Indoor)"
            ExerciseSessionRecord.EXERCISE_TYPE_WAKEBOARDING -> "Wakeboarding"
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING_FITNESS -> "Walking (Fitness)"
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING_NORDIC -> "Walking (Nordic)"
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING_TREADMILL -> "Walking (Treadmill)"
            ExerciseSessionRecord.EXERCISE_TYPE_WATER_POLO -> "Water Polo"
            ExerciseSessionRecord.EXERCISE_TYPE_WHEELCHAIR -> "Wheelchair"
            ExerciseSessionRecord.EXERCISE_TYPE_WINDSURFING -> "Windsurfing"
            ExerciseSessionRecord.EXERCISE_TYPE_ZUMBA -> "Zumba"
            ExerciseSessionRecord.EXERCISE_TYPE_OTHER -> "Other"
            else -> "Unknown ($type)"
        }
    }

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
                    
                    // Convert exercise type integer to readable name
                    val exerciseTypeValue = record.exerciseType
                    val exerciseTypeName = getExerciseName(exerciseTypeValue)
                    
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
