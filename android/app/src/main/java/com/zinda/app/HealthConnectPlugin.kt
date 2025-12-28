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
        // minSdkVersion is 34, so Health Connect is always available
        try {
            healthConnectClient = HealthConnectClient.getOrCreate(context)
        } catch (e: Exception) {
            // Health Connect not available (shouldn't happen with minSdk 34)
        }
    }

    @PluginMethod
    fun getExerciseMinutes(call: PluginCall) {
        val period = call.getString("period", "week")

        if (healthConnectClient == null) {
            val result = JSObject()
            result.put("totalMinutes", 0)
            call.resolve(result)
            return
        }

        val client = healthConnectClient!! // Safe: already checked for null above
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
                
                // Calculate total duration from all exercise sessions
                var totalDuration = Duration.ZERO
                for (record in records) {
                    val sessionDuration = Duration.between(record.startTime, record.endTime)
                    totalDuration = totalDuration.plus(sessionDuration)
                }
                
                val totalMinutes = totalDuration.toMinutes().toInt()

                val result = JSObject()
                result.put("totalMinutes", totalMinutes)
                
                // Resolve on main thread
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }

            } catch (e: Exception) {
                val result = JSObject()
                result.put("totalMinutes", 0)
                
                // Resolve on main thread
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            }
        }
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        if (healthConnectClient == null) {
            val result = JSObject()
            result.put("hasPermission", false)
            call.resolve(result)
            return
        }

        val client = healthConnectClient!! // Safe: already checked for null above
        scope.launch {
            try {
                val permissions = setOf(
                    HealthPermission.getReadPermission(ExerciseSessionRecord::class)
                )
                val grantedPermissions = client.permissionController.getGrantedPermissions(permissions)
                
                val result = JSObject()
                result.put("hasPermission", grantedPermissions.containsAll(permissions))
                
                // Resolve on main thread
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            } catch (e: Exception) {
                val result = JSObject()
                result.put("hasPermission", false)
                
                // Resolve on main thread
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            }
        }
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (healthConnectClient == null) {
            call.resolve()
            return
        }

        try {
            val permissions = setOf(
                HealthPermission.getReadPermission(ExerciseSessionRecord::class)
            )
            
            // Use MainActivity's permission launcher if available
            val mainActivity = mainActivity
            if (mainActivity != null) {
                mainActivity.requestHealthConnectPermissions(permissions)
                call.resolve()
            } else {
                // Fallback: open app settings
                val intent = android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                val uri = android.net.Uri.fromParts("package", context.packageName, null)
                intent.data = uri
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                call.resolve()
            }
        } catch (e: Exception) {
            call.resolve()
        }
    }
}

