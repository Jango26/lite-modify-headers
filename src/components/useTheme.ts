import {useCallback, useEffect, useState} from 'react';
import {
    applyTheme,
    loadTheme,
    nextTheme,
    readStoredTheme,
    storeTheme,
    THEME_STORAGE_KEY,
    type ThemePreference
} from '../lib/theme';

/*
 * Keeps <html data-theme> in sync with the stored preference. Both the config
 * page and the popup mount this, so the storage listener is what makes a switch
 * in the config page reach an open popup, and vice versa.
 *
 * Following the OS needs no work here : light-dark() in the stylesheet handles
 * it, and 'system' simply means "no data-theme attribute".
 */
export function useTheme() {
    const [theme, setTheme] = useState<ThemePreference>('system');

    useEffect(() => {
        loadTheme().then((stored) => {
            setTheme(stored);
            applyTheme(stored);
        });
    }, []);

    useEffect(() => {
        const onChanged = (changes: {[key: string]: chrome.storage.StorageChange}) => {
            if (changes[THEME_STORAGE_KEY] === undefined) return;
            const next = readStoredTheme(changes[THEME_STORAGE_KEY].newValue);
            setTheme(next);
            applyTheme(next);
        };
        chrome.storage.local.onChanged.addListener(onChanged);
        return () => chrome.storage.local.onChanged.removeListener(onChanged);
    }, []);

    const cycleTheme = useCallback(() => {
        const next = nextTheme(theme);
        setTheme(next);
        applyTheme(next);
        void storeTheme(next);
    }, [theme]);

    return {theme, cycleTheme};
}
