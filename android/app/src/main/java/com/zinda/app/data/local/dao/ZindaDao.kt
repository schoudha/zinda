package com.zinda.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.zinda.app.data.local.entity.CompletionEntryEntity
import com.zinda.app.data.local.entity.GoalEntity
import com.zinda.app.data.local.entity.NoteEntity
import com.zinda.app.data.local.entity.ProgressEntryEntity
import com.zinda.app.data.local.entity.ReminderEntity
import com.zinda.app.data.local.entity.ThoughtEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalDao {
    @Query("SELECT * FROM goals ORDER BY createdAtEpochMs DESC")
    fun observeGoals(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals WHERE id = :id")
    fun observeGoal(id: String): Flow<GoalEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(goal: GoalEntity)

    @Query("DELETE FROM goals WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY createdAtEpochMs DESC")
    fun observeNotes(): Flow<List<NoteEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface ProgressDao {
    @Query("SELECT * FROM progress_entries WHERE date = :date")
    fun observeProgressForDate(date: String): Flow<List<ProgressEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: ProgressEntryEntity)
}

@Dao
interface CompletionDao {
    @Query("SELECT * FROM completion_entries WHERE goalId = :goalId AND date = :date LIMIT 1")
    suspend fun getByGoalAndDate(goalId: String, date: String): CompletionEntryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: CompletionEntryEntity)
}

@Dao
interface ThoughtDao {
    @Query("SELECT * FROM thoughts ORDER BY createdAtEpochMs DESC")
    fun observeThoughts(): Flow<List<ThoughtEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(thought: ThoughtEntity)
}

@Dao
interface ReminderDao {
    @Query("SELECT * FROM reminders WHERE goalId = :goalId LIMIT 1")
    suspend fun getByGoalId(goalId: String): ReminderEntity?

    @Query("SELECT * FROM reminders")
    fun observeReminders(): Flow<List<ReminderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(reminder: ReminderEntity)
}

@Dao
interface SeedDao {
    @Query("SELECT COUNT(*) FROM goals")
    suspend fun countGoals(): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertGoals(goals: List<GoalEntity>)
}

@Transaction
interface ZindaDao :
    GoalDao,
    NoteDao,
    ProgressDao,
    CompletionDao,
    ThoughtDao,
    ReminderDao,
    SeedDao
