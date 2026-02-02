import React from 'react';
import { Layers, Type, Eye, Lock } from 'lucide-react';

const LayersPanel = ({ slots, selectedIds, onSelect }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={12} />
                    Layers
                </h2>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">{slots.length}</span>
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
                                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-100'
                                    : 'border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'
                                }
                            `}
                        >
                            {/* Icon */}
                            <Type size={14} className={isSelected ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-500'} />

                            {/* Label */}
                            <span className="text-xs font-medium truncate flex-1 select-none">
                                {slot.label || `Text Slot ${slot.id}`}
                            </span>

                            {/* Actions (Hover) */}
                            <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <Lock size={10} className="hover:text-white cursor-pointer" />
                                <Eye size={10} className="hover:text-white cursor-pointer" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LayersPanel;
