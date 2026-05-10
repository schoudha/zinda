package com.zinda.app.platform.reminders

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class ReminderScheduler(private val context: Context) {
    fun scheduleDailySync() {
        val request = PeriodicWorkRequestBuilder<ReminderWorker>(24, TimeUnit.HOURS).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "zinda-reminders-daily",
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
    }
}
