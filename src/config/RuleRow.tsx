import type {DraggableAttributes} from '@dnd-kit/core';
import type {SyntheticListenerMap} from '@dnd-kit/core/dist/hooks/utilities';
import type {Rule, RuleAction, RuleTarget} from '../lib/config';
import {DragHandle} from './DragHandle';
import {CopyButton, DeleteButton, FIELD, INPUT, Select} from './fields';
import {UrlFilterField} from './UrlFilterField';

const ACTION_LABELS: [RuleAction, string][] = [
    ['set', 'Set'],
    ['delete', 'Delete'],
    ['block', 'Block']
];

const TYPE_LABELS: [RuleTarget, string][] = [
    ['req', 'REQ'],
    ['res', 'RES']
];

interface RuleRowProps {
    rule: Rule;
    onChange: (changes: Partial<Rule>) => void;
    onCopy: () => void;
    onRemove: () => void;
    /* dnd-kit hooks handed down from the sortable wrapper in ItemRow. */
    dragListeners?: SyntheticListenerMap;
    dragAttributes?: DraggableAttributes;
}

/*
 * Renders the row's fields in a flex strip — the wrapping card is owned by
 * ItemRow so the dnd-kit sortable transform applies at the row level.
 */
export function RuleRow({
    rule,
    onChange,
    onCopy,
    onRemove,
    dragListeners,
    dragAttributes
}: RuleRowProps) {
    return (
        <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <Cell className="w-[42px] flex-none justify-center">
                <input
                    type="checkbox"
                    title="Activate / deactivate rule"
                    checked={rule.status === 'on'}
                    onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                    className="relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_var(--color-fainter)] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-accent checked:shadow-none checked:after:translate-x-5"
                />
            </Cell>
            <Cell className="w-[180px] flex-none">
                <input
                    type="text"
                    className={`${FIELD} w-full`}
                    placeholder="note"
                    value={rule.name ?? ''}
                    onChange={(event) => onChange({name: event.target.value})}
                />
            </Cell>
            <Cell className="w-[120px] flex-none">
                <Select
                    options={TYPE_LABELS}
                    value={rule.apply_on}
                    onChange={(value) => onChange({apply_on: value})}
                    className={`${FIELD} w-full cursor-pointer bg-accent-soft text-center font-mono text-accent-ink [text-align-last:center]`}
                />
            </Cell>
            <Cell className="w-[130px] flex-none">
                <Select
                    options={ACTION_LABELS}
                    value={rule.action}
                    onChange={(value) => onChange({action: value})}
                    className={`${FIELD} w-full`}
                />
            </Cell>
            <Cell className="min-w-0 flex-1">
                <input
                    type="text"
                    className={`${INPUT} w-full`}
                    placeholder="header-name"
                    value={rule.header_name}
                    disabled={rule.action === 'block'}
                    onChange={(event) => onChange({header_name: event.target.value})}
                />
            </Cell>
            <Cell className="min-w-0 flex-1">
                <input
                    type="text"
                    className={`${INPUT} w-full`}
                    placeholder="header-value"
                    value={rule.header_value}
                    disabled={rule.action !== 'set'}
                    onChange={(event) => onChange({header_value: event.target.value})}
                />
            </Cell>
            <Cell className="min-w-0 flex-1">
                <UrlFilterField
                    label="rule"
                    value={rule.url_filter}
                    placeholder={rule.action === 'block' ? 'required for block' : 'all URLs'}
                    onChange={(url_filter) => onChange({url_filter})}
                />
            </Cell>
            <Cell className="flex-none">
                <CopyButton label="rule" onCopy={onCopy} />
            </Cell>
            <Cell className="flex-none">
                {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
            </Cell>
            <Cell className="flex-none pt-[4px]">
                <DeleteButton label="rule" onConfirm={onRemove}/>
            </Cell>
        </div>
    );
}

/* A flex sub-cell : just aligns its content and applies the caller's width. */
function Cell({children, className}: {children: React.ReactNode; className?: string}) {
    return <div className={`flex items-center ${className ?? ''}`}>{children}</div>;
}
