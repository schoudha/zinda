package com.zinda.app.platform.reminders

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class ReminderWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        // Notification delivery can be expanded in the next milestone.
        return Result.success()
    }
}
