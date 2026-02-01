const PREFIX = 'api:';

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      evictOldest(5);
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(data));
      } catch {
        // give up
      }
    }
  }
}

export function invalidateCache(...prefixes: string[]): void {
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const cacheKey = k.slice(PREFIX.length);
    if (prefixes.some((p) => cacheKey.startsWith(p))) {
      keysToDelete.push(k);
    }
  }
  keysToDelete.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(
    new CustomEvent('cache:invalidated', { detail: { prefixes } })
  );
}

export function clearAllCache(): void {
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keysToDelete.push(k);
  }
  keysToDelete.forEach((k) => localStorage.removeItem(k));
}

function evictOldest(count: number): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  // Remove first N (oldest by insertion order approximation)
  keys.slice(0, count).forEach((k) => localStorage.removeItem(k));
}
