/*
 * The url filter is the one field that routinely holds something too long to
 * read in a table cell, so the cell is a read only preview and the editing
 * happens in a dialog that has room for the whole value.
 */

import {useEffect, useRef, useState} from 'react';
import {parseUrlFilters} from '../lib/config';
import {INPUT} from './fields';

const URL_FILTER_HINT = [
    ['empty', 'matches every URL'],
    ['example.com/api', 'substring match'],
    ['/^https:\\/\\/.*\\.dev\\//', 'regex — wrap in /.../'],
    ['||example.com', 'Chrome pattern — | anchors, * wildcard'],
    ['one per line', 'the rule applies to each of them']
];

/*
 * The url filter syntax is not guessable, so it comes with a cheat sheet
 * rather than sending the user to the README. Shown both in the table header
 * and inside the editing dialog, which is where it is needed most.
 *
 * The tooltip stays dark in both themes, the dialog sits on the card
 * background, so the two need different ink.
 */
function HintList({onTip}: {onTip?: boolean}) {
    const syntax = onTip ? 'text-tip-ink' : 'text-muted';
    const meaning = onTip ? 'text-tip-muted' : 'text-faint';
    const divider = onTip ? 'border-tip-border' : 'border-border';

    return (
        <>
            {URL_FILTER_HINT.map(([example, description]) => (
                <span key={example} className="mb-1.5 block last:mb-0">
                    <code className={`font-mono text-[11px] ${syntax}`}>{example}</code>
                    <span className={`ml-1.5 text-[11px] normal-case ${meaning}`}>{description}</span>
                </span>
            ))}
            <span className={`mt-2 block border-t pt-2 text-[11px] normal-case ${divider} ${meaning}`}>
                Block rules require a filter.
            </span>
        </>
    );
}

export function UrlFilterHint() {
    return (
        <span className="group relative ml-1.5 inline-block align-middle">
            <span className="flex size-[15px] cursor-help items-center justify-center rounded-full bg-border text-[10px] font-bold text-muted">
                ?
            </span>
            <span className="pointer-events-none absolute top-[22px] left-0 z-10 hidden w-[330px] rounded-lg bg-tip p-3 text-left font-normal tracking-normal shadow-[0_4px_16px_rgba(0,0,0,0.2)] group-hover:block">
                <HintList onTip />
            </span>
        </span>
    );
}

interface UrlFilterFieldProps {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    /* What the filter belongs to, shown in the dialog title : "rule" / "group". */
    label: string;
}

export function UrlFilterField({value, placeholder, onChange, label}: UrlFilterFieldProps) {
    const [open, setOpen] = useState(false);
    const filters = value.trim() === '' ? [] : parseUrlFilters(value);
    /* Only the first filter fits the cell, so the others are just counted. */
    const preview = filters.length > 1 ? `${filters[0]}  +${filters.length - 1} more` : value;

    return (
        <>
            <input
                type="text"
                readOnly
                className={`${INPUT} w-full cursor-pointer overflow-hidden text-ellipsis`}
                placeholder={placeholder}
                title={filters.length > 1 ? filters.join('\n') : value || placeholder}
                value={preview}
                onClick={() => setOpen(true)}
                /* Read only kills typing but not focus, so the keyboard keeps working. */
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            />
            {open && (
                <UrlFilterDialog
                    value={value}
                    label={label}
                    onCancel={() => setOpen(false)}
                    onSave={(next) => {
                        setOpen(false);
                        if (next !== value) onChange(next);
                    }}
                />
            )}
        </>
    );
}

interface UrlFilterDialogProps {
    value: string;
    label: string;
    onCancel: () => void;
    onSave: (value: string) => void;
}

function UrlFilterDialog({value, label, onCancel, onSave}: UrlFilterDialogProps) {
    const [draft, setDraft] = useState(value);
    const field = useRef<HTMLTextAreaElement>(null);

    /*
     * Focus lands the caret at the start, which is the wrong end when the
     * point is usually to append another filter.
     */
    useEffect(() => {
        const field_element = field.current;
        if (!field_element) return;
        field_element.focus();
        field_element.setSelectionRange(field_element.value.length, field_element.value.length);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    /*
     * Each line is one filter, so newlines are meaningful and only the
     * whitespace inside a line gets stripped : a filter never contains a
     * space, but copying a URL out of a document often brings one along.
     */
    const submit = () =>
        onSave(
            draft
                .split('\n')
                .map((line) => line.replace(/\s+/g, ''))
                .filter((line) => line !== '')
                .join('\n')
        );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}>
            <div className="w-[660px] max-w-full rounded-xl border border-border bg-card p-5 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
                <p className="m-0 mb-3 text-[13px] font-semibold text-muted">URL filter for this {label}</p>
                <textarea
                    ref={field}
                    rows={8}
                    className="w-full resize-none rounded-md border border-border bg-card p-2.5 font-mono text-[13px] break-all focus:border-accent focus:outline-none"
                    placeholder="all URLs"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    /* Enter inserts a line, so saving needs the modifier. */
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                <div className="mt-3">
                    <HintList />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-md border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted hover:bg-surface">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        className="cursor-pointer rounded-md border-none bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-hover">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
