import {useEffect, useState} from 'react';
import {applyConfig, loadState, storeConfig, storeStarted} from '../lib/chrome';
import {flattenItems, getDefaultConfig, isRuleComplete, type Config, type ConfigItem} from '../lib/config';
import {GithubLink} from '../components/GithubLink';

const CONFIG_PAGE = 'src/config/index.html';

async function findConfigTab(): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({currentWindow: true});
    return tabs.find((tab) => tab.url?.startsWith(chrome.runtime.getURL('')));
}

export function Menu() {
    const [config, setConfig] = useState<Config>(getDefaultConfig);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        loadState().then((state) => {
            setConfig(state.config);
            setStarted(state.started);
        });
    }, []);

    async function toggleStarted() {
        const next = !started;
        setStarted(next);
        await storeStarted(next);
        await applyConfig(config, next);
    }

    /*
     * The popup lists items rather than expanded rules, so toggling a group
     * turns all of its headers on or off at once.
     */
    async function toggleItem(index: number) {
        const items = config.items.map((item, i) =>
            i === index ? {...item, status: item.status === 'on' ? ('off' as const) : ('on' as const)} : item
        );
        const next = {...config, items};
        setConfig(next);
        await storeConfig(next);
        await applyConfig(next, started);
    }

    /*
     * Reuse an already open config page rather than piling up tabs.
     */
    async function openConfigTab() {
        const existing = await findConfigTab();
        if (existing?.id) await chrome.tabs.update(existing.id, {active: true});
        else await chrome.tabs.create({url: chrome.runtime.getURL(CONFIG_PAGE)});
        window.close();
    }

    return (
        <div className="w-[380px]">
            <Header started={started} onToggle={toggleStarted} />
            <StatusLine started={started} items={config.items} />

            <ul className="m-0 list-none p-0">
                {config.items.map((item, index) => (
                    <ItemLine key={index} item={item} onToggle={() => toggleItem(index)} />
                ))}
            </ul>

            <footer className="flex items-center justify-between border-t border-border px-4 py-3">
                <button
                    type="button"
                    onClick={openConfigTab}
                    className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-accent hover:underline">
                    Open rule editor
                </button>
                <GithubLink size={17} />
            </footer>
        </div>
    );
}

function Header({started, onToggle}: {started: boolean; onToggle: () => void}) {
    return (
        <header className="flex items-center justify-between px-4 py-3.5">
            <h1 className="m-0 text-base font-bold tracking-[-0.2px]">Lite Modify Headers</h1>
            <Toggle checked={started} title="Start / stop applying rules" onChange={onToggle} large />
        </header>
    );
}

/*
 * The counters speak in browser rules, so groups have to be expanded first :
 * one group line can stand for several modified headers.
 */
function StatusLine({started, items}: {started: boolean; items: ConfigItem[]}) {
    const rules = flattenItems(items);
    const activeCount = rules.filter(isRuleComplete).length;
    const label = started ? `Running: ${activeCount} headers modified` : 'Paused: no headers modified';

    return (
        <div className="flex items-center justify-between border-y border-border bg-surface px-4 py-2.5 font-mono text-[13px] text-muted">
            <span className="flex items-center gap-2">
                <span className={`size-2 flex-none rounded-full ${started ? 'bg-running' : 'bg-faint'}`} />
                <span className={started ? 'text-running' : undefined}>{label}</span>
            </span>
            <span>
                {activeCount} / {rules.length} rules
            </span>
        </div>
    );
}

/*
 * An item the user never named still has to be recognizable, so fall back on
 * the header it touches, then on the action for header-less block rules.
 */
function itemLabel(item: ConfigItem): string {
    if (item.name?.trim()) return item.name.trim();
    if (item.kind === 'group') return `group of ${item.headers.length}`;
    return item.header_name.trim() || 'block';
}

function itemDetail(item: ConfigItem): string {
    if (item.kind !== 'group') return item.url_filter || 'all URLs';
    const headers = item.headers.length === 1 ? '1 header' : `${item.headers.length} headers`;
    return `${headers} · ${item.url_filter || 'all URLs'}`;
}

/* A group applies to both requests and responses, so it shows no single tag. */
function itemTag(item: ConfigItem): string {
    if (item.kind === 'group') return 'GROUP';
    return item.apply_on === 'res' ? 'RES' : 'REQ';
}

function ItemLine({item, onToggle}: {item: ConfigItem; onToggle: () => void}) {
    return (
        <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Toggle checked={item.status === 'on'} title="Activate / deactivate" onChange={onToggle} />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[13px] font-bold text-ink">{itemLabel(item)}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{itemDetail(item)}</span>
            </span>
            <span className="flex-none rounded bg-accent-soft px-2 py-1 font-mono text-[11px] font-semibold text-accent-ink">
                {itemTag(item)}
            </span>
        </li>
    );
}

interface ToggleProps {
    checked: boolean;
    title: string;
    onChange: () => void;
    large?: boolean;
}

function Toggle({checked, title, onChange, large}: ToggleProps) {
    const size = large
        ? 'h-[26px] w-[48px] after:size-[22px] checked:after:translate-x-[22px]'
        : 'h-[22px] w-[42px] after:size-[18px] checked:after:translate-x-5';

    return (
        <input
            type="checkbox"
            title={title}
            checked={checked}
            onChange={onChange}
            className={`relative m-0 flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_#d5d8dd] transition-colors after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-accent checked:shadow-none ${size}`}
        />
    );
}
