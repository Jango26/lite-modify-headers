import type {ConfigItem} from '../lib/config';
import {AppHeader} from './AppHeader';
import {GroupCard} from './GroupCard';
import {RuleRow} from './RuleRow';
import {StatusBar} from './StatusBar';
import {useConfig} from './useConfig';

const URL_FILTER_HINT = [
    ['empty', 'matches every URL'],
    ['example.com/api', 'substring match'],
    ['/^https:\\/\\/.*\\.dev\\//', 'regex — wrap in /.../'],
    ['||example.com', 'Chrome pattern — | anchors, * wildcard']
];

const COLUMNS: [string, string, boolean?][] = [
    ['ON', 'w-[70px]'],
    ['NAME', 'w-[180px]'],
    ['TYPE', 'w-[120px]'],
    ['ACTION', 'w-[130px]'],
    ['HEADER', ''],
    ['VALUE', ''],
    ['URL FILTER', '', true],
    ['', 'w-10'],
    ['', 'w-10'],
    ['', 'w-10']
];

/*
 * The url filter syntax is not guessable, so the header carries its own
 * cheat sheet rather than sending the user to the README.
 */
function UrlFilterHint() {
    return (
        <span className="group relative ml-1.5 inline-block align-middle">
            <span className="flex size-[15px] cursor-help items-center justify-center rounded-full bg-border text-[10px] font-bold text-muted">
                ?
            </span>
            <span className="pointer-events-none absolute top-[22px] left-0 z-10 hidden w-[330px] rounded-lg bg-ink p-3 text-left font-normal tracking-normal shadow-[0_4px_16px_rgba(0,0,0,0.2)] group-hover:block">
                {URL_FILTER_HINT.map(([syntax, meaning]) => (
                    <span key={syntax} className="mb-1.5 block last:mb-0">
                        <code className="font-mono text-[11px] text-white">{syntax}</code>
                        <span className="ml-1.5 text-[11px] text-[#b8bcc4] normal-case">{meaning}</span>
                    </span>
                ))}
                <span className="mt-2 block border-t border-[#3a3f47] pt-2 text-[11px] text-[#b8bcc4] normal-case">
                    Block rules require a filter.
                </span>
            </span>
        </span>
    );
}

export function App() {
    const {config, started, registeredCount, error, toggleStarted, addRule, addGroup, ...edit} = useConfig();

    return (
        <>
            <AppHeader started={started} onToggle={toggleStarted} />
            <StatusBar started={started} registeredCount={registeredCount} />

            {error && <p className="gutter mt-4 mb-0 font-mono text-[13px] text-[#dc2626]">{error}</p>}

            {/*
             * Fixed layout : otherwise the group cards, which span every
             * column, would widen the table past the content area.
             */}
            <table className="w-full gutter table-fixed border-separate border-spacing-y-2.5 pt-2">
                <thead>
                    <tr>
                        {COLUMNS.map(([label, width, hint], index) => (
                            <th
                                key={index}
                                className={`px-2.5 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-muted ${width}`}>
                                {label}
                                {hint && <UrlFilterHint />}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {config.items.map((item, index) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            index={index}
                            isLast={index === config.items.length - 1}
                            edit={edit}
                        />
                    ))}
                </tbody>
            </table>

            <div className="gutter flex items-start gap-[22px] pt-4">
                <button
                    type="button"
                    onClick={addRule}
                    className="flex-none cursor-pointer rounded-md border-none bg-accent px-[22px] py-3 text-sm font-semibold text-white hover:bg-accent-hover">
                    + Add rule
                </button>
                <button
                    type="button"
                    onClick={addGroup}
                    className="flex-none cursor-pointer rounded-md border border-accent bg-white px-[22px] py-3 text-sm font-semibold text-accent hover:bg-accent-soft">
                    + Add group
                </button>
                <p className="m-0 leading-relaxed text-muted">
                    Blank URL filter applies to all URLs · regex supported (wrap in /.../) · block rules need a filter
                    <br />
                    A group shares one name and one URL filter across all of its headers.
                    <br />
                    Rules apply top to bottom — the first to change a header wins.
                </p>
            </div>
        </>
    );
}

type EditHandlers = Omit<
    ReturnType<typeof useConfig>,
    'config' | 'started' | 'registeredCount' | 'error' | 'toggleStarted' | 'addRule' | 'addGroup'
>;

interface ItemRowProps {
    item: ConfigItem;
    index: number;
    isLast: boolean;
    edit: EditHandlers;
}

/*
 * A group is rendered as a card spanning the whole table instead of a row :
 * its shared name and url filter do not line up with the rule columns.
 */
function ItemRow({item, index, isLast, edit}: ItemRowProps) {
    const isFirst = index === 0;
    const onMove = (offset: number) => edit.moveItem(index, index + offset);
    const onCopy = () => edit.duplicateItem(index);
    const onRemove = () => edit.removeItem(index);
    const flash = edit.flashed === item.id;
    const onFlashEnd = edit.clearFlashed;

    if (item.kind === 'group')
        return (
            <tr>
                <td colSpan={COLUMNS.length} className="p-0">
                    <GroupCard
                        group={item}
                        isFirst={isFirst}
                        isLast={isLast}
                        onChange={(changes) => edit.updateGroup(index, changes)}
                        onHeaderChange={(headerIndex, changes) => edit.updateHeader(index, headerIndex, changes)}
                        onAddHeader={() => edit.addHeader(index)}
                        onRemoveHeader={(headerIndex) => edit.removeHeader(index, headerIndex)}
                        onCopyHeader={(headerIndex) => edit.duplicateHeader(index, headerIndex)}
                        onMove={onMove}
                        onCopy={onCopy}
                        onRemove={onRemove}
                        flash={flash}
                        flashedHeader={edit.flashed}
                        onFlashEnd={onFlashEnd}
                    />
                </td>
            </tr>
        );

    return (
        <RuleRow
            rule={item}
            isFirst={isFirst}
            isLast={isLast}
            onChange={(changes) => edit.updateRule(index, changes)}
            onMove={onMove}
            onCopy={onCopy}
            onRemove={onRemove}
            flash={flash}
            onFlashEnd={onFlashEnd}
        />
    );
}
