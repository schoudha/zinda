import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zinda.app',
  appName: 'Zinda',
  webDir: 'out',
  server: {
    url: 'https://zinda.vercel.app', // TODO: Update this to your deployed URL
    cleartext: true
  }

};

export default config;
