import { NativeModules, Platform } from 'react-native';

function resolveHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (scriptUrl) {
    try {
      const url = new URL(scriptUrl);
      if (Platform.OS === 'android' && url.hostname === 'localhost') {
        return '10.0.2.2';
      }
      return url.hostname;
    } catch {}
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

export function getApiBaseUrl() {
  const host = resolveHost();
  return `http://${host}:3000`;
}
