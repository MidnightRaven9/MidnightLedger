import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.midnightledger.app',
  appName: 'MidnightLedger',
  webDir: 'dist',
  loggingBehavior: 'none',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_bell',
      iconColor: '#a855f7'
    }
  }
};

export default config;
