interface StatusBarProps {
    started: boolean;
    registeredCount: number;
}

export function StatusBar({started, registeredCount}: StatusBarProps) {
    const plural = registeredCount === 1 ? 'rule' : 'rules';

    return (
        <div
            className={`gutter flex items-center gap-2 border-y border-border py-[11px] font-mono text-[13px] text-muted transition-colors ${
                started ? 'bg-running-soft' : 'bg-paused-soft'
            }`}>
            <span className={`size-2 flex-none rounded-full ${started ? 'bg-running' : 'bg-paused-ink'}`} />
            <span className={started ? 'text-running' : 'text-paused-ink'}>{started ? 'Running' : 'Paused'}</span>
            <span className="text-fainter">·</span>
            <span>
                {registeredCount} dynamic {plural} registered
            </span>
        </div>
    );
}
