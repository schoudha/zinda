package com.zinda.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun FaithScreen(modifier: Modifier = Modifier) {
    SectionScaffold(
        title = "Faith",
        subtitle = "Prayer, reflection, and spiritual habits live here.",
        modifier = modifier
    )
}

@Composable
fun KnowledgeScreen(modifier: Modifier = Modifier) {
    SectionScaffold(
        title = "Knowledge",
        subtitle = "Reading, courses, and learning goals live here.",
        modifier = modifier
    )
}

@Composable
fun ExerciseScreen(modifier: Modifier = Modifier) {
    SectionScaffold(
        title = "Exercise",
        subtitle = "Movement, workouts, and health metrics live here.",
        modifier = modifier
    )
}

@Composable
fun FamilyScreen(modifier: Modifier = Modifier) {
    SectionScaffold(
        title = "Family",
        subtitle = "Calls, time together, and family goals live here.",
        modifier = modifier
    )
}

@Composable
private fun SectionScaffold(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Start
        )
    }
}
