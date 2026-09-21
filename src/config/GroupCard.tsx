import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragEndEvent,
    type DraggableAttributes
} from '@dnd-kit/core';
import type {SyntheticListenerMap} from '@dnd-kit/core/dist/hooks/utilities';
import {SortableContext, verticalListSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {GroupHeader, GroupHeaderAction, GroupItem, RuleTarget} from '../lib/config';
import {DragHandle} from './DragHandle';
import {CopyButton, DeleteButton, FIELD, INPUT, Select} from './fields';
import {UrlFilterField} from './UrlFilterField';

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
    started: boolean;
    onChange: (changes: Partial<Omit<GroupItem, 'kind' | 'headers'>>) => void;
    onHeaderChange: (headerIndex: number, changes: Partial<GroupHeader>) => void;
    onHeaderMove: (from: number, to: number) => void;
    onAddHeader: () => void;
    onRemoveHeader: (headerIndex: number) => void;
    onCopyHeader: (headerIndex: number) => void;
    onCopy: () => void;
    onRemove: () => void;
    /* dnd-kit listeners for the whole-group drag, handed down from ItemRow. */
    dragListeners?: SyntheticListenerMap;
    dragAttributes?: DraggableAttributes;
    /* Highlights the card, or one of its header rows, right after a copy. */
    flash: boolean;
    flashedHeader: string | null;
    onFlashEnd: () => void;
}

/*
 * A group shares one name and one url filter with all of its headers, so both
 * live on the card header instead of being repeated on every line.
 */
export function GroupCard({
    group,
    started,
    onChange,
    onHeaderChange,
    onHeaderMove,
    onAddHeader,
    onRemoveHeader,
    onCopyHeader,
    onCopy,
    onRemove,
    dragListeners,
    dragAttributes,
    flash,
    flashedHeader,
    onFlashEnd
}: GroupCardProps) {
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}));

    const onHeaderDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;
        const ids = group.headers.map((header) => header.id);
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        onHeaderMove(from, to);
    };

    return (
        <div
            className={`rounded-lg ${group.status === 'on' ? 'bg-active' : 'bg-card'} shadow-[0_0_0_1px_var(--color-border)] ${flash ? 'flash-new' : ''}`}
            onAnimationEnd={onFlashEnd}>
            <div className="flex items-center gap-2.5 border-b border-border px-[18px] py-3">
                <input
                    type="checkbox"
                    title="Activate / deactivate the whole group"
                    checked={group.status === 'on'}
                    onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                    className={`relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_var(--color-fainter)] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-accent checked:shadow-none checked:after:translate-x-5 ${started ? '' : 'checked:bg-accent/40'}`}
                />
                <span className="flex-none rounded bg-accent-soft px-2 py-1 font-mono text-[11px] font-semibold text-accent-ink">
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
                    <UrlFilterField
                        label="group"
                        value={group.url_filter}
                        placeholder="all URLs"
                        onChange={(url_filter) => onChange({url_filter})}
                    />
                </label>
                <CopyButton label="group" onCopy={onCopy} />
                {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
                <DeleteButton label="group" onConfirm={onRemove} />
            </div>

            <div className="flex flex-col gap-1.5 px-[18px] py-2.5">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onHeaderDragEnd}>
                    <SortableContext
                        items={group.headers.map((header) => header.id)}
                        strategy={verticalListSortingStrategy}>
                        {group.headers.map((header, headerIndex) => (
                            <HeaderRow
                                key={header.id}
                                header={header}
                                groupActive={group.status === 'on'}
                                started={started}
                                onChange={(changes) => onHeaderChange(headerIndex, changes)}
                                onCopy={() => onCopyHeader(headerIndex)}
                                onRemove={() => onRemoveHeader(headerIndex)}
                                flash={flashedHeader === header.id}
                                onFlashEnd={onFlashEnd}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
                <button
                    type="button"
                    onClick={onAddHeader}
                    className="cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-semibold text-accent hover:underline">
                    + Add header
                </button>
            </div>
        </div>
    );
}

interface HeaderRowProps {
    header: GroupHeader;
    groupActive: boolean;
    started: boolean;
    onChange: (changes: Partial<GroupHeader>) => void;
    onCopy: () => void;
    onRemove: () => void;
    flash: boolean;
    onFlashEnd: () => void;
}

/*
 * A header row's green only shows when the group is active AND the global
 * switch is on : if either is off, a switched-on header is not really in
 * effect, so the row background stays neutral and the toggle dims to a faint
 * green instead.
 */
function HeaderRow({header, groupActive, started, onChange, onCopy, onRemove, flash, onFlashEnd}: HeaderRowProps) {
    const active = groupActive && started && header.status === 'on';
    const {setNodeRef, attributes, listeners, transform, transition, isDragging} = useSortable({id: header.id});
    const style = {
        transform: CSS.Transform.toString(transform ? {x: transform.x, y: transform.y, scaleX: 1, scaleY: 1} : null),
        transition
    } as React.CSSProperties;
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${active ? 'bg-active' : 'bg-card'} ${flash ? 'flash-new' : ''} ${isDragging ? 'opacity-50' : ''}`}
            onAnimationEnd={onFlashEnd}>
            <input
                type="checkbox"
                title="Activate / deactivate header"
                checked={header.status === 'on'}
                onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                className={`relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_var(--color-fainter)] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-accent checked:shadow-none checked:after:translate-x-5 ${groupActive && started ? '' : 'checked:bg-accent/40'}`}
            />
            <Select
                options={TYPE_LABELS}
                value={header.apply_on}
                onChange={(value) => onChange({apply_on: value})}
                className={`${FIELD} w-[90px] flex-none cursor-pointer bg-accent-soft text-center font-mono text-accent-ink [text-align-last:center]`}
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
            <CopyButton label="header" onCopy={onCopy} />
            <DragHandle listeners={listeners} attributes={attributes} />
            <DeleteButton label="header" onConfirm={onRemove} />
        </div>
    );
}
