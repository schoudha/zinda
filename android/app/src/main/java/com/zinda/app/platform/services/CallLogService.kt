package com.zinda.app.platform.services

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat

data class FamilyCallSummary(
    val count: Int,
    val totalDurationSeconds: Long
)

class CallLogService(private val context: Context) {
    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

    fun readSummary(phoneNumbers: List<String>, startMillis: Long, endMillis: Long): FamilyCallSummary {
        if (!hasPermission() || phoneNumbers.isEmpty()) return FamilyCallSummary(0, 0)
        val normalizedTargets = phoneNumbers.map { normalize(it) }
        var count = 0
        var totalDuration = 0L
        val cursor = context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
            "${CallLog.Calls.DATE} >= ? AND ${CallLog.Calls.DATE} <= ?",
            arrayOf(startMillis.toString(), endMillis.toString()),
            "${CallLog.Calls.DATE} DESC"
        )
        cursor?.use {
            while (it.moveToNext()) {
                val raw = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                val normalized = normalize(raw)
                val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                val duration = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                val matching = normalizedTargets.any { target ->
                    normalized == target || normalized.endsWith(target) || target.endsWith(normalized)
                }
                val supportedType = type == CallLog.Calls.INCOMING_TYPE || type == CallLog.Calls.OUTGOING_TYPE
                if (matching && supportedType && duration > 0) {
                    count += 1
                    totalDuration += duration
                }
            }
        }
        return FamilyCallSummary(count, totalDuration)
    }

    private fun normalize(value: String?): String = value.orEmpty().replace(Regex("[^0-9+]"), "")
}
