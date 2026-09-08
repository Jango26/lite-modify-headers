/*
 * Field styles and small controls shared by the standalone rule rows and the
 * group cards, so both stay visually identical.
 */

import {useEffect, useRef, useState} from 'react';

/*
 * No width here on purpose : the call site owns it. A `w-full` baked into
 * FIELD would collide with the explicit widths the group rows need, and
 * Tailwind resolves that collision by stylesheet order, not by class order.
 */
export const FIELD =
    'h-9 min-w-0 rounded-md border border-border bg-white px-2.5 text-[13px] focus:border-accent focus:outline-none';
export const INPUT = `${FIELD} font-mono placeholder:text-faint disabled:bg-surface disabled:text-faint`;
export const ICON_BTN =
    'cursor-pointer border-none bg-transparent p-0 text-[11px] leading-none text-fainter hover:text-muted disabled:cursor-default disabled:text-[#eceef1]';

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
                className={`${ICON_BTN} text-[17px] hover:text-[#dc2626]`}>
                ✕
            </button>
            {open && (
                <div className="absolute top-full right-0 z-10 mt-1.5 w-[184px] rounded-lg border border-border bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                    <p className="m-0 mb-2.5 text-[13px] text-muted">Delete this {label}?</p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="cursor-pointer rounded-md border border-border bg-white px-2.5 py-1 text-[12px] text-muted hover:bg-surface">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onConfirm();
                            }}
                            className="cursor-pointer rounded-md border-none bg-[#dc2626] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#b91c1c]">
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
 *
 * The glyph is inline SVG rather than a character like the neighbouring
 * buttons : the Unicode copy symbols all render as some skewed pair of squares
 * that depends on whichever font the system picks.
 */
export function CopyButton({label, onCopy}: {label: string; onCopy: () => void}) {
    return (
        <button
            type="button"
            title={`Duplicate ${label}`}
            onClick={onCopy}
            className={`${ICON_BTN} flex flex-none items-center justify-center hover:text-accent`}>
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
        </button>
    );
}

interface MoveButtonsProps {
    isFirst: boolean;
    isLast: boolean;
    onMove: (offset: number) => void;
    label: string;
}

export function MoveButtons({isFirst, isLast, onMove, label}: MoveButtonsProps) {
    return (
        <div className="flex flex-none flex-col items-center gap-0.5">
            <button
                type="button"
                title={`Move ${label} up`}
                className={ICON_BTN}
                disabled={isFirst}
                onClick={() => onMove(-1)}>
                ▲
            </button>
            <button
                type="button"
                title={`Move ${label} down`}
                className={ICON_BTN}
                disabled={isLast}
                onClick={() => onMove(1)}>
                ▼
            </button>
        </div>
    );
}
