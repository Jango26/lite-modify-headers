const ICON_CLASS =
    'flex flex-none cursor-pointer items-center border-none bg-transparent p-0 text-muted transition-colors hover:text-ink';

interface ConfigTransferProps {
    onImport: () => void;
    onExport: () => void;
    size?: number;
}

/*
 * Import and export sit next to each other in the header : both move the whole
 * rule list in or out, and neither belongs to a single row of the table.
 */
export function ConfigTransfer({onImport, onExport, size = 19}: ConfigTransferProps) {
    return (
        <>
            <button
                type="button"
                onClick={onImport}
                title="Import rules from a file"
                aria-label="Import rules from a file"
                className={ICON_CLASS}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M8 10V1.5M8 10 5 7M8 10l3-3" />
                    <path d="M2 10.5v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
                </svg>
            </button>
            <button
                type="button"
                onClick={onExport}
                title="Export rules to a file"
                aria-label="Export rules to a file"
                className={ICON_CLASS}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M8 1.5V10M8 1.5 5 4.5M8 1.5l3 3" />
                    <path d="M2 10.5v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
                </svg>
            </button>
        </>
    );
}
