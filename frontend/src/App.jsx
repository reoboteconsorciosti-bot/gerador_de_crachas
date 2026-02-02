import { useState, useEffect } from 'react';
import { Eye, Edit3, Save, Download, LayoutTemplate, Undo2, Redo2, Wifi, WifiOff, RefreshCcw, FileText, Sparkles } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import Canvas from './components/Canvas';
import Layout from './components/Layout';
import InspectorPanel from './components/InspectorPanel';
import LayersPanel from './components/LayersPanel';
import { EditorProvider, useEditor } from './context/EditorContext';
import { checkHealth, generateBatch } from './api';



function AppContent() {
  const {
    elements, selectedIds, updateElement, selectElement, addElement, deleteElements,
    mode, setMode,
    undo, redo, past, future,
    saveLayout, resetLayout
  } = useEditor();

  const [isConnected, setIsConnected] = useState(false);
  const [nameList, setNameList] = useState(''); // Batch name input
  const [isGenerating, setIsGenerating] = useState(false); // Export loading state

  const handleReset = () => {
    if (confirm("Resetar layout para configurações padrão? Isso apagará suas edições salvas.")) {
      resetLayout();
      toast.info("Layout resetado para o padrão.");
    }
  };

  const handleSave = () => {
    const success = saveLayout();
    if (success) {
      toast.success("Projeto Salvo!", {
        description: "Suas definições foram salvas permanentemente."
      });
    } else {
      toast.error("Erro ao salvar projeto.");
    }
  };

  useEffect(() => {
    checkHealth()
      .then(res => setIsConnected(!!res))
      .catch(() => setIsConnected(false));
  }, []);

  // Sync Preview with Name List
  // Priority: List > Manual. If list has content, it overwrites the preview.
  useEffect(() => {
    if (!nameList.trim()) return;

    const names = nameList.split('\n').filter(n => n.trim());
    const name1 = names[0];
    const name2 = names[1];

    // If we have at least one name, update Top Slots (0 and 2)
    if (name1 && elements.length > 2) {
      // Only update if content is different to avoid infinite loops/unnecessary renders
      if (elements[0].content !== name1) updateElement(elements[0].id, { content: name1 });
      if (elements[2].content !== name1) updateElement(elements[2].id, { content: name1 });
    }

    // If we have a second name, update Bottom Slots (1 and 3)
    // If we don't have a second name but have a first, maybe clear bottom?
    // User didn't strictly ask to clear, but "showing names from list" implies consistency.
    // However, to be safe and avoided unwanted clearing of manual edits if list is just 1 name,
    // we only update if name2 exists.
    if (name2 && elements.length > 3) {
      if (elements[1].content !== name2) updateElement(elements[1].id, { content: name2 });
      if (elements[3].content !== name2) updateElement(elements[3].id, { content: name2 });
    }
  }, [nameList, elements, updateElement]);

  // Removed legacy 'refreshPreview' logic. 
  // We now use Client-Side Rendering (CSR) for instant feedback.
  // Backend is only called during 'handleExport'.

  // Note: 'previewImage' state and 'getPreview' import can be cleaned up later if unused 
  // but we might want them for the final Export loading state.
  // For now, removing the auto-fetch loop.

  const handleExport = async () => {
    let toastId = null; // Defined at function scope to be accessible in catch block

    // Top-level try-catch to ensure user always gets feedback
    try {
      const rawNameList = nameList || ""; // Safety check
      const names = rawNameList
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      // Calculate PDFs (2 names per PDF)
      setIsGenerating(true);

      // Determine names to export
      let namesToExport = [];

      if (rawNameList.trim()) {
        // Option A: Use the list provided in the text area
        namesToExport = names;
      } else {
        // Option B: Manual Design Mode (Name list empty)
        // Extract names from the current elements (TopLeft=0, BottomLeft=1)
        // Safety check for elements
        if (!elements || elements.length < 2) {
          alert("Error: Elements not loaded correctly.");
          setIsGenerating(false);
          return;
        }

        const topName = elements[0]?.content || "";
        const bottomName = elements[1]?.content || "";

        // If both are default placeholders and list is empty, warn user
        const isDefault = (name) => !name || name === "Nome Sobrenome";

        if (isDefault(topName) && isDefault(bottomName)) {
          alert("Please add at least one name (either in the list or by editing the badge manually)");
          setIsGenerating(false);
          return;
        }

        namesToExport = [topName, bottomName].filter(n => n && n.trim());
      }

      if (namesToExport.length === 0) {
        alert("No valid names found to export");
        setIsGenerating(false);
        return;
      }

      // Calculate PDFs (2 names per PDF)
      const pdfCount = Math.ceil(namesToExport.length / 2);
      const estimatedSeconds = Math.max(5, pdfCount * 2.5);
      const estimatedTime = estimatedSeconds > 10
        ? `~${Math.round(estimatedSeconds)}s`
        : 'a few seconds';

      toastId = toast.loading("Generating PDFs...", {
        description: `Processing ${namesToExport.length} name${namesToExport.length > 1 ? 's' : ''} → ${pdfCount} PDF${pdfCount > 1 ? 's' : ''}. ETA: ${estimatedTime}`
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        // Race between fetch and timeout
        const blob = await Promise.race([
          generateBatch(namesToExport, elements.map(el => ({
            ...el,
            fontSize: el.max_font_size || el.fontSize || 120  // Ensure fontSize is passed (default 120)
          }))),
          new Promise((_, reject) => {
            // This promise triggers if the timeout happens first
            setTimeout(() => reject(new Error('Timeout')), 30000)
          })
        ]);

        // Create download link
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        // Determine filename based on count
        const filename = namesToExport.length <= 2
          ? `crachas_${namesToExport.join('-').replace(/\s+/g, '_')}.pdf`
          : 'crachas_finalizados.zip';

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);

        // Cleanup
        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        toast.success("Download Ready!", {
          id: toastId,
          description: `${namesToExport.length} badge${namesToExport.length > 1 ? 's' : ''} generated successfully!`
        });
      } catch (innerError) {
        console.error("Fetch failed", innerError);
        throw innerError; // Re-throw to handle in outer catch
      }

    } catch (e) {
      console.error("Export failed", e);
      setIsGenerating(false);

      const errorMsg = e.message === 'Request timeout'
        ? "Request took too long. Try reducing the number of badges."
        : e.response?.status === 500
          ? "Backend processing error. Check console logs."
          : "Backend refused connection. Is the server running?";

      if (toastId) {
        toast.error("Export Failed", {
          id: toastId,
          description: errorMsg
        });
      } else {
        toast.error(`Export Failed: ${errorMsg}`);
      }
    }
  };

  return (
    <>
      <Toaster theme="dark" position="top-center" richColors />

      <Layout
        toolbar={
          <div className="flex items-center w-full justify-between">
            {/* Left: Branding & History */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-bold text-sm tracking-widest uppercase text-slate-200">
                <LayoutTemplate className="text-blue-500" size={18} />
                <span>Gerador de <span className="text-blue-500">Crachás</span></span>
                <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-blue-400 font-mono ml-2 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <var>v1.0</var></span>
              </div>

              {/* History Controls */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5 ml-4">
                <button
                  onClick={() => { undo(); toast.info("Undo"); }}
                  disabled={past.length === 0}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  onClick={() => { redo(); toast.info("Redo"); }}
                  disabled={future.length === 0}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={14} />
                </button>
              </div>
            </div>

            {/* Center: Mode Toggle */}
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 relative shadow-inner">
              <button
                onClick={() => setMode('names')}
                className={`px-4 py-1.5 rounded flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${mode === 'names' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={14} /> Nomes
              </button>
              <button
                onClick={() => setMode('calibration')}
                className={`px-4 py-1.5 rounded flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${mode === 'calibration' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Edit3 size={14} /> Design
              </button>
              <button
                onClick={() => setMode('production')}
                className={`px-4 py-1.5 rounded flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${mode === 'production' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Eye size={14} /> Visualizar
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Backend Status Indicator */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-500 ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                title={isConnected ? "Backend Conectado (Pronto)" : "Backend Desconectado"}
              >
                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="text-[9px] font-bold uppercase tracking-widest hidden xl:inline">{isConnected ? "Online" : "Offline"}</span>
              </div>



              <div className="w-px h-6 bg-white/10 mx-1" />

              <button className="btn-icon" title="Salvar Projeto" onClick={handleSave}>
                <Save size={18} />
              </button>

              <button className="btn-icon" title="Resetar Layout" onClick={handleReset}>
                <RefreshCcw size={18} className="text-red-400 hover:text-red-300" />
              </button>

              <button
                onClick={handleExport}
                className="btn-primary flex items-center gap-2 shadow-blue-900/20 hover:shadow-blue-600/30 ring-1 ring-white/10" title="Exportar PDF"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>
            </div>
          </div>
        }
        leftPanel={
          <LayersPanel slots={elements} selectedIds={selectedIds} onSelect={selectElement} />
        }
        rightPanel={
          <InspectorPanel
            selectedSlots={elements.filter(s => selectedIds.includes(s.id))}
            onUpdate={updateElement}
            onDelete={deleteElements}
          />
        }
      >
        {/*
            WRAPPER: Explicitly fill parent (Layout main area) and handle overflow
            This ensures Canvas has a defined H and W to calculate scaling against.
        */}
        <div className="w-full h-full overflow-hidden flex flex-col relative bg-[#020617]">
          {mode === 'names' ? (
            /* NAMES PAGE - Dedicated name input interface */
            <div className="flex items-center justify-center h-full p-4 md:p-8 overflow-y-auto align-top sm:align-middle">
              <div className="max-w-2xl w-full space-y-4 md:space-y-6 animate-in fade-in duration-500 my-auto">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-4">
                    <Sparkles className="text-purple-400" size={24} />
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Gerador de Crachás</h1>
                  </div>
                  <p className="text-slate-400 text-xs md:text-sm">
                    Adicione os nomes linha por linha para gerar os crachás
                  </p>
                </div>

                {/* Main Input Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 shadow-2xl">
                  <textarea
                    value={nameList}
                    onChange={(e) => setNameList(e.target.value)}
                    placeholder={"João Silva\nMaria Santos\nPedro Costa\n...\n(Adicione mais nomes)"}
                    className="w-full h-64 md:h-96 bg-[#020617] border border-white/20 rounded-xl text-sm md:text-base text-white placeholder-slate-600 px-4 py-3 md:px-6 md:py-4 resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none font-mono leading-relaxed transition-all"
                  />

                  {/* Counter & Stats */}
                  {nameList.trim() ? (
                    <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg gap-3 sm:gap-0">
                      <div className="flex gap-4 md:gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                          <span className="text-xs md:text-sm text-slate-300">
                            <span className="font-bold text-white">{nameList.split('\n').filter(n => n.trim()).length}</span> {nameList.split('\n').filter(n => n.trim()).length === 1 ? 'nome' : 'nomes'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="text-purple-400" size={14} />
                          <span className="text-xs md:text-sm text-slate-300">
                            <span className="font-bold text-white">{Math.ceil(nameList.split('\n').filter(n => n.trim()).length / 2)}</span> PDF{Math.ceil(nameList.split('\n').filter(n => n.trim()).length / 2) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setNameList('')}
                        className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 md:mt-6 text-center text-slate-600 text-xs md:text-sm">
                      Adicione os nomes acima e veja no preview
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleExport}
                    disabled={!nameList.trim() || !isConnected}
                    className="w-full mt-4 md:mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 md:py-4 md:px-6 rounded-xl flex items-center justify-center gap-2 md:gap-3 shadow-lg shadow-purple-900/30 hover:shadow-purple-600/40 transition-all duration-300 disabled:opacity-50 text-base md:text-lg"
                  >
                    <Download size={18} className="md:w-5 md:h-5" />
                    {isConnected ? 'Gerar PDFs' : 'Backend Offline'}
                  </button>
                </div>

                {/* Help Text */}
                <div className="text-center text-[10px] md:text-xs text-slate-600">
                  <p>💡 Cada PDF contém 2 nomes (topo e base)</p>
                  <p className="mt-1">Quer customizar? Vá para a aba <span className="text-blue-400 font-semibold">Design</span></p>
                </div>
              </div>
            </div>
          ) : (
            /* CANVAS - Design and Preview modes */
            <>
              {/* Grids and Patterns could go here */}
              <Canvas
                mode={mode}
                elements={elements}
                selectedIds={selectedIds}
                onUpdate={updateElement}
                onSelect={selectElement}
                onDelete={deleteElements}
              />
            </>
          )}
        </div>
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}
