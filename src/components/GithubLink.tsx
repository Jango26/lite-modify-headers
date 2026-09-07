export const REPO_URL = 'https://github.com/Jango26/lite-modify-headers';

/**
 * Opens the repository in a new tab. Rendered as an anchor rather than a button
 * so middle-click and context-menu still behave like a normal link.
 */
export function GithubLink({size = 18}: {size?: number}) {
    return (
        <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
            className="flex flex-none items-center text-muted transition-colors hover:text-ink">
            <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.91-.88-2.91-2.77 0-.87.31-1.6.82-2.16-.05-.13-.36-.65.05-1.35 0 0 .68-.21 2.23.83a5.6 5.6 0 0 1 1.5-.2c.51 0 1.02.07 1.5.2 1.55-1.05 2.23-.83 2.23-.83.41.7.1 1.22.05 1.35.51.56.82 1.28.82 2.16 0 1.9-1.14 2.57-2.92 2.77.29.26.55.75.55 1.51 0 1.06-.01 1.92-.01 2.19 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
        </a>
    );
}
