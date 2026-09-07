/*
 * Everything that touches a chrome API : storage, the toolbar icon and the
 * declarativeNetRequest registration. Promise based, so callers can await.
 * Runs in the config page, the popup and the service worker alike, so it must
 * never assume a window or a DOM.
 */

import {convertItemsToDynamicRules, getDefaultConfig, migrateConfig, type Config} from './config';

let debug_mode = false;

export function setDebugMode(enabled: boolean): void {
    debug_mode = enabled;
}

function debug(message: string): void {
    if (debug_mode) console.log(new Date() + ' CustomHeaders : ' + message);
}

/** STORAGE **/

export interface StoredState {
    config: Config;
    started: boolean;
    /** True when the stored config was in a 1.x format and had to be migrated. */
    migrated: boolean;
}

export async function loadState(): Promise<StoredState> {
    const result = await chrome.storage.local.get(['config', 'started']);
    const stored = result.config === undefined ? null : JSON.parse(result.config as string);
    const config = stored === null ? getDefaultConfig() : migrateConfig(stored);
    setDebugMode(config.debug_mode);
    return {
        config,
        started: result.started === 'on',
        migrated: stored !== null && stored.format_version !== config.format_version
    };
}

export async function storeConfig(config: Config): Promise<void> {
    await chrome.storage.local.set({config: JSON.stringify(config)});
}

export async function storeStarted(started: boolean): Promise<void> {
    await chrome.storage.local.set({started: started ? 'on' : 'off'});
}

/** declarativeNetRequest REGISTRATION **/

/* Green M when running, grey M when stopped. */
function setExtensionIcon(started: boolean): void {
    chrome.action.setIcon({path: started ? '/icons/m-32.png' : '/icons/m-gray-32.png'});
}

async function removeDynamicRules(): Promise<void> {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ids = rules.map((rule) => rule.id);
    debug('Remove rules ' + JSON.stringify(ids));
    await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: ids});
}

function exceedsBrowserRuleLimit(rules: chrome.declarativeNetRequest.Rule[]): boolean {
    return rules.length >= chrome.declarativeNetRequest.MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES;
}

export const TOO_MANY_RULES_ERROR = 'Too many rules for the browser. Please disable some rules.';

/*
 * Register the configuration as dynamic rules. Always clears the previous
 * rules first, so this is also the way to apply an edited configuration.
 * Resolves with an error message when the rules could not be registered.
 */
export async function applyConfig(config: Config, started: boolean): Promise<string | null> {
    await removeDynamicRules();
    setExtensionIcon(started);
    if (!started || !config.items) return null;

    const rules = convertItemsToDynamicRules(config.items);
    debug('Add rules : ' + JSON.stringify(rules));

    if (exceedsBrowserRuleLimit(rules)) {
        console.log(TOO_MANY_RULES_ERROR);
        return TOO_MANY_RULES_ERROR;
    }

    await chrome.declarativeNetRequest.updateDynamicRules({addRules: rules});
    return null;
}

export async function countRegisteredRules(): Promise<number> {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.length;
}
