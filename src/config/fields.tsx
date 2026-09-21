/*
 * Field styles and small controls shared by the standalone rule rows and the
 * group cards, so both stay visually identical.
 */

import {useEffect, useRef, useState} from 'react';
import {Copy, Trash2} from 'lucide-react';

/*
 * No width here on purpose : the call site owns it. A `w-full` baked into
 * FIELD would collide with the explicit widths the group rows need, and
 * Tailwind resolves that collision by stylesheet order, not by class order.
 */
export const FIELD =
    'h-9 min-w-0 rounded-md border border-border bg-card px-2.5 text-[13px] focus:border-accent focus:outline-none';
export const INPUT = `${FIELD} font-mono placeholder:text-faint disabled:bg-surface disabled:text-faint`;
export const ICON_BTN =
    'cursor-pointer border-none bg-transparent p-0 text-[11px] leading-none text-faint hover:text-muted disabled:cursor-default disabled:text-disabled';

interface SelectProps<T extends string> {
    options: [T, string][];
    value: T;
    onChange: (value: T) => void;
    className: string;
}

export function Select<T extends string>({options, value, onChange, className}: SelectProps<T>) {
    return (
        <select className={className} value={value} onChange={(event) => onChange(event.target.value as T)}>
            {options.map(([option, label]) => (
                <option key={option} value={option}>
                    {label}
                </option>
            ))}
        </select>
    );
}

interface DeleteButtonProps {
    /* What is being deleted, shown in the popover : "Delete this rule?" */
    label: string;
    onConfirm: () => void;
}

/*
 * Deleting a rule cannot be undone, so the ✕ only opens a small confirmation
 * bubble anchored to the button ; the actual removal happens on confirm.
 */
export function DeleteButton({label, onConfirm}: DeleteButtonProps) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent) => {
            if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={wrapper} className="relative flex-none">
            <button
                type="button"
                title={`Delete ${label}`}
                onClick={() => setOpen((value) => !value)}
                className={`${ICON_BTN} hover:text-danger`}>
                <Trash2 size={16} aria-hidden="true" />
            </button>
            {open && (
                <div className="absolute top-full right-0 z-10 mt-1.5 w-[184px] rounded-lg border border-border bg-card p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                    <p className="m-0 mb-2.5 text-[13px] text-muted">Delete this {label}?</p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="cursor-pointer rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-muted hover:bg-surface">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onConfirm();
                            }}
                            className="cursor-pointer rounded-md border-none bg-danger px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-danger-hover">
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/*
 * Duplicating is trivially undone by deleting the copy, so unlike the delete
 * button this one acts right away without a confirmation bubble.
 */
export function CopyButton({label, onCopy}: {label: string; onCopy: () => void}) {
    return (
        <button
            type="button"
            title={`Duplicate ${label}`}
            onClick={onCopy}
            className={`${ICON_BTN} flex flex-none items-center justify-center hover:text-accent`}>
            <Copy size={16} aria-hidden="true" />
        </button>
    );
}
