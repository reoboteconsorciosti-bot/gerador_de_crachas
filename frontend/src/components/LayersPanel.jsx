import React from 'react';
import { Layers, Type, Eye, Lock } from 'lucide-react';

const LayersPanel = ({ slots, selectedIds, onSelect }) => {
    return (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={12} />
                    Camadas
                </h2>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700 font-mono">{slots.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {slots.map((slot) => {
                    const isSelected = selectedIds.includes(slot.id);
                    return (
                        <div
                            key={slot.id}
                            onClick={(e) => onSelect(slot.id, e.ctrlKey || e.shiftKey)}
                            className={`
                                group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all border
                                ${isSelected
                                    ? 'bg-blue-900/10 border-blue-500/30 text-blue-400'
                                    : 'border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }
                            `}
                        >
                            {/* Icon */}
                            <Type size={14} className={isSelected ? 'text-blue-500' : 'text-zinc-600 group-hover:text-zinc-500'} />

                            {/* Label */}
                            <span className="text-xs font-medium truncate flex-1 select-none">
                                {slot.label || `Slot de Texto ${slot.id}`}
                            </span>

                            {/* Actions (Hover) */}
                            <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <Lock size={12} className="hover:text-zinc-200 cursor-pointer text-zinc-500" />
                                <Eye size={12} className="hover:text-zinc-200 cursor-pointer text-zinc-500" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LayersPanel;
