/**
 * Generate a unique ID using UUID v4
 * Works in both Node.js and modern browsers (crypto.randomUUID)
 */
export function generateId(): string {
  // Use crypto.randomUUID() if available (Node.js 14.17+ and modern browsers)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments (shouldn't happen in modern Next.js)
  // This is a simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

