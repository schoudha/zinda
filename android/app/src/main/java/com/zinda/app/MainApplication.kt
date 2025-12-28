package com.zinda.app

import android.app.Application
import com.google.firebase.FirebaseApp

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Firebase if not already initialized
        // This is required for Push Notifications plugin
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this)
            }
        } catch (e: IllegalStateException) {
            // Firebase already initialized, that's fine
        } catch (e: Exception) {
            // Firebase not configured - user needs to add google-services.json
            // Push notifications won't work until Firebase is properly configured
        }
    }
}

