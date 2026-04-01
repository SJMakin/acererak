// Closure-based API key vault — keeps the raw key out of Zustand state and React DevTools.
// Encrypts at rest in localStorage using a session-scoped AES-GCM key stored in sessionStorage.
//
// Threat model:
//   - Raw key never appears in Zustand state → invisible to React DevTools / getState()
//   - localStorage stores only AES-GCM ciphertext → useless without the session key
//   - Session key lives in sessionStorage → cleared when the tab closes
//   - Within a tab session (including reloads), decrypt works → good UX
//   - New tab or browser restart → user re-enters key (acceptable trade-off)

const LS_ENCRYPTED = 'vtt-ai-apiKey-enc';
const LS_LEGACY = 'vtt-ai-apiKey'; // plaintext key from before vault existed
const SS_AES_KEY = 'vtt-ai-session-key'; // raw AES key material in sessionStorage

// ── Session-scoped AES key ────────────────────────────────────────────────

async function getSessionKey(): Promise<CryptoKey> {
  // Try to restore from sessionStorage first
  const stored = sessionStorage.getItem(SS_AES_KEY);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  // Generate fresh and persist to sessionStorage
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(SS_AES_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

async function encryptString(plain: string): Promise<string> {
  const key = await getSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptString(stored: string): Promise<string> {
  const key = await getSessionKey();
  const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

// ── Closure-held key ──────────────────────────────────────────────────────

let _key = '';

/** Store a key in the vault. Encrypts and persists to localStorage. */
export async function setKey(apiKey: string): Promise<void> {
  _key = apiKey;
  try {
    if (apiKey) {
      const encrypted = await encryptString(apiKey);
      localStorage.setItem(LS_ENCRYPTED, encrypted);
    } else {
      localStorage.removeItem(LS_ENCRYPTED);
    }
    // Clean up legacy plaintext key
    localStorage.removeItem(LS_LEGACY);
  } catch { /* storage unavailable */ }
}

/** Clear the key from memory and storage. */
export function clearKey(): void {
  _key = '';
  try {
    localStorage.removeItem(LS_ENCRYPTED);
    localStorage.removeItem(LS_LEGACY);
  } catch { /* ignore */ }
}

/** Check if a key is currently held (without exposing it). */
export function hasKey(): boolean {
  return _key.length > 0;
}

/**
 * Execute a callback with the raw key. The key is never returned directly —
 * it's only available inside the callback scope.
 */
export async function withKey<T>(fn: (apiKey: string) => T | Promise<T>): Promise<T> {
  if (!_key) throw new Error('No API key configured');
  return fn(_key);
}

/**
 * Get the key for display in the Settings password field.
 * This is the one place the raw value escapes the closure.
 */
export function getKeyForDisplay(): string {
  return _key;
}

/**
 * Restore key from localStorage on startup. Call once during app init.
 * Handles both encrypted (new) and plaintext (legacy) formats.
 * Returns true if a key was restored.
 */
export async function restoreKey(): Promise<boolean> {
  try {
    // Try encrypted format first
    const encrypted = localStorage.getItem(LS_ENCRYPTED);
    if (encrypted) {
      _key = await decryptString(encrypted);
      return true;
    }

    // Fall back to legacy plaintext key and migrate it
    const legacy = localStorage.getItem(LS_LEGACY);
    if (legacy) {
      _key = legacy;
      const enc = await encryptString(legacy);
      localStorage.setItem(LS_ENCRYPTED, enc);
      localStorage.removeItem(LS_LEGACY);
      return true;
    }
  } catch {
    // Decryption fails if session key was lost (new tab after closing previous one).
    // Clear the stale encrypted blob — user will need to re-enter.
    try { localStorage.removeItem(LS_ENCRYPTED); } catch { /* ignore */ }
  }
  return false;
}
