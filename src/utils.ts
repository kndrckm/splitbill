/**
 * Generate a cryptographically secure unique ID.
 * Uses crypto.randomUUID() which is available in all modern browsers.
 */
export const generateId = (): string => {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
};

/**
 * Get the Gemini API key.
 * Priority: 1) localStorage (user override) → 2) build-time injected key from GitHub Secrets
 */
export const getApiKey = (): string | null => {
    const localKey = localStorage.getItem('splitbill_gemini_api_key');
    if (localKey) return localKey;

    // Build-time injected key (from GitHub Actions secret via VITE_GEMINI_API_KEY)
    const buildKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (buildKey && typeof buildKey === 'string' && buildKey.length > 0) return buildKey;

    return null;
};

/**
 * Save the Gemini API key to localStorage (user override).
 */
export const setApiKey = (key: string): void => {
    localStorage.setItem('splitbill_gemini_api_key', key);
};

/**
 * Remove the stored Gemini API key from localStorage.
 */
export const removeApiKey = (): void => {
    localStorage.removeItem('splitbill_gemini_api_key');
};

/**
 * Check if API key is available (either from build or localStorage).
 */
export const hasApiKey = (): boolean => {
    return getApiKey() !== null;
};
