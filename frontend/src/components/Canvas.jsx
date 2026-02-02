import React, { useRef, useState, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
// Import new icons for the toolbar
import { RotateCw, ArrowLeftRight, AlertCircle, Move, Minus, Plus, Trash2, Maximize, Type } from 'lucide-react';

// A4 Dimensions (Backend)
const REAL_W = 2480;
const REAL_H = 3508;

const FloatingToolbar = ({ slot, onUpdate, onDelete }) => {

    // Action Button Component
    const ActionBtn = ({ icon: Icon, onClick, title, color = "text-gray-300 hover:text-white" }) => (
        <button
            onClick={onClick}
            className={`
                w-9 h-9 flex items-center justify-center rounded-full
                hover:bg-gray-700 transition-colors
                active:scale-95 active:bg-gray-600
                ${color}
            `}
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    const updateFont = (delta) => {
        const current = slot.max_font_size || 160;
        onUpdate(slot.id, { max_font_size: Math.max(20, current + delta) });
    };

    const updateRotation = (e) => {
        const current = slot.rotation || 0;
        const step = e.shiftKey ? 15 : 90;
        onUpdate(slot.id, { rotation: (current + step) % 360 });
    };

    return (
        <div
            className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/95 border border-gray-700 shadow-2xl rounded-full p-1 z-[100] animate-in zoom-in-95 slide-in-from-bottom-2 fade-in duration-150"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Font Control Group */}
            <div className="flex items-center gap-0.5" title="Font Size">
                <ActionBtn
                    icon={Minus}
                    onClick={() => updateFont(-10)}
                    title="Shrink Text (-10px)"
                />

                {/* Visual Anchor for Font Group */}
                <div className="w-8 flex justify-center opacity-30 pointer-events-none">
                    <Type size={14} />
                </div>

                <ActionBtn
                    icon={Plus}
                    onClick={() => updateFont(10)}
                    title="Enlarge Text (+10px)"
                />
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-700 mx-1" />

            {/* Rotation Control */}
            <ActionBtn
                icon={RotateCw}
                onClick={updateRotation}
                title="Rotate +90° (Shift + Click for +15°)"
            />

            {/* Divider */}
            <div className="w-px h-4 bg-gray-700 mx-1" />

            {/* Delete Control */}
            <ActionBtn
                icon={Trash2}
                onClick={() => onDelete([slot.id])}
                title="Remove Element"
                color="text-red-400 hover:bg-red-900/30 hover:text-red-200"
            />
        </div>
    );
};

const DraggableSlot = ({ slot, isSelected, scale, onSelect, onUpdate, onDelete, showGhost, isInteractable }) => {
    const nodeRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [localText, setLocalText] = useState(slot.content || 'Nome Sobrenome');
    const [outOfBounds, setOutOfBounds] = useState(false);

    // Sync local text with slot content
    useEffect(() => setLocalText(slot.content || 'Nome Sobrenome'), [slot.content]);

    // Check bounds on slot update
    useEffect(() => {
        const isOut = slot.x < 0 || slot.x > REAL_W || slot.y < 0 || slot.y > REAL_H;
        setOutOfBounds(isOut);
    }, [slot.x, slot.y]);

    const screenX = slot.x * scale;
    const screenY = slot.y * scale;

    // Calculate font size EXACTLY matching backend (no scaling adjustment)
    const fontSize = (slot.max_font_size || 120) * scale;

    // Corner Resize Handler (Canva Style)
    const handleCornerResize = (corner) => (e) => {
        if (!isInteractable) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const initialFontSize = slot.max_font_size || 160;
        const centerX = screenX;
        const centerY = screenY;

        // Calculate initial distance from center to mouse
        const initialDist = Math.sqrt(
            Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2)
        );

        const onMouseMove = (me) => {
            const currentDist = Math.sqrt(
                Math.pow(me.clientX - centerX, 2) + Math.pow(me.clientY - centerY, 2)
            );

            const scaleFactor = currentDist / initialDist;
            const newFontSize = Math.max(20, Math.min(300, initialFontSize * scaleFactor));

            onUpdate(slot.id, { max_font_size: Math.round(newFontSize) });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Rotation Handler (Canva Style)
    const handleRotationStart = (e) => {
        if (!isInteractable) return;
        e.preventDefault();
        e.stopPropagation();

        const centerX = screenX;
        const centerY = screenY;

        const onMouseMove = (me) => {
            const dx = me.clientX - centerX;
            const dy = me.clientY - centerY;

            // Calculate angle in degrees (0-360)
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            angle = (angle + 90 + 360) % 360; // Offset and normalize

            onUpdate(slot.id, { rotation: Math.round(angle) });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const finishEditing = () => {
        setIsEditing(false);
        if (localText !== slot.content) {
            onUpdate(slot.id, { content: localText });
        }
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: screenX, y: screenY }}
            onStart={(e) => {
                setIsDragging(true);
                onSelect(slot.id, e.ctrlKey || e.shiftKey);
            }}
            onStop={(e, data) => {
                setIsDragging(false);
                const newRealX = Math.round(data.x / scale);
                const newRealY = Math.round(data.y / scale);
                onUpdate(slot.id, { x: newRealX, y: newRealY });
            }}
            disabled={isEditing || !isInteractable}
        >
            <div
                ref={nodeRef}
                className={`absolute ${isSelected ? 'z-50' : 'z-10'}`}
                style={{ pointerEvents: 'auto' }}
            >
                {/* TransformBox - Bounding Box + Handles */}
                {isSelected && !isEditing && isInteractable && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
                            width: `${(slot.max_w || 1000) * scale}px`,
                            height: `${(slot.max_h || 200) * scale}px`,
                        }}
                    >
                        {/* Bounding Box */}
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-sm" />

                        {/* Corner Handles */}
                        <div
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nwse-resize pointer-events-auto shadow-md hover:scale-125 transition-transform"
                            onMouseDown={handleCornerResize('nw')}
                            title="Resize"
                        />
                        <div
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nesw-resize pointer-events-auto shadow-md hover:scale-125 transition-transform"
                            onMouseDown={handleCornerResize('ne')}
                            title="Resize"
                        />
                        <div
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nesw-resize pointer-events-auto shadow-md hover:scale-125 transition-transform"
                            onMouseDown={handleCornerResize('sw')}
                            title="Resize"
                        />
                        <div
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nwse-resize pointer-events-auto shadow-md hover:scale-125 transition-transform"
                            onMouseDown={handleCornerResize('se')}
                            title="Resize"
                        />

                        {/* Rotation Handle (Top) */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                            {/* Connection Line */}
                            <div className="w-0.5 h-8 bg-blue-500" />
                            {/* Handle */}
                            <div
                                className="w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-grab active:cursor-grabbing shadow-md hover:scale-125 transition-transform"
                                onMouseDown={handleRotationStart}
                                title="Rotate"
                            />
                        </div>
                    </div>
                )}

                {/* Visual Container */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                    }}
                    className={`
                        flex items-center justify-center group cursor-pointer transition-all duration-200 rounded-lg
                        ${outOfBounds ? 'ring-2 ring-red-500 bg-red-500/10' : ''}
                        ${showGhost && !isEditing
                            ? (isSelected
                                ? 'bg-blue-500/5'
                                : 'hover:border hover:border-dashed hover:border-blue-400/50 hover:bg-white/5 border border-transparent')
                            : ''
                        }
                        ${!showGhost && !isEditing && 'relative'}
                    `}
                    style={{
                        transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
                        width: `${(slot.max_w || 1000) * scale}px`,
                        height: `${(slot.max_h || 200) * scale}px`,
                    }}
                    title={outOfBounds ? "Warning: Element Out of Bounds!" : "Drag to move • Double click to edit"}
                >
                    {/* === FLOATING TOOLBAR === */}
                    {isSelected && !isEditing && !isDragging && (
                        <FloatingToolbar slot={slot} onUpdate={onUpdate} onDelete={onDelete} />
                    )}

                    {/* === TEXT RENDER (CSR - Always Visible) === */}
                    <span
                        className="drop-shadow-sm pointer-events-none select-none font-bold whitespace-nowrap flex items-center justify-center w-full h-full leading-none"
                        style={{ fontSize: `${fontSize}px`, color: 'rgb(55, 55, 55)' }}
                    >
                        {slot.content || 'Nome Sobrenome'}
                    </span>

                    {/* === CALIBRATION OVERLAYS (Design Mode Only) === */}
                    {isInteractable && !isEditing && (
                        <>
                            {/* Center Dot */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border shadow-sm transition-all duration-300 z-20
                               ${isSelected ? 'bg-blue-500 border-white scale-125' : 'bg-red-500/80 border-white/50 hover:bg-red-500'}`}
                            />
                        </>
                    )}

                    {/* Coordinates Tooltip (Active) */}
                    {isSelected && (isDragging || isEditing) && (
                        <div className="absolute -top-8 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono shadow-lg whitespace-nowrap z-[70] flex items-center gap-2">
                            <Move size={10} /> X:{Math.round(slot.x)} Y:{Math.round(slot.y)}
                        </div>
                    )}

                    {/* === EDITING INPUT === */}
                    {isEditing && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                            <textarea
                                value={localText}
                                onChange={(e) => setLocalText(e.target.value)}
                                onBlur={finishEditing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        finishEditing();
                                    }
                                    if (e.key === 'Escape') {
                                        setLocalText(slot.content || 'Nome Sobrenome');
                                        setIsEditing(false);
                                    }
                                }}
                                autoFocus
                                className="text-center font-bold bg-white/95 text-blue-900 border-2 border-blue-500 rounded-xl shadow-2xl outline-none px-6 py-3 resize-none overflow-hidden"
                                style={{ fontSize: `${fontSize * 0.8}px`, width: '300px', minHeight: '60px', lineHeight: '1.2' }}
                                placeholder="Digite o nome..."
                            />
                            <div className="text-[10px] font-mono font-bold text-white bg-black/80 backdrop-blur px-3 py-1 rounded-full shadow-lg pointer-events-none whitespace-nowrap border border-white/10">
                                ENTER to Save
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Draggable >
    );
};

function Canvas({ elements = [], selectedIds = [], onUpdate, onSelect, onDelete, testName, setTestName, mode, previewImage }) {
    const [currentScale, setCurrentScale] = useState(0.2); // Start small safer
    const containerRef = useRef(null);
    const [imgError, setImgError] = useState(false);

    // Keyboard Navigation (Precision Mode)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedIds.length === 0 || mode !== 'calibration') return;

            // Only handle arrow keys
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

            e.preventDefault(); // Prevent scroll

            const step = e.shiftKey ? 10 : 1; // Shift for big steps
            const id = selectedIds[0];
            const element = elements.find(el => el.id === id);

            if (!element) return;

            let { x, y } = element;

            if (e.key === 'ArrowUp') y -= step;
            if (e.key === 'ArrowDown') y += step;
            if (e.key === 'ArrowLeft') x -= step;
            if (e.key === 'ArrowRight') x += step;

            onUpdate(id, { x, y });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, elements, onUpdate, mode]);

    // FIT TO SCREEN Logic (Existing)
    useEffect(() => {
        if (!containerRef.current) return;

        const updateScale = () => {
            const w = containerRef.current.offsetWidth;
            const h = containerRef.current.offsetHeight;

            if (w > 0 && h > 0) {
                // Determine scale based on both width and height to ensure full visibility
                const scaleX = w / REAL_W;
                const scaleY = h / REAL_H;
                const bestScale = Math.min(scaleX, scaleY) * 0.95; // 0.95 for safety margin
                setCurrentScale(bestScale);
            }
        };

        // Initial call
        updateScale();

        // Listen for re-sizes
        const observer = new ResizeObserver(updateScale);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const bgSrc = useMemo(() => {
        if (imgError) return "/template.png";
        // CSR Mode: We strictly use the static template. 
        // If we ever want real backend previews again, we'd add that back, but for now:
        return "/template.png";
    }, [imgError]);

    // CSR Mode: Never loading, always instant.
    const isLoading = false;

    // Use flexbox for perfect centering
    return (
        <div className="flex items-center justify-center w-full h-full p-8 animate-in fade-in duration-500 bg-[#020617] overflow-hidden">
            {/* Header Info - Floating absolute to avoid shifting layout */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-none">
                <div className="px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur border border-white/5 text-slate-300 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 shadow-lg">
                    {mode === 'calibration' ? "📐 Modo Interativo" : "👁️ Modo Preview"}
                    <span className={`w-1.5 h-1.5 rounded-full ${mode === 'calibration' ? 'bg-blue-500' : 'bg-green-500'} shadow-[0_0_8px_currentColor]`} />
                </div>
                <div className="text-[10px] text-slate-500 font-mono bg-black/40 px-2 py-1 rounded">
                    Scale: {currentScale.toFixed(4)}x
                </div>
            </div>

            {/* A4 Container */}
            <div
                ref={containerRef}
                className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-800 bg-white rounded-sm overflow-hidden ring-1 ring-white/5 transition-all duration-500"
                style={{
                    height: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    aspectRatio: `${REAL_W} / ${REAL_H}`,
                }}
                onClick={() => onSelect(-1, false)}
            >
                {/* Background Layer */}
                <img
                    src={bgSrc}
                    alt="Canvas Background"
                    onError={() => setImgError(true)}
                    className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-all duration-700 ease-out
                        ${mode === 'production' ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98] blur-[1px]'}
                    `}
                />

                {/* Draggable Layer - ALWAYS RENDERED (CSR) */}
                {/* In Production Mode, we just disable the drag UI via the 'showGhost' prop or distinct styling */}
                {!isLoading && Array.isArray(elements) && elements.map((element) => (
                    <DraggableSlot
                        key={element.id}
                        slot={element}
                        isSelected={mode === 'calibration' && selectedIds.includes(element.id)}
                        scale={currentScale}
                        onSelect={onSelect}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        showGhost={mode === 'production'}
                        isInteractable={mode === 'calibration'}
                    />
                ))}

                {/* Empty State */}
                {!isLoading && (!elements || elements.length === 0) && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                        <div className="flex flex-col items-center text-slate-400 gap-2">
                            <AlertCircle size={32} className="text-slate-300" />
                            <span className="font-mono text-xs">No elements active</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Canvas;
