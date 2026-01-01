"use client";

import { useEffect } from 'react';

export function PushInit() {
  useEffect(() => {
    // Only run on native platforms - safely check if Capacitor is available
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;

    const initPush = async () => {
      try {
        // Dynamically import Capacitor modules to avoid errors on web
        const capacitorModule = await import('@capacitor/core');
        Capacitor = capacitorModule.Capacitor;
        
        // Check if we're on a native platform before importing push notifications
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const pushModule = await import('@capacitor/push-notifications');
        PushNotifications = pushModule.PushNotifications;

        // Request permission
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.error('User denied permissions!');
          return;
        }

        // Register with FCM
        await PushNotifications.register();

        // Listen for registration
        PushNotifications.addListener('registration', (token) => {
          console.info('Push registration success, token: ' + token.value);
          // Send token to backend
          // We'll need a new API endpoint or modify subscribe for this
          // For now, logging it is enough to verify integration
          // api.notifications.subscribe({ type: 'fcm', token: token.value });
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
        });
      } catch (error) {
        // Silently fail on web or if Capacitor is not available
        // This is expected behavior for web deployments
        if (process.env.NODE_ENV === 'development') {
          console.debug('PushInit: Capacitor not available (web environment)', error);
        }
      }
    };

    initPush();
  }, []);

  return null; // Logic only component
}

