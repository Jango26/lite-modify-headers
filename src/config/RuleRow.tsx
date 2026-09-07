import type {Rule, RuleAction, RuleTarget} from '../lib/config';
import {DeleteButton, FIELD, INPUT, MoveButtons, Select} from './fields';

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
    isFirst: boolean;
    isLast: boolean;
    onChange: (changes: Partial<Rule>) => void;
    onMove: (offset: number) => void;
    onRemove: () => void;
}

export function RuleRow({rule, isFirst, isLast, onChange, onMove, onRemove}: RuleRowProps) {
    return (
        <tr className="rounded-lg bg-white shadow-[0_0_0_1px_var(--color-border)]">
            <Cell first>
                <input
                    type="checkbox"
                    title="Activate / deactivate rule"
                    checked={rule.status === 'on'}
                    onChange={(event) => onChange({status: event.target.checked ? 'on' : 'off'})}
                    className="relative m-0 h-[22px] w-[42px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_#d5d8dd] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-blue checked:shadow-none checked:after:translate-x-5"
                />
            </Cell>
            <Cell>
                <input
                    type="text"
                    className={`${FIELD} w-full`}
                    placeholder="note"
                    value={rule.name ?? ''}
                    onChange={(event) => onChange({name: event.target.value})}
                />
            </Cell>
            <Cell>
                <Select
                    options={TYPE_LABELS}
                    value={rule.apply_on}
                    onChange={(value) => onChange({apply_on: value})}
                    className={`${FIELD} w-full cursor-pointer bg-blue-soft text-center font-mono text-blue-ink [text-align-last:center]`}
                />
            </Cell>
            <Cell>
                <Select
                    options={ACTION_LABELS}
                    value={rule.action}
                    onChange={(value) => onChange({action: value})}
                    className={`${FIELD} w-full`}
                />
            </Cell>
            <Cell>
                <input
                    type="text"
                    className={`${INPUT} w-full`}
                    placeholder="header-name"
                    value={rule.header_name}
                    disabled={rule.action === 'block'}
                    onChange={(event) => onChange({header_name: event.target.value})}
                />
            </Cell>
            <Cell>
                <input
                    type="text"
                    className={`${INPUT} w-full`}
                    placeholder="header-value"
                    value={rule.header_value}
                    disabled={rule.action !== 'set'}
                    onChange={(event) => onChange({header_value: event.target.value})}
                />
            </Cell>
            <Cell>
                <input
                    type="text"
                    className={`${INPUT} w-full`}
                    placeholder={rule.action === 'block' ? 'required for block' : 'all URLs'}
                    value={rule.url_filter}
                    onChange={(event) => onChange({url_filter: event.target.value})}
                />
            </Cell>
            <Cell>
                <MoveButtons isFirst={isFirst} isLast={isLast} onMove={onMove} label="rule" />
            </Cell>
            <Cell last>
                <DeleteButton label="rule" onConfirm={onRemove} />
            </Cell>
        </tr>
    );
}

function Cell({children, first, last}: {children: React.ReactNode; first?: boolean; last?: boolean}) {
    const rounding = [
        'px-2.5 py-3.5 align-middle',
        first ? 'rounded-l-lg pl-[18px]' : '',
        last ? 'rounded-r-lg pr-[18px]' : ''
    ].join(' ');
    return <td className={rounding}>{children}</td>;
}
