import {useCallback, useEffect, useRef, useState} from 'react';
import {applyConfig, countRegisteredRules, loadState, storeConfig, storeStarted} from '../lib/chrome';
import {
    createEmptyGroup,
    createEmptyGroupHeader,
    createEmptyRuleItem,
    getDefaultConfig,
    newId,
    parseImportedConfig,
    serializeConfig,
    type Config,
    type ConfigItem,
    type GroupHeader,
    type GroupItem,
    type Rule,
    type RuleItem
} from '../lib/config';
import {downloadJson, pickTextFile} from '../lib/file';

/*
 * Holds the whole configuration page state. Every edition saves and
 * re-registers the rules, there is no save button.
 */
export function useConfig() {
    const [config, setConfig] = useState<Config>(getDefaultConfig);
    const [started, setStarted] = useState(false);
    const [registeredCount, setRegisteredCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    /*
     * Serialized form of the last configuration this page wrote, so a storage
     * event caused by our own keystrokes can be told apart from an edition
     * made in the toolbar popup.
     */
    const lastWritten = useRef<string | null>(null);
    /*
     * Id of the item or group header that was just duplicated, so the page can
     * flash it. It is cleared as soon as the animation ends.
     */
    const [flashed, setFlashed] = useState<string | null>(null);

    const save = useCallback(async (next: Config) => {
        lastWritten.current = JSON.stringify(next);
        await storeConfig(next);
    }, []);

    const register = useCallback(async (next: Config, nextStarted: boolean) => {
        setError(await applyConfig(next, nextStarted));
        setRegisteredCount(await countRegisteredRules());
    }, []);

    /*
     * Saving and registering go together : a stored configuration that is not
     * registered would silently not apply.
     */
    const commit = useCallback(
        async (next: Config) => {
            setConfig(next);
            await save(next);
            await register(next, started);
        },
        [register, save, started]
    );

    useEffect(() => {
        loadState().then(async ({config: stored, started: wasStarted, migrated}) => {
            setConfig(stored);
            setStarted(wasStarted);
            // Save right away when the stored configuration was in an older
            // format, so the migration does not have to run again next load.
            if (migrated) await save(stored);
            await register(stored, wasStarted);
        });
    }, [register, save]);

    /*
     * Both the start/stop state and the rules can also be changed from the
     * toolbar popup. Accept an incoming configuration only when it is not the
     * one we just wrote ourselves, otherwise every keystroke would be fed back
     * into the inputs.
     */
    useEffect(() => {
        const onStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
            if (changes.started) setStarted(changes.started.newValue === 'on');
            const incoming = changes.config?.newValue as string | undefined;
            if (incoming !== undefined && incoming !== lastWritten.current) {
                lastWritten.current = incoming;
                setConfig(JSON.parse(incoming));
            }
            if (changes.started || changes.config) countRegisteredRules().then(setRegisteredCount);
        };
        chrome.storage.local.onChanged.addListener(onStorageChange);
        return () => chrome.storage.local.onChanged.removeListener(onStorageChange);
    }, []);

    const toggleStarted = useCallback(async () => {
        const next = !started;
        setStarted(next);
        await storeStarted(next);
        await register(config, next);
    }, [config, register, started]);

    const withItems = useCallback((items: ConfigItem[]) => ({...config, items}), [config]);

    const replaceItem = useCallback(
        (index: number, replacement: ConfigItem) => {
            const items = config.items.map((item, i) => (i === index ? replacement : item));
            return commit(withItems(items));
        },
        [commit, config.items, withItems]
    );

    const updateRule = useCallback(
        (index: number, changes: Partial<Rule>) => {
            const target = config.items[index] as RuleItem;
            return replaceItem(index, {...target, ...changes});
        },
        [config.items, replaceItem]
    );

    const updateGroup = useCallback(
        (index: number, changes: Partial<Omit<GroupItem, 'kind' | 'headers'>>) => {
            const target = config.items[index] as GroupItem;
            return replaceItem(index, {...target, ...changes});
        },
        [config.items, replaceItem]
    );

    /* Group headers are edited through their group, so they share replaceItem. */
    const withHeaders = useCallback(
        (index: number, headers: GroupHeader[]) => {
            const target = config.items[index] as GroupItem;
            return replaceItem(index, {...target, headers});
        },
        [config.items, replaceItem]
    );

    const updateHeader = useCallback(
        (index: number, headerIndex: number, changes: Partial<GroupHeader>) => {
            const target = config.items[index] as GroupItem;
            const headers = target.headers.map((header, i) => (i === headerIndex ? {...header, ...changes} : header));
            return withHeaders(index, headers);
        },
        [config.items, withHeaders]
    );

    const addHeader = useCallback(
        (index: number) => {
            const target = config.items[index] as GroupItem;
            const added = createEmptyGroupHeader();
            setFlashed(added.id);
            return withHeaders(index, [...target.headers, added]);
        },
        [config.items, withHeaders]
    );

    const duplicateHeader = useCallback(
        (index: number, headerIndex: number) => {
            const target = config.items[index] as GroupItem;
            const headers = [...target.headers];
            const copy = {...headers[headerIndex], id: newId(), status: 'off' as const};
            headers.splice(headerIndex + 1, 0, copy);
            setFlashed(copy.id);
            return withHeaders(index, headers);
        },
        [config.items, withHeaders]
    );

    /* A group without a single header could no longer be edited, so keep one. */
    const removeHeader = useCallback(
        (index: number, headerIndex: number) => {
            const target = config.items[index] as GroupItem;
            const headers = target.headers.filter((_, i) => i !== headerIndex);
            return withHeaders(index, headers.length > 0 ? headers : [createEmptyGroupHeader()]);
        },
        [config.items, withHeaders]
    );

    /* Newly added items flash just like copies do, so the eye can find them. */
    const appendItem = useCallback(
        (item: ConfigItem) => {
            setFlashed(item.id);
            return commit(withItems([...config.items, item]));
        },
        [commit, config.items, withItems]
    );

    const addRule = useCallback(() => appendItem(createEmptyRuleItem()), [appendItem]);

    const addGroup = useCallback(() => appendItem(createEmptyGroup()), [appendItem]);

    const removeItem = useCallback(
        (index: number) => {
            const items = config.items.filter((_, i) => i !== index);
            return commit(withItems(items.length > 0 ? items : [createEmptyRuleItem()]));
        },
        [commit, config.items, withItems]
    );

    /*
     * The copy lands right below its source so it keeps a neighbouring
     * priority. Every clone gets a fresh id : reusing the source id would make
     * React treat the two lines as the same one. The status is reset to off
     * so a duplicate never silently goes live next to its still-active source.
     */
    const duplicateItem = useCallback(
        (index: number) => {
            const source = config.items[index];
            const copy: ConfigItem =
                source.kind === 'group'
                    ? {
                          ...source,
                          id: newId(),
                          status: 'off',
                          headers: source.headers.map((header) => ({...header, id: newId(), status: 'off'}))
                      }
                    : {...source, id: newId(), status: 'off'};
            const items = [...config.items];
            items.splice(index + 1, 0, copy);
            setFlashed(copy.id);
            return commit(withItems(items));
        },
        [commit, config.items, withItems]
    );

    const moveItem = useCallback(
        (index: number, target: number) => {
            if (target < 0 || target >= config.items.length) return;
            const items = [...config.items];
            const [moved] = items.splice(index, 1);
            items.splice(target, 0, moved);
            return commit(withItems(items));
        },
        [commit, config.items, withItems]
    );

    /*
     * Reorders a header inside its group. Drag and the (future) move buttons
     * both go through here so the priority stays array order, same as items.
     */
    const moveHeader = useCallback(
        (index: number, from: number, to: number) => {
            const target = config.items[index] as GroupItem;
            if (to < 0 || to >= target.headers.length) return;
            const headers = [...target.headers];
            const [moved] = headers.splice(from, 1);
            headers.splice(to, 0, moved);
            return withHeaders(index, headers);
        },
        [config.items, withHeaders]
    );

    const exportConfig = useCallback(() => {
        downloadJson(serializeConfig(config), 'lite-modify-headers');
    }, [config]);

    /*
     * An import replaces the whole list : the order of the items is what sets
     * their priority, so merging two files would give an arbitrary result.
     */
    const importConfig = useCallback(async () => {
        const text = await pickTextFile('application/json,.json');
        if (text === null) return;

        const result = parseImportedConfig(text);
        if (!result.ok) return setError(result.error);
        if (!confirm('Importing replaces every current rule. Continue ?')) return;

        setError(null);
        await commit(result.config);
    }, [commit]);

    return {
        config,
        started,
        registeredCount,
        error,
        toggleStarted,
        updateRule,
        updateGroup,
        updateHeader,
        addHeader,
        removeHeader,
        duplicateHeader,
        addRule,
        addGroup,
        removeItem,
        duplicateItem,
        moveItem,
        moveHeader,
        exportConfig,
        importConfig,
        flashed,
        clearFlashed: useCallback(() => setFlashed(null), [])
    };
}
