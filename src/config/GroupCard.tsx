import type {GroupHeader, GroupHeaderAction, GroupItem, RuleTarget} from '../lib/config';
import {DeleteButton, FIELD, INPUT, MoveButtons, Select} from './fields';

const GROUP_ACTION_LABELS: [GroupHeaderAction, string][] = [
    ['set', 'Set'],
    ['delete', 'Delete']
];

const TYPE_LABELS: [RuleTarget, string][] = [
    ['req', 'REQ'],
    ['res', 'RES']
];

interface GroupCardProps {
    group: GroupItem;
    isFirst: boolean;
    isLast: boolean;
    onChange: (changes: Partial<Omit<GroupItem, 'kind' | 'headers'>>) => void;
    onHeaderChange: (headerIndex: number, changes: Partial<GroupHeader>) => void;
    onAddHeader: () => void;
    onRemoveHeader: (headerIndex: number) => void;
    onMove: (offset: number) => void;
    onRemove: () => void;
}

/*
 * A group shares one name and one url filter with all of its headers, so both
 * live on the card header instead of being repeated on every line.
 */
export function GroupCard({
    group,
    isFirst,
    isLast,
    onChange,
    onHeaderChange,
    onAddHeader,
    onRemoveHeader,
    onMove,
    onRemove
}: GroupCardProps) {
    return (
        <div className="rounded-lg bg-white shadow-[0_0_0_1px_var(--color-border)]">
            <div className="flex items-center gap-2.5 border-b border-border px-[18px] py-3">
                <input
                    type="checkbox"
                    title="Activate / deactivate the whole group"
                    checked={group.status === 'on'}
                    onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                    className="relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_#d5d8dd] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-blue checked:shadow-none checked:after:translate-x-5"
                />
                <span className="flex-none rounded bg-blue-soft px-2 py-1 font-mono text-[11px] font-semibold text-blue-ink">
                    GROUP
                </span>
                <input
                    type="text"
                    className={`${FIELD} w-[220px] flex-1`}
                    placeholder="group name"
                    value={group.name}
                    onChange={(event) => onChange({name: event.target.value})}
                />
                <label className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex-none text-[11px] font-semibold tracking-[0.08em] text-muted">URL FILTER</span>
                    <input
                        type="text"
                        className={`${INPUT} w-full`}
                        placeholder="all URLs"
                        value={group.url_filter}
                        onChange={(event) => onChange({url_filter: event.target.value})}
                    />
                </label>
                <MoveButtons isFirst={isFirst} isLast={isLast} onMove={onMove} label="group" />
                <DeleteButton label="group" onConfirm={onRemove} />
            </div>

            <div className="px-[18px] py-2.5">
                {group.headers.map((header, headerIndex) => (
                    <HeaderRow
                        key={headerIndex}
                        header={header}
                        onChange={(changes) => onHeaderChange(headerIndex, changes)}
                        onRemove={() => onRemoveHeader(headerIndex)}
                    />
                ))}
                <button
                    type="button"
                    onClick={onAddHeader}
                    className="mt-1 cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-blue hover:underline">
                    + Add header
                </button>
            </div>
        </div>
    );
}

interface HeaderRowProps {
    header: GroupHeader;
    onChange: (changes: Partial<GroupHeader>) => void;
    onRemove: () => void;
}

function HeaderRow({header, onChange, onRemove}: HeaderRowProps) {
    return (
        <div className="flex items-center gap-2.5 py-1.5">
            <input
                type="checkbox"
                title="Activate / deactivate header"
                checked={header.status === 'on'}
                onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                className="relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_#d5d8dd] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-blue checked:shadow-none checked:after:translate-x-5"
            />
            <Select
                options={TYPE_LABELS}
                value={header.apply_on}
                onChange={(value) => onChange({apply_on: value})}
                className={`${FIELD} w-[90px] flex-none cursor-pointer bg-blue-soft text-center font-mono text-blue-ink [text-align-last:center]`}
            />
            <Select
                options={GROUP_ACTION_LABELS}
                value={header.action}
                onChange={(value) => onChange({action: value})}
                className={`${FIELD} w-[110px] flex-none cursor-pointer`}
            />
            <input
                type="text"
                className={`${INPUT} min-w-0 flex-1`}
                placeholder="header-name"
                value={header.header_name}
                onChange={(event) => onChange({header_name: event.target.value})}
            />
            <input
                type="text"
                className={`${INPUT} min-w-0 flex-1`}
                placeholder="header-value"
                value={header.header_value}
                disabled={header.action !== 'set'}
                onChange={(event) => onChange({header_value: event.target.value})}
            />
            <DeleteButton label="header" onConfirm={onRemove} />
        </div>
    );
}
