package com.zinda.app.data.repository

import com.zinda.app.domain.model.CompletionEntry
import com.zinda.app.domain.model.DashboardSnapshot
import com.zinda.app.domain.model.Goal
import com.zinda.app.domain.model.Note
import com.zinda.app.domain.model.ProgressEntry
import com.zinda.app.domain.model.Reminder
import com.zinda.app.domain.model.Thought
import kotlinx.coroutines.flow.Flow

interface ZindaRepository {
    fun observeGoals(): Flow<List<Goal>>
    fun observeGoal(id: String): Flow<Goal?>
    suspend fun upsertGoal(goal: Goal)
    suspend fun deleteGoal(id: String)

    fun observeNotes(): Flow<List<Note>>
    suspend fun upsertNote(note: Note)
    suspend fun deleteNote(id: String)

    fun observeTodayProgress(date: String): Flow<List<ProgressEntry>>
    suspend fun updateProgress(goalId: String, date: String, progressValue: Int)

    suspend fun incrementCompletion(goalId: String, date: String, target: Int): CompletionEntry

    fun observeThoughts(): Flow<List<Thought>>
    suspend fun addThought(thought: Thought)

    fun observeReminders(): Flow<List<Reminder>>
    suspend fun upsertReminder(reminder: Reminder)

    fun observeDashboardSnapshot(date: String): Flow<DashboardSnapshot>
    suspend fun seedDefaultsIfNeeded()
}
