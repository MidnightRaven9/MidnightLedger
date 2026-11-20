/**
 * Local persistence failures can occur while serializing financial records.
 * Error objects can contain payload fragments or storage keys, so logs keep a
 * fixed, non-sensitive message instead of the original exception.
 */
export function logSafeError(message: string): void {
  console.error(message);
}

export function logSafeWarning(message: string): void {
  console.warn(message);
}
