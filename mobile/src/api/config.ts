import { NativeModules, Platform } from 'react-native';

const ANDROID_EMULATOR_HOST = '10.0.2.2';

function resolveHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (scriptUrl) {
    try {
      const url = new URL(scriptUrl);
      if (Platform.OS === 'android') {
        return url.hostname === 'localhost' ? ANDROID_EMULATOR_HOST : url.hostname;
      }
      return url.hostname;
    } catch {}
  }

  if (Platform.OS === 'android') {
    return ANDROID_EMULATOR_HOST;
  }

  return 'localhost';
}

export function getApiBaseUrl() {
  const host = resolveHost();
  return `http://${host}:3000`;
}
