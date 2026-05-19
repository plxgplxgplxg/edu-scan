import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJsonValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJsonValue<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
