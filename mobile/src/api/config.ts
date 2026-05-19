import { NativeModules, Platform } from 'react-native';

function resolveHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (scriptUrl) {
    try {
      const url = new URL(scriptUrl);
      if (Platform.OS === 'android' && url.hostname === 'localhost') {
        return 'localhost';
      }
      return url.hostname;
    } catch {}
  }

  if (Platform.OS === 'android') {
    return 'localhost';
  }

  return 'localhost';
}

export function getApiBaseUrl() {
  const host = resolveHost();
  return `http://${host}:3000`;
}
