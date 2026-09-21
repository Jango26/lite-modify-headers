import {DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {ConfigItem} from '../lib/config';
import {AppHeader} from './AppHeader';
import {GroupCard} from './GroupCard';
import {RuleRow} from './RuleRow';
import {StatusBar} from './StatusBar';
import {useConfig} from './useConfig';

export function App() {
    const {
        config,
        started,
        registeredCount,
        error,
        toggleStarted,
        addRule,
        addGroup,
        exportConfig,
        importConfig,
        ...edit
    } = useConfig();

    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 4}}));

    const onDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;
        const ids = config.items.map((item) => item.id);
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        edit.moveItem(from, to);
    };

    return (
        <>
            <AppHeader started={started} onToggle={toggleStarted} onImport={importConfig} onExport={exportConfig} />
            <StatusBar started={started} registeredCount={registeredCount} />

            {error && <p className="gutter mt-4 mb-0 font-mono text-[13px] text-danger">{error}</p>}

            {/*
             * Items stack vertically, each one a full-width row or card. flex
             * keeps the rule's field widths stable without a <table> while the
             * group card simply fills the same width.
             */}
            <div className="gutter flex flex-col gap-2.5 pt-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={config.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        {config.items.map((item, index) => (
                            <ItemRow key={item.id} item={item} index={index} started={started} edit={edit} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

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
                    className="flex-none cursor-pointer rounded-md border border-accent bg-card px-[22px] py-3 text-sm font-semibold text-accent hover:bg-accent-soft">
                    + Add group
                </button>
                <p className="m-0 leading-relaxed text-muted">
                    Blank URL filter applies to all URLs · regex supported (wrap in /.../) · one filter per line · block
                    rules need a filter
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
    | 'config'
    | 'started'
    | 'registeredCount'
    | 'error'
    | 'toggleStarted'
    | 'addRule'
    | 'addGroup'
    | 'exportConfig'
    | 'importConfig'
>;

interface ItemRowProps {
    item: ConfigItem;
    index: number;
    started: boolean;
    edit: EditHandlers;
}

/*
 * ItemRow owns the sortable wrapper div so the dnd-kit transform applies at
 * the row level for both rules and groups.
 */
function ItemRow({item, index, started, edit}: ItemRowProps) {
    const onCopy = () => edit.duplicateItem(index);
    const onRemove = () => edit.removeItem(index);
    const flash = edit.flashed === item.id;
    const onFlashEnd = edit.clearFlashed;

    const {setNodeRef, attributes, listeners, transform, transition, isDragging} = useSortable({
        id: item.id
    });
    // Drop the scale component entirely : dnd-kit scales a dragged row to fit
    // the gap left by a shorter/taller neighbour, which visually squashes or
    // stretches the group card mid-drag.
    const style = {
        transform: CSS.Transform.toString(transform ? {x: transform.x, y: transform.y, scaleX: 1, scaleY: 1} : null),
        transition
    } as React.CSSProperties;

    if (item.kind === 'group')
        return (
            <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
                <GroupCard
                    group={item}
                    started={started}
                    onChange={(changes) => edit.updateGroup(index, changes)}
                    onHeaderChange={(headerIndex, changes) => edit.updateHeader(index, headerIndex, changes)}
                    onHeaderMove={(from, to) => edit.moveHeader(index, from, to)}
                    onAddHeader={() => edit.addHeader(index)}
                    onRemoveHeader={(headerIndex) => edit.removeHeader(index, headerIndex)}
                    onCopyHeader={(headerIndex) => edit.duplicateHeader(index, headerIndex)}
                    dragListeners={listeners}
                    dragAttributes={attributes}
                    onCopy={onCopy}
                    onRemove={onRemove}
                    flash={flash}
                    flashedHeader={edit.flashed}
                    onFlashEnd={onFlashEnd}
                />
            </div>
        );

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-lg ${item.status === 'on' ? 'bg-active' : 'bg-card'} shadow-[0_0_0_1px_var(--color-border)] ${flash ? 'flash-new' : ''} ${isDragging ? 'opacity-50' : ''}`}
            onAnimationEnd={onFlashEnd}>
            <RuleRow
                rule={item}
                started={started}
                onChange={(changes) => edit.updateRule(index, changes)}
                onCopy={onCopy}
                onRemove={onRemove}
                dragListeners={listeners}
                dragAttributes={attributes}
            />
        </div>
    );
}
