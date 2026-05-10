package com.zinda.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.zinda.app.domain.model.CompletionEntry
import com.zinda.app.domain.model.Goal
import com.zinda.app.domain.model.Note
import com.zinda.app.domain.model.ProgressEntry
import com.zinda.app.domain.model.Reminder
import com.zinda.app.domain.model.Thought

@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey val id: String,
    val text: String,
    val period: String,
    val category: String?,
    val target: Int?,
    val tipsCsv: String,
    val createdAtEpochMs: Long,
    val notificationTime: String?,
    val notificationDays: String?,
    val minutesPerDay: Int?,
    val screenTimeStartHour: Int?,
    val screenTimeStartMinute: Int?,
    val screenTimeEndHour: Int?,
    val screenTimeEndMinute: Int?,
    val familyPhoneNumbersCsv: String
)

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val text: String,
    val checked: Boolean,
    val checkedAtEpochMs: Long?,
    val createdAtEpochMs: Long,
    val url: String?,
    val urlTitle: String?,
    val summary: String?
)

@Entity(tableName = "progress_entries", primaryKeys = ["goalId", "date"])
data class ProgressEntryEntity(
    val goalId: String,
    val date: String,
    val progressValue: Int
)

@Entity(tableName = "completion_entries", primaryKeys = ["goalId", "date"])
data class CompletionEntryEntity(
    val goalId: String,
    val date: String,
    val completionCount: Int,
    val target: Int
)

@Entity(tableName = "thoughts")
data class ThoughtEntity(
    @PrimaryKey val id: String,
    val text: String,
    val date: String,
    val createdAtEpochMs: Long
)

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey val id: String,
    val goalId: String,
    val notificationTime: String,
    val notificationDays: String,
    val enabled: Boolean
)

fun GoalEntity.toDomain(): Goal = Goal(
    id = id,
    text = text,
    period = period,
    category = category,
    target = target,
    tips = tipsCsv.split(",").map { it.trim() }.filter { it.isNotEmpty() },
    createdAtEpochMs = createdAtEpochMs,
    notificationTime = notificationTime,
    notificationDays = notificationDays,
    minutesPerDay = minutesPerDay,
    screenTimeStartHour = screenTimeStartHour,
    screenTimeStartMinute = screenTimeStartMinute,
    screenTimeEndHour = screenTimeEndHour,
    screenTimeEndMinute = screenTimeEndMinute,
    familyPhoneNumbers = familyPhoneNumbersCsv.split(",").map { it.trim() }.filter { it.isNotEmpty() }
)

fun Goal.toEntity(): GoalEntity = GoalEntity(
    id = id,
    text = text,
    period = period,
    category = category,
    target = target,
    tipsCsv = tips.joinToString(","),
    createdAtEpochMs = createdAtEpochMs,
    notificationTime = notificationTime,
    notificationDays = notificationDays,
    minutesPerDay = minutesPerDay,
    screenTimeStartHour = screenTimeStartHour,
    screenTimeStartMinute = screenTimeStartMinute,
    screenTimeEndHour = screenTimeEndHour,
    screenTimeEndMinute = screenTimeEndMinute,
    familyPhoneNumbersCsv = familyPhoneNumbers.joinToString(",")
)

fun NoteEntity.toDomain(): Note = Note(
    id = id,
    text = text,
    checked = checked,
    checkedAtEpochMs = checkedAtEpochMs,
    createdAtEpochMs = createdAtEpochMs,
    url = url,
    urlTitle = urlTitle,
    summary = summary
)

fun Note.toEntity(): NoteEntity = NoteEntity(
    id = id,
    text = text,
    checked = checked,
    checkedAtEpochMs = checkedAtEpochMs,
    createdAtEpochMs = createdAtEpochMs,
    url = url,
    urlTitle = urlTitle,
    summary = summary
)

fun ProgressEntryEntity.toDomain(): ProgressEntry = ProgressEntry(
    id = "${goalId}_${date}",
    goalId = goalId,
    date = date,
    progressValue = progressValue
)

fun CompletionEntryEntity.toDomain(): CompletionEntry = CompletionEntry(
    id = "${goalId}_${date}",
    goalId = goalId,
    date = date,
    completionCount = completionCount,
    target = target
)

fun ThoughtEntity.toDomain(): Thought = Thought(
    id = id,
    text = text,
    date = date,
    createdAtEpochMs = createdAtEpochMs
)

fun Thought.toEntity(): ThoughtEntity = ThoughtEntity(
    id = id,
    text = text,
    date = date,
    createdAtEpochMs = createdAtEpochMs
)

fun ReminderEntity.toDomain(): Reminder = Reminder(
    id = id,
    goalId = goalId,
    notificationTime = notificationTime,
    notificationDays = notificationDays,
    enabled = enabled
)

fun Reminder.toEntity(): ReminderEntity = ReminderEntity(
    id = id,
    goalId = goalId,
    notificationTime = notificationTime,
    notificationDays = notificationDays,
    enabled = enabled
)
