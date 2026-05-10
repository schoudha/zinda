package com.zinda.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.zinda.app.ui.navigation.Routes
import com.zinda.app.ui.navigation.ZindaNavHost

private data class BottomDestination(
    val route: String,
    val label: String,
    val contentDescription: String
)

@Composable
fun ZindaApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val destinations = listOf(
        BottomDestination(Routes.Faith.route, "Faith", "Faith"),
        BottomDestination(Routes.Knowledge.route, "Knowledge", "Knowledge"),
        BottomDestination(Routes.Exercise.route, "Exercise", "Exercise"),
        BottomDestination(Routes.Family.route, "Family", "Family")
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                destinations.forEach { dest ->
                    val selected = currentRoute == dest.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = iconForRoute(dest.route),
                                contentDescription = dest.contentDescription
                            )
                        },
                        label = { Text(dest.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        ZindaNavHost(
            navController = navController,
            modifier = Modifier.padding(innerPadding)
        )
    }
}

@Composable
private fun iconForRoute(route: String) = when (route) {
    Routes.Faith.route -> Icons.Outlined.SelfImprovement
    Routes.Knowledge.route -> Icons.Outlined.MenuBook
    Routes.Exercise.route -> Icons.Outlined.DirectionsRun
    Routes.Family.route -> Icons.Outlined.Groups
    else -> Icons.Outlined.SelfImprovement
}
