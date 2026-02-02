import React, { useState, useEffect } from 'react';
import { generateBatch } from '../api';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Settings, Printer, RotateCw, Type, Crosshair } from 'lucide-react';
import clsx from 'clsx';

function Sidebar({ mode, setMode, slots, selectedIds = [], onUpdate, onSelect, isConnected, testName, setTestName, refreshPreview }) {
    const primaryId = selectedIds[0];
    const selectedSlot = slots.find(s => s.id === primaryId);
    const isMulti = selectedIds.length > 1;
    const [namesInput, setNamesInput] = useState("Gabriel Ferreira\nAna Silva\nCarlos Souza");
    const [isGenerating, setIsGenerating] = useState(false);

    // Sync first name from list to testName for preview
    useEffect(() => {
        if (mode === 'production') {
            const firstLine = namesInput.split('\n').find(n => n.trim().length > 0);
            if (firstLine && firstLine !== testName) {
                setTestName(firstLine);
            }
        }
    }, [namesInput, mode, testName, setTestName]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const names = namesInput.split('\n').filter(n => n.trim());
            const blob = await generateBatch(names, slots);

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'crachas_finalizados.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Erro ao gerar: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const move = (dx, dy) => {
        if (!selectedSlot) return;
        onUpdate(selectedId, { x: selectedSlot.x + dx, y: selectedSlot.y + dy });
    };

    return (
        <div className="flex flex-col h-full font-sans">
            {/* Header & Tabs */}
            <div className="p-4 bg-[#0d1117] border-b border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <h1 className="font-bold text-lg tracking-tight">Badge Generator <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 ml-1">PRO</span></h1>
                </div>

                <div className="flex bg-gray-800/50 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('calibration')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                            mode === 'calibration' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Settings size={14} /> Calibrar
                    </button>
                    <button
                        onClick={() => setMode('production')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                            mode === 'production' ? "bg-green-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Printer size={14} /> Produção
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                {/* === CALIBRATION MODE === */}
                {mode === 'calibration' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                        {/* Name Tester */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 flex items-center gap-1">
                                <Type size={10} /> Nome de Teste
                            </label>
                            <input
                                value={testName}
                                onChange={(e) => setTestName(e.target.value)}
                                className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ex: Gabriel Ferreira"
                            />
                        </div>

                        {/* Active Slot Card */}
                        {selectedSlot && (
                            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                                <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Crosshair size={14} className="text-blue-400" />
                                        <span className="font-bold text-sm text-gray-200">
                                            {isMulti ? `Multi-Select (${selectedIds.length})` : selectedSlot.label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                                        {isMulti ? 'MIXED' : `#${selectedSlot.id}`}
                                    </span>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Coords */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">POS X</label>
                                            <input
                                                type="number"
                                                value={selectedSlot.x}
                                                onChange={(e) => onUpdate(selectedSlot.id, { x: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-[#0d1117] border border-gray-700 rounded p-1.5 text-sm font-mono text-center focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">POS Y</label>
                                            <input
                                                type="number"
                                                value={selectedSlot.y}
                                                onChange={(e) => onUpdate(selectedSlot.id, { y: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-[#0d1117] border border-gray-700 rounded p-1.5 text-sm font-mono text-center focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Rotation */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] text-gray-500 font-bold flex items-center gap-1"><RotateCw size={10} /> ROTAÇÃO</label>
                                            <span className="text-xs text-blue-400 font-mono">{selectedSlot.rotation}°</span>
                                        </div>
                                        <input
                                            type="range" min="-180" max="180"
                                            value={selectedSlot.rotation}
                                            onChange={(e) => onUpdate(selectedSlot.id, { rotation: parseInt(e.target.value) })}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>

                                    {/* D-Pad */}
                                    <div className="bg-[#0d1117] rounded-lg p-2 border border-blue-900/20">
                                        <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                                            <div />
                                            <button onClick={() => selectedSlot && onUpdate(selectedSlot.id, { y: selectedSlot.y - 10 })} className="h-8 w-8 flex items-center justify-center bg-gray-800 rounded hover:bg-blue-600 transition-colors active:scale-95"><ArrowUp size={14} /></button>
                                            <div />
                                            <button onClick={() => selectedSlot && onUpdate(selectedSlot.id, { x: selectedSlot.x - 10 })} className="h-8 w-8 flex items-center justify-center bg-gray-800 rounded hover:bg-blue-600 transition-colors active:scale-95"><ArrowLeft size={14} /></button>
                                            <button onClick={() => selectedSlot && onUpdate(selectedSlot.id, { y: selectedSlot.y + 10 })} className="h-8 w-8 flex items-center justify-center bg-gray-800 rounded hover:bg-blue-600 transition-colors active:scale-95"><ArrowDown size={14} /></button>
                                            <button onClick={() => selectedSlot && onUpdate(selectedSlot.id, { x: selectedSlot.x + 10 })} className="h-8 w-8 flex items-center justify-center bg-gray-800 rounded hover:bg-blue-600 transition-colors active:scale-95"><ArrowRight size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Selection */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 block">
                                Seleção Rápida (Segure Ctrl para Múltiplos)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {slots.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={(e) => onSelect(s.id, e.ctrlKey || e.shiftKey)}
                                        className={clsx(
                                            "p-2 rounded text-xs text-left border transition-all relative group",
                                            selectedIds.includes(s.id)
                                                ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-md'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                        )}
                                    >
                                        {s.label}
                                        {selectedIds.includes(s.id) && (
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* === PRODUCTION MODE === */}
                {mode === 'production' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-4">
                            <button
                                onClick={refreshPreview}
                                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded border border-gray-600 transition-colors"
                            >
                                🔄 Atualizar Preview Real
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                Visualiza a imagem exata gerada pelo Python.
                            </p>
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Lista de Nomes</label>
                            <div className="relative flex-1">
                                <textarea
                                    value={namesInput}
                                    onChange={(e) => setNamesInput(e.target.value)}
                                    className="absolute inset-0 w-full h-full bg-[#0d1117] border border-gray-700 rounded-md p-3 text-sm focus:border-green-500 outline-none resize-none font-mono leading-relaxed"
                                    placeholder="Cole os nomes aqui..."
                                />
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={clsx(
                                        "w-full py-4 rounded-lg font-bold text-center flex items-center justify-center gap-2 shadow-xl transition-all",
                                        isGenerating
                                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                            : 'bg-green-600 hover:bg-green-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                                    )}
                                >
                                    {isGenerating ? (
                                        <span className="animate-pulse">Gerando PDFs...</span>
                                    ) : (
                                        <><Save size={20} /> GERAR LOTE ZIP</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Sidebar;
