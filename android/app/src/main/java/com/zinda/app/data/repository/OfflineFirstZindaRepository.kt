package com.zinda.app.data.repository

import android.app.Application
import com.zinda.app.data.local.ZindaDatabase
import com.zinda.app.data.local.entity.CompletionEntryEntity
import com.zinda.app.data.local.entity.GoalEntity
import com.zinda.app.data.local.entity.ProgressEntryEntity
import com.zinda.app.data.local.entity.toDomain
import com.zinda.app.data.local.entity.toEntity
import com.zinda.app.domain.model.CompletionEntry
import com.zinda.app.domain.model.DashboardSnapshot
import com.zinda.app.domain.model.Goal
import com.zinda.app.domain.model.Note
import com.zinda.app.domain.model.ProgressEntry
import com.zinda.app.domain.model.Reminder
import com.zinda.app.domain.model.Thought
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.util.UUID

class OfflineFirstZindaRepository private constructor(
    private val database: ZindaDatabase
) : ZindaRepository {
    private val dao = database.dao()

    override fun observeGoals(): Flow<List<Goal>> = dao.observeGoals().map { list -> list.map { it.toDomain() } }

    override fun observeGoal(id: String): Flow<Goal?> = dao.observeGoal(id).map { it?.toDomain() }

    override suspend fun upsertGoal(goal: Goal) {
        dao.upsert(goal.toEntity())
    }

    override suspend fun deleteGoal(id: String) {
        dao.delete(id)
    }

    override fun observeNotes(): Flow<List<Note>> = dao.observeNotes().map { list -> list.map { it.toDomain() } }

    override suspend fun upsertNote(note: Note) {
        dao.upsert(note.toEntity())
    }

    override suspend fun deleteNote(id: String) {
        dao.delete(id)
    }

    override fun observeTodayProgress(date: String): Flow<List<ProgressEntry>> =
        dao.observeProgressForDate(date).map { list -> list.map { it.toDomain() } }

    override suspend fun updateProgress(goalId: String, date: String, progressValue: Int) {
        dao.upsert(ProgressEntryEntity(goalId = goalId, date = date, progressValue = progressValue))
    }

    override suspend fun incrementCompletion(goalId: String, date: String, target: Int): CompletionEntry {
        val current = dao.getByGoalAndDate(goalId, date)
        val nextCount = (current?.completionCount ?: 0) + 1
        val next = CompletionEntryEntity(
            goalId = goalId,
            date = date,
            completionCount = nextCount,
            target = target
        )
        dao.upsert(next)
        return next.toDomain()
    }

    override fun observeThoughts(): Flow<List<Thought>> = dao.observeThoughts().map { list -> list.map { it.toDomain() } }

    override suspend fun addThought(thought: Thought) {
        dao.upsert(thought.toEntity())
    }

    override fun observeReminders(): Flow<List<Reminder>> =
        dao.observeReminders().map { list -> list.map { it.toDomain() } }

    override suspend fun upsertReminder(reminder: Reminder) {
        dao.upsert(reminder.toEntity())
    }

    override fun observeDashboardSnapshot(date: String): Flow<DashboardSnapshot> =
        combine(
            observeGoals(),
            observeNotes(),
            observeThoughts(),
            observeTodayProgress(date)
        ) { goals, notes, thoughts, progressEntries ->
            val progress = progressEntries.associate { it.goalId to it.progressValue }
            DashboardSnapshot(
                goals = goals,
                notes = notes.take(5),
                thoughts = thoughts.take(5),
                todayProgress = progress,
                totalNotes = notes.size,
                completedNotes = notes.count { it.checked }
            )
        }

    override suspend fun seedDefaultsIfNeeded() {
        if (dao.countGoals() > 0) return
        dao.insertGoals(
            listOf(
                GoalEntity(
                    id = UUID.randomUUID().toString(),
                    text = "Walk 30 minutes",
                    period = "week",
                    category = "health",
                    target = 30,
                    tipsCsv = "Start with 10 minutes,Use post-meal walks",
                    createdAtEpochMs = System.currentTimeMillis(),
                    notificationTime = "morning",
                    notificationDays = "weekday",
                    minutesPerDay = 30,
                    screenTimeStartHour = null,
                    screenTimeStartMinute = null,
                    screenTimeEndHour = null,
                    screenTimeEndMinute = null,
                    familyPhoneNumbersCsv = ""
                ),
                GoalEntity(
                    id = UUID.randomUUID().toString(),
                    text = "Call family daily",
                    period = "week",
                    category = "family",
                    target = 1,
                    tipsCsv = "Set a fixed time",
                    createdAtEpochMs = System.currentTimeMillis(),
                    notificationTime = "evening",
                    notificationDays = "everyday",
                    minutesPerDay = null,
                    screenTimeStartHour = null,
                    screenTimeStartMinute = null,
                    screenTimeEndHour = null,
                    screenTimeEndMinute = null,
                    familyPhoneNumbersCsv = ""
                )
            )
        )
    }

    companion object {
        fun create(application: Application): OfflineFirstZindaRepository {
            return OfflineFirstZindaRepository(
                database = ZindaDatabase.getInstance(application)
            )
        }
    }
}
