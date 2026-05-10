import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zinda.app',
  appName: 'Zinda',
  // Legacy config kept only as an archive marker.
  // Native Android runtime no longer depends on Capacitor/WebView hosting.
  webDir: 'deprecated'
};

export default config;
