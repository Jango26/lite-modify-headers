/*
 * The start/stop control, shared by the two headers : the state it reports is
 * global, so a user who learns it in the popup has to find the same thing in
 * the configuration page.
 *
 * The label is inside the <label>, so the word is as clickable as the switch.
 * Its box is wide enough for the longer of the two words and the text is right
 * aligned : "Running" and "Paused" do not measure the same, and letting the
 * span shrink would shove whatever sits to its left on every toggle.
 *
 * The track itself stays neutral when off — the status bar underneath is what
 * colours the paused state, and two amber signals would be one too many.
 */
export function StartStopSwitch({started, onToggle}: {started: boolean; onToggle: () => void}) {
    return (
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <span className={`w-16 text-right text-sm font-semibold ${started ? 'text-running' : 'text-paused-ink'}`}>
                {started ? 'Running' : 'Paused'}
            </span>
            <input
                type="checkbox"
                title="Start / stop applying rules"
                checked={started}
                onChange={onToggle}
                className="relative m-0 h-[26px] w-[48px] flex-none cursor-pointer appearance-none rounded-full bg-border shadow-[inset_0_0_0_1px_var(--color-fainter)] transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-[22px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:content-[''] checked:bg-running checked:shadow-none checked:after:translate-x-[22px]"
            />
        </label>
    );
}
