import {applyConfig, loadState} from './lib/chrome';

/*
 * Dynamic rules are persisted by the browser, but the configuration may have
 * been edited while the extension was disabled, so re-register it on startup.
 */
async function restoreRules(): Promise<void> {
    const {config, started} = await loadState();
    await applyConfig(config, started);
}

chrome.runtime.onStartup.addListener(restoreRules);
chrome.runtime.onInstalled.addListener(restoreRules);
