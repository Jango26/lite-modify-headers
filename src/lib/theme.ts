/*
 * Theme preference. Stored under its own `theme` storage key rather than
 * inside `config` : it is a display preference of this browser profile, not
 * part of the rule table, so it must not go through CONFIG_FORMAT_VERSION and
 * migrateConfig.
 *
 * The actual colours are picked by light-dark() in src/index.css, driven by
 * color-scheme. All this module does is write <html data-theme> for an explicit
 * light / dark choice, and remove it to fall back on the OS. No media query
 * listener is needed : following the system is pure CSS.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

function isPreference(value: unknown): value is ThemePreference {
    return typeof value === 'string' && PREFERENCES.includes(value as ThemePreference);
}

/** Falls back to 'system' for a missing or unrecognised stored value. */
export function readStoredTheme(raw: unknown): ThemePreference {
    return isPreference(raw) ? raw : 'system';
}

export async function loadTheme(): Promise<ThemePreference> {
    const result = await chrome.storage.local.get([THEME_STORAGE_KEY]);
    return readStoredTheme(result[THEME_STORAGE_KEY]);
}

export async function storeTheme(preference: ThemePreference): Promise<void> {
    mirrorTheme(preference);
    await chrome.storage.local.set({[THEME_STORAGE_KEY]: preference});
}

/*
 * chrome.storage is async, so on load an explicit light / dark preference would
 * paint one frame in the OS theme before it is read back. localStorage is
 * per-page but synchronous, so a copy of the preference lives there too and
 * bootTheme reads it before React renders.
 *
 * chrome.storage stays the source of truth : it is shared between the config
 * page and the popup, which have separate localStorage. Hence mirroring on read
 * as well, so each page seeds its own copy the first time it is opened.
 */
function mirrorTheme(preference: ThemePreference): void {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
        /* Storage can be blocked ; the only cost is a one frame flash. */
    }
}

/*
 * Called at the top of each entry point, before rendering. Extension pages
 * forbid inline scripts (MV3 CSP), so this cannot live in the html — it has to
 * be the first thing the entry module does.
 */
export function bootTheme(): void {
    try {
        applyTheme(readStoredTheme(localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
        /* No localStorage : the OS theme applies until loadTheme resolves. */
    }
}

/** The next value in the system → light → dark → system cycle. */
export function nextTheme(current: ThemePreference): ThemePreference {
    const index = PREFERENCES.indexOf(current);
    return PREFERENCES[(index + 1) % PREFERENCES.length];
}

export function applyTheme(preference: ThemePreference): void {
    mirrorTheme(preference);
    if (preference === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
}
