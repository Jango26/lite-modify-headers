import {Download, Upload} from 'lucide-react';

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
export function ConfigTransfer({onImport, onExport, size = 18}: ConfigTransferProps) {
    return (
        <>
            <button
                type="button"
                onClick={onImport}
                title="Import rules from a file"
                aria-label="Import rules from a file"
                className={ICON_CLASS}>
                <Download size={size} aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={onExport}
                title="Export rules to a file"
                aria-label="Export rules to a file"
                className={ICON_CLASS}>
                <Upload size={size} aria-hidden="true" />
            </button>
        </>
    );
}
