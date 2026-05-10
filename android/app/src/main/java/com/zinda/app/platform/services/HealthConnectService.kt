package com.zinda.app.platform.services

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.ZoneId
import java.time.ZonedDateTime

data class HealthSummary(
    val available: Boolean,
    val hasPermissions: Boolean,
    val weeklyExerciseMinutes: Int
)

class HealthConnectService(private val context: Context) {
    private val permissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    )

    fun isAvailable(): Boolean = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    suspend fun readSummary(): HealthSummary = withContext(Dispatchers.IO) {
        if (!isAvailable()) return@withContext HealthSummary(false, false, 0)
        val client = HealthConnectClient.getOrCreate(context)
        val granted = client.permissionController.getGrantedPermissions()
        val hasPermissions = granted.containsAll(permissions)
        if (!hasPermissions) return@withContext HealthSummary(true, false, 0)

        val now = ZonedDateTime.now(ZoneId.systemDefault())
        val start = now.minusDays(7).withHour(0).withMinute(0).withSecond(0).withNano(0)
        val request = AggregateRequest(
            metrics = setOf(ExerciseSessionRecord.EXERCISE_DURATION_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), now.toInstant())
        )
        val response = client.aggregate(request)
        val minutes = (response[ExerciseSessionRecord.EXERCISE_DURATION_TOTAL]?.toMinutes() ?: 0).toInt()
        HealthSummary(true, true, minutes)
    }
}
