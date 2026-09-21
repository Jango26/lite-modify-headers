import type {LucideIcon} from 'lucide-react';
import {Monitor, Moon, Sun} from 'lucide-react';
import type {ThemePreference} from '../lib/theme';

/*
 * Cycles system → light → dark. The icon shows the current preference, not the
 * resolved theme : while following the system, a sun would be a lie half the
 * time, so 'system' gets its own monitor icon.
 */
const ICONS: Record<ThemePreference, {Icon: LucideIcon; title: string}> = {
    system: {
        Icon: Monitor,
        title: 'Theme : follow system (click to switch)'
    },
    light: {
        Icon: Sun,
        title: 'Theme : light (click to switch)'
    },
    dark: {
        Icon: Moon,
        title: 'Theme : dark (click to switch)'
    }
};

interface ThemeToggleProps {
    theme: ThemePreference;
    onCycle: () => void;
    size?: number;
}

export function ThemeToggle({theme, onCycle, size = 18}: ThemeToggleProps) {
    const {Icon, title} = ICONS[theme];
    return (
        <button
            type="button"
            onClick={onCycle}
            title={title}
            aria-label={title}
            className="flex flex-none cursor-pointer items-center border-none bg-transparent p-0 text-muted transition-colors hover:text-ink">
            <Icon size={size} aria-hidden="true" />
        </button>
    );
}
