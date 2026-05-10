package com.zinda.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.zinda.app.ui.screens.ExerciseScreen
import com.zinda.app.ui.screens.FaithScreen
import com.zinda.app.ui.screens.FamilyScreen
import com.zinda.app.ui.screens.KnowledgeScreen

@Composable
fun ZindaNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Routes.Faith.route,
        modifier = modifier
    ) {
        composable(Routes.Faith.route) { FaithScreen() }
        composable(Routes.Knowledge.route) { KnowledgeScreen() }
        composable(Routes.Exercise.route) { ExerciseScreen() }
        composable(Routes.Family.route) { FamilyScreen() }
    }
}
