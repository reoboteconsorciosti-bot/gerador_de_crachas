import React from 'react';
import { AlignCenter, AlignLeft, AlignRight, Type, Move, RotateCw, Trash2, ArrowUpRight, Maximize } from 'lucide-react';

const InspectorPanel = ({ selectedSlots, onUpdate, onDelete }) => {
    if (!selectedSlots || selectedSlots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-4 shadow-inner">
                    <Move size={24} className="opacity-50" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400 mb-1">Nenhuma Seleção</h3>
                <p className="text-[10px] text-slate-600 max-w-[150px]">Selecione um elemento para editar</p>
            </div>
        );
    }

    const slot = selectedSlots[0]; // Edits primary selection for now
    const isMulti = selectedSlots.length > 1;

    const InputRow = ({ label, value, onChange, icon: Icon, unit, step = 1, min }) => (
        <div className="flex items-center gap-3 mb-3 group">
            <div className="w-24 text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                {Icon && <Icon size={12} />}
                {label}
            </div>
            <div className="relative flex-1">
                <input
                    type="number"
                    value={value || 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    step={step}
                    min={min}
                    className="w-full bg-[#020617] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-right transition-all duration-200 hover:border-white/20"
                />
                {unit && (
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-mono pointer-events-none">{unit}</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-5 flex flex-col h-full overflow-y-auto bg-[#0f172a]/95 backdrop-blur-3xl animate-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="pb-5 border-b border-white/10 mb-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
                        {isMulti ? 'Multi-Edição' : slot.label || 'Propriedades'}
                    </h2>
                    {!isMulti && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-500 font-mono">ID: {slot.id}</span>}
                </div>
                {isMulti && <p className="text-[10px] text-slate-500 pl-4">{selectedSlots.length} itens selecionados</p>}
            </div>

            {/* Transform Properties */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <ArrowUpRight size={12} className="text-blue-400" />
                    <h3 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Transformação</h3>
                </div>

                <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/5 mb-2">
                    <InputRow label="Posição X" value={slot.x} onChange={(v) => onUpdate(slot.id, { x: v })} icon={Move} step={10} />
                    <InputRow label="Posição Y" value={slot.y} onChange={(v) => onUpdate(slot.id, { y: v })} step={10} />
                </div>

                <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/5">
                    <InputRow label="Largura Máx" value={slot.max_w} onChange={(v) => onUpdate(slot.id, { max_w: v })} icon={Maximize} step={10} />
                </div>
            </div>

            {/* Actions (Advanced) - Kept hidden or minimal if needed, but removing Delete as requested */}
            <div className="mt-auto pt-6 border-t border-white/10 opacity-50 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-center text-slate-600">
                    Use the floating toolbar for common actions.
                </p>
            </div>
        </div>
    );
};

export default InspectorPanel;
