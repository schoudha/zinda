package com.zinda.app

import com.zinda.app.data.local.entity.GoalEntity
import com.zinda.app.data.local.entity.toDomain
import org.junit.Assert.assertEquals
import org.junit.Test

class EntityMappingTest {
    @Test
    fun goalEntity_toDomain_splitsCsvFields() {
        val entity = GoalEntity(
            id = "g1",
            text = "Read Quran",
            period = "week",
            category = "faith",
            target = 7,
            tipsCsv = "Tip 1,Tip 2",
            createdAtEpochMs = 100L,
            notificationTime = "morning",
            notificationDays = "weekday",
            minutesPerDay = null,
            screenTimeStartHour = null,
            screenTimeStartMinute = null,
            screenTimeEndHour = null,
            screenTimeEndMinute = null,
            familyPhoneNumbersCsv = "+111,+222"
        )

        val domain = entity.toDomain()
        assertEquals(listOf("Tip 1", "Tip 2"), domain.tips)
        assertEquals(listOf("+111", "+222"), domain.familyPhoneNumbers)
    }
}
