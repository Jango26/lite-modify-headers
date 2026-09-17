import {ConfigTransfer} from '../components/ConfigTransfer';
import {GithubLink} from '../components/GithubLink';
import {StartStopSwitch} from '../components/StartStopSwitch';
import {ThemeToggle} from '../components/ThemeToggle';
import {useTheme} from '../components/useTheme';

interface AppHeaderProps {
    started: boolean;
    onToggle: () => void;
    onImport: () => void;
    onExport: () => void;
}

export function AppHeader({started, onToggle, onImport, onExport}: AppHeaderProps) {
    const {theme, cycleTheme} = useTheme();
    return (
        <header className="gutter flex items-center justify-between py-5">
            <div className="flex items-center gap-3.5">
                <h1 className="m-0 text-[21px] font-bold tracking-[-0.2px]">Lite Modify Headers</h1>
                <GithubLink size={19} />
            </div>
            <div className="flex items-center gap-4">
                <ConfigTransfer onImport={onImport} onExport={onExport} size={19} />
                <ThemeToggle theme={theme} onCycle={cycleTheme} size={19} />
                <StartStopSwitch started={started} onToggle={onToggle} />
            </div>
        </header>
    );
}
