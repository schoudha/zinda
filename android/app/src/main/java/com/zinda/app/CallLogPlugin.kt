package com.zinda.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.CallLog
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@CapacitorPlugin(name = "CallLog")
class CallLogPlugin : Plugin() {
    
    companion object {
        private const val TAG = "CallLogPlugin"
        private const val MIN_CALL_DURATION_SECONDS = 30 // Minimum 30 seconds to count a call
        private const val PERMISSION_REQUEST_CODE = 1001
    }
    
    private var pendingPermissionCall: PluginCall? = null

    /**
     * Normalize phone number by removing spaces, dashes, parentheses, and other formatting
     */
    private fun normalizePhoneNumber(phoneNumber: String?): String {
        if (phoneNumber == null) return ""
        return phoneNumber.replace(Regex("[^0-9+]"), "")
    }

    /**
     * Check if a phone number matches any of the target numbers (normalized comparison)
     */
    private fun matchesPhoneNumber(callNumber: String?, targetNumbers: List<String>): Boolean {
        if (callNumber == null) return false
        val normalizedCall = normalizePhoneNumber(callNumber)
        return targetNumbers.any { target ->
            val normalizedTarget = normalizePhoneNumber(target)
            // Match if normalized numbers are equal, or if one ends with the other (for country code variations)
            normalizedCall == normalizedTarget || 
            normalizedCall.endsWith(normalizedTarget) || 
            normalizedTarget.endsWith(normalizedCall)
        }
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val context = context
        val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
        
        val result = JSObject()
        result.put("hasPermission", hasPermission)
        call.resolve(result)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val context = context
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            call.resolve()
            return
        }
        
        // Store the call to resolve/reject later
        pendingPermissionCall = call
        
        // Request permission using ActivityCompat
        val activity = activity
        if (activity == null) {
            call.reject("Activity context not available")
            return
        }
        
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.READ_CALL_LOG),
            PERMISSION_REQUEST_CODE
        )
    }
    
    override fun handleRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val call = pendingPermissionCall
            pendingPermissionCall = null
            
            if (call != null) {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    call.resolve()
                } else {
                    call.reject("READ_CALL_LOG permission denied")
                }
                return
            }
        }
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    @PluginMethod
    fun getCallHistory(call: PluginCall) {
        val context = context
        
        // Check permission
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            call.reject("READ_CALL_LOG permission not granted")
            return
        }
        
        val phoneNumbersArray = call.getArray("phoneNumbers")
        val phoneNumbers = if (phoneNumbersArray != null) {
            val list = mutableListOf<String>()
            for (i in 0 until phoneNumbersArray.length()) {
                val phoneNumber = phoneNumbersArray.getString(i)
                if (phoneNumber != null) {
                    list.add(phoneNumber)
                }
            }
            list
        } else {
            emptyList()
        }
        val startDate = call.getLong("startDate") ?: 0L
        val endDate = call.getLong("endDate") ?: System.currentTimeMillis()
        val minDurationSeconds = call.getInt("minDurationSeconds") ?: MIN_CALL_DURATION_SECONDS
        
        if (phoneNumbers.isEmpty()) {
            call.reject("phoneNumbers array is required")
            return
        }
        
        Log.d(TAG, "Querying call log for ${phoneNumbers.size} phone numbers from ${startDate} to ${endDate}")
        
        val calls = JSArray()
        val timeZone = TimeZone.getDefault()
        
        try {
            val cursor: Cursor? = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.TYPE
                ),
                "${CallLog.Calls.DATE} >= ? AND ${CallLog.Calls.DATE} <= ?",
                arrayOf(startDate.toString(), endDate.toString()),
                "${CallLog.Calls.DATE} DESC"
            )
            
            cursor?.use {
                while (it.moveToNext()) {
                    val number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val date = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))
                    val duration = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    
                    // Only count calls that match target numbers and meet minimum duration
                    if (matchesPhoneNumber(number, phoneNumbers) && duration >= minDurationSeconds) {
                        // Filter by call type: INCOMING (1) or OUTGOING (2)
                        if (type == CallLog.Calls.INCOMING_TYPE || type == CallLog.Calls.OUTGOING_TYPE) {
                            val callObj = JSObject()
                            callObj.put("phoneNumber", number)
                            callObj.put("date", date)
                            callObj.put("duration", duration) // duration in seconds
                            callObj.put("type", if (type == CallLog.Calls.INCOMING_TYPE) "incoming" else "outgoing")
                            
                            // Find which target number this matches (for labeling)
                            val matchedNumber = phoneNumbers.firstOrNull { target: String ->
                                matchesPhoneNumber(number, listOf(target))
                            }
                            callObj.put("matchedNumber", matchedNumber ?: number)
                            
                            calls.put(callObj)
                        }
                    }
                }
            }
            
            val result = JSObject()
            result.put("calls", calls)
            result.put("count", calls.length())
            
            Log.d(TAG, "Found ${calls.length()} calls matching criteria")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading call log", e)
            call.reject("Error reading call log: ${e.message}")
        }
    }
}

