export const STORAGE_KEY = 'midnightledger_v1';

/**
 * Load item from localStorage safely
 */
export function load<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Error loading key ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Save item to localStorage safely
 */
export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key ${key} to localStorage:`, error);
  }
}
