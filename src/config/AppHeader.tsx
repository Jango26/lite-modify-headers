import {GithubLink} from '../components/GithubLink';
import {ThemeToggle} from '../components/ThemeToggle';
import {useTheme} from '../components/useTheme';

interface AppHeaderProps {
    started: boolean;
    onToggle: () => void;
}

export function AppHeader({started, onToggle}: AppHeaderProps) {
    const {theme, cycleTheme} = useTheme();
    return (
        <header className="gutter flex items-center justify-between py-5">
            <div className="flex items-center gap-3.5">
                <h1 className="m-0 text-[21px] font-bold tracking-[-0.2px]">Lite Modify Headers</h1>
                <GithubLink size={19} />
            </div>
            <div className="flex items-center gap-4">
                <ThemeToggle theme={theme} onCycle={cycleTheme} size={19} />
                <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-full py-1.5 pr-2 pl-3.5 transition-colors select-none ${
                        started ? 'bg-running-soft' : 'bg-surface'
                    }`}>
                    <span className={`text-sm font-semibold ${started ? 'text-running' : 'text-muted'}`}>
                        {started ? 'Running' : 'Paused'}
                    </span>
                    <input
                        type="checkbox"
                        title="Start / stop applying rules"
                        checked={started}
                        onChange={onToggle}
                        className="relative m-0 h-[26px] w-[48px] flex-none cursor-pointer appearance-none rounded-full bg-faint shadow-none transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[22px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-running checked:after:translate-x-[22px]"
                    />
                </label>
            </div>
        </header>
    );
}
