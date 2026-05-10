package com.zinda.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.zinda.app.data.local.dao.ZindaDao
import com.zinda.app.data.local.entity.CompletionEntryEntity
import com.zinda.app.data.local.entity.GoalEntity
import com.zinda.app.data.local.entity.NoteEntity
import com.zinda.app.data.local.entity.ProgressEntryEntity
import com.zinda.app.data.local.entity.ReminderEntity
import com.zinda.app.data.local.entity.ThoughtEntity

@Database(
    entities = [
        GoalEntity::class,
        NoteEntity::class,
        ProgressEntryEntity::class,
        CompletionEntryEntity::class,
        ThoughtEntity::class,
        ReminderEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ZindaDatabase : RoomDatabase() {
    abstract fun dao(): ZindaDao

    companion object {
        @Volatile
        private var INSTANCE: ZindaDatabase? = null

        fun getInstance(context: Context): ZindaDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    ZindaDatabase::class.java,
                    "zinda_native.db"
                ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
    }
}
