package com.zinda.app.domain.model

data class Goal(
    val id: String,
    val text: String,
    val period: String,
    val category: String?,
    val target: Int?,
    val tips: List<String>,
    val createdAtEpochMs: Long,
    val notificationTime: String?,
    val notificationDays: String?,
    val minutesPerDay: Int?,
    val screenTimeStartHour: Int?,
    val screenTimeStartMinute: Int?,
    val screenTimeEndHour: Int?,
    val screenTimeEndMinute: Int?,
    val familyPhoneNumbers: List<String>
)

data class Note(
    val id: String,
    val text: String,
    val checked: Boolean,
    val checkedAtEpochMs: Long?,
    val createdAtEpochMs: Long,
    val url: String?,
    val urlTitle: String?,
    val summary: String?
)

data class ProgressEntry(
    val id: String,
    val goalId: String,
    val date: String,
    val progressValue: Int
)

data class CompletionEntry(
    val id: String,
    val goalId: String,
    val date: String,
    val completionCount: Int,
    val target: Int
)

data class Thought(
    val id: String,
    val text: String,
    val date: String,
    val createdAtEpochMs: Long
)

data class Reminder(
    val id: String,
    val goalId: String,
    val notificationTime: String,
    val notificationDays: String,
    val enabled: Boolean
)

data class DashboardSnapshot(
    val goals: List<Goal>,
    val notes: List<Note>,
    val thoughts: List<Thought>,
    val todayProgress: Map<String, Int>,
    val totalNotes: Int,
    val completedNotes: Int
)
