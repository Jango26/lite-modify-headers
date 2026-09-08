import type {ThemePreference} from '../lib/theme';

/*
 * Cycles system → light → dark. The icon shows the current preference, not the
 * resolved theme : while following the system, a sun would be a lie half the
 * time, so 'system' gets its own half filled circle.
 */
const ICONS: Record<ThemePreference, {path: string; title: string}> = {
    system: {
        path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.6v10.8a5.4 5.4 0 0 1 0-10.8Z',
        title: 'Theme : follow system (click to switch)'
    },
    light: {
        path: 'M8 4.6A3.4 3.4 0 1 0 8 11.4 3.4 3.4 0 0 0 8 4.6Zm0-4a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0V1.4A.8.8 0 0 1 8 .6Zm0 12.8a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0v-1.4a.8.8 0 0 1 .8-.8ZM.6 8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6H1.4A.8.8 0 0 1 .6 8Zm12.8 0a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6h-1.4a.8.8 0 0 1-.8-.8ZM2.7 2.7a.8.8 0 0 1 1.14 0l1 1a.8.8 0 0 1-1.14 1.13l-1-1a.8.8 0 0 1 0-1.13Zm8.46 8.46a.8.8 0 0 1 1.13 0l1 1a.8.8 0 0 1-1.13 1.14l-1-1a.8.8 0 0 1 0-1.14Zm2.13-8.46a.8.8 0 0 1 0 1.13l-1 1a.8.8 0 0 1-1.13-1.13l1-1a.8.8 0 0 1 1.13 0ZM4.84 11.16a.8.8 0 0 1 0 1.14l-1 1a.8.8 0 0 1-1.14-1.14l1-1a.8.8 0 0 1 1.14 0Z',
        title: 'Theme : light (click to switch)'
    },
    dark: {
        path: 'M6.2 1.4a6.6 6.6 0 1 0 8.4 8.4 5.4 5.4 0 0 1-8.4-8.4Z',
        title: 'Theme : dark (click to switch)'
    }
};

interface ThemeToggleProps {
    theme: ThemePreference;
    onCycle: () => void;
    size?: number;
}

export function ThemeToggle({theme, onCycle, size = 18}: ThemeToggleProps) {
    const {path, title} = ICONS[theme];
    return (
        <button
            type="button"
            onClick={onCycle}
            title={title}
            aria-label={title}
            className="flex flex-none cursor-pointer items-center border-none bg-transparent p-0 text-muted transition-colors hover:text-ink">
            <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d={path} />
            </svg>
        </button>
    );
}
