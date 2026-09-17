/*
 * Browser side of the import / export feature. Kept out of config.ts, which
 * stays free of any DOM access so it can run under Vitest.
 *
 * The download goes through an object URL rather than chrome.downloads : the
 * extension would need one more permission for something an anchor already
 * does.
 */

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function downloadJson(contents: string, prefix: string): void {
    const url = URL.createObjectURL(new Blob([contents], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/*
 * Opens the file picker and resolves with the contents of the chosen file, or
 * null when the user cancels. The input never enters the document : it is only
 * a handle on the picker.
 */
export function pickTextFile(accept: string): Promise<string | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            resolve(file ? await file.text() : null);
        });
        input.addEventListener('cancel', () => resolve(null));
        input.click();
    });
}
