package com.zinda.app.ui.navigation

sealed class Routes(val route: String) {
    data object Faith : Routes("faith")
    data object Knowledge : Routes("knowledge")
    data object Exercise : Routes("exercise")
    data object Family : Routes("family")
}
