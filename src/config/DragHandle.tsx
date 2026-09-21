import type {DraggableAttributes} from '@dnd-kit/core';
import type {SyntheticListenerMap} from '@dnd-kit/core/dist/hooks/utilities';
import {GripVertical} from 'lucide-react';

interface DragHandleProps {
    listeners?: SyntheticListenerMap;
    attributes?: DraggableAttributes;
    setNodeRef?: (el: HTMLElement | null) => void;
    className?: string;
}

/*
 * A grip handle that carries the dnd-kit listeners, so only this icon starts
 * a drag — putting listeners on the whole row would make text inputs and
 * selects ungrabbable and steal clicks from the toggle.
 */
export function DragHandle({listeners, attributes, setNodeRef, className}: DragHandleProps) {
    return (
        <button
            ref={setNodeRef as React.Ref<HTMLButtonElement>}
            type="button"
            title="Drag to reorder"
            className={`flex flex-none cursor-grab items-center justify-center text-faint hover:text-muted active:cursor-grabbing ${className ?? ''}`}
            {...attributes}
            {...listeners}>
            <GripVertical size={16} aria-hidden="true" />
        </button>
    );
}
