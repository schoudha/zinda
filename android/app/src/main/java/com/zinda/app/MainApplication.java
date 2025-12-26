package com.zinda.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Firebase if not already initialized
        // This is required for Push Notifications plugin
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
            }
        } catch (IllegalStateException e) {
            // Firebase already initialized, that's fine
        } catch (Exception e) {
            // Firebase not configured - user needs to add google-services.json
            // Push notifications won't work until Firebase is properly configured
        }
    }
}

