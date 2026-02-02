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
  useEffect(() => {
    if (!nameList.trim()) return;

    const names = nameList.split('\n').filter(n => n.trim());
    const name1 = names[0];
    const name2 = names[1];

    if (name1 && elements.length > 2) {
      if (elements[0].content !== name1) updateElement(elements[0].id, { content: name1 });
      if (elements[2].content !== name1) updateElement(elements[2].id, { content: name1 });
    }

    if (name2 && elements.length > 3) {
      if (elements[1].content !== name2) updateElement(elements[1].id, { content: name2 });
      if (elements[3].content !== name2) updateElement(elements[3].id, { content: name2 });
    }
  }, [nameList, elements, updateElement]);

  const handleExport = async () => {
    let toastId = null;

    try {
      const rawNameList = nameList || "";
      const names = rawNameList
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      setIsGenerating(true);

      let namesToExport = [];

      if (rawNameList.trim()) {
        namesToExport = names;
      } else {
        if (!elements || elements.length < 2) {
          alert("Error: Elements not loaded correctly.");
          setIsGenerating(false);
          return;
        }

        const topName = elements[0]?.content || "";
        const bottomName = elements[1]?.content || "";

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

      const pdfCount = Math.ceil(namesToExport.length / 2);
      const estimatedSeconds = Math.max(5, pdfCount * 2.5);
      const estimatedTime = estimatedSeconds > 10
        ? `~${Math.round(estimatedSeconds)}s`
        : 'a few seconds';

      toastId = toast.loading("Generating PDFs...", {
        description: `Processing ${namesToExport.length} name${namesToExport.length > 1 ? 's' : ''} → ${pdfCount} PDF${pdfCount > 1 ? 's' : ''}. ETA: ${estimatedTime}`
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const blob = await Promise.race([
          generateBatch(namesToExport, elements.map(el => ({
            ...el,
            fontSize: el.max_font_size || el.fontSize || 120
          }))),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 30000)
          })
        ]);

        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        const filename = namesToExport.length <= 2
          ? `crachas_${namesToExport.join('-').replace(/\s+/g, '_')}.pdf`
          : 'crachas_finalizados.zip';

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);

        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        toast.success("Download Ready!", {
          id: toastId,
          description: `${namesToExport.length} badge${namesToExport.length > 1 ? 's' : ''} generated successfully!`
        });
      } catch (innerError) {
        console.error("Fetch failed", innerError);
        throw innerError;
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
      <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7' } }} />

      <Layout
        toolbar={
          <div className="flex items-center w-full justify-between">
            {/* Left: Branding & History */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-bold text-sm tracking-widest uppercase text-zinc-100">
                <LayoutTemplate className="text-blue-600" size={18} />
                <span>Gerador de <span className="text-blue-500">Crachás</span></span>
                <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono ml-2">
                  v1.0
                </span>
              </div>

              {/* History Controls */}
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-4 ml-4">
                <button
                  onClick={() => { undo(); toast.info("Desfazer"); }}
                  disabled={past.length === 0}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  onClick={() => { redo(); toast.info("Refazer"); }}
                  disabled={future.length === 0}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo2 size={16} />
                </button>
              </div>
            </div>

            {/* Center: Mode Toggle - Clean Segmented Control */}
            <div className="flex bg-zinc-950 rounded-md p-1 border border-zinc-800">
              <button
                onClick={() => setMode('names')}
                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 text-xs font-medium transition-all duration-200 ${mode === 'names' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <FileText size={14} /> Nomes
              </button>
              <button
                onClick={() => setMode('calibration')}
                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 text-xs font-medium transition-all duration-200 ${mode === 'calibration' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Edit3 size={14} /> Design
              </button>
              <button
                onClick={() => setMode('production')}
                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 text-xs font-medium transition-all duration-200 ${mode === 'production' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Eye size={14} /> Visualizar
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Backend Status Indicator - Minimal */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${isConnected ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}
                title={isConnected ? "Backend Conectado" : "Backend Desconectado"}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden xl:inline">{isConnected ? "Online" : "Offline"}</span>
              </div>

              <div className="w-px h-6 bg-zinc-800 mx-1" />

              <button className="btn-icon" title="Salvar Projeto" onClick={handleSave}>
                <Save size={18} />
              </button>

              <button className="btn-icon" title="Resetar Layout" onClick={handleReset}>
                <RefreshCcw size={18} className="text-zinc-400 hover:text-red-400" />
              </button>

              <button
                onClick={handleExport}
                className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar PDF"
                disabled={!isConnected}
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
        <div className="w-full h-full overflow-hidden flex flex-col relative bg-zinc-950">
          {mode === 'names' ? (
            /* NAMES PAGE - Redesigned */
            <div className="flex items-center justify-center h-full p-4 md:p-8 overflow-y-auto align-top sm:align-middle">
              <div className="max-w-2xl w-full space-y-4 md:space-y-6 animate-in fade-in duration-500 my-auto">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Gerador de Crachás</h1>
                  </div>
                  <p className="text-zinc-500 text-xs md:text-sm">
                    Adicione os nomes linha por linha para gerar os crachás
                  </p>
                </div>

                {/* Main Input Card - Solid Zinc */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 md:p-8 shadow-2xl">
                  <textarea
                    value={nameList}
                    onChange={(e) => setNameList(e.target.value)}
                    placeholder={"João Silva\nMaria Santos\nPedro Costa\n...\n(Adicione mais nomes)"}
                    className="w-full h-64 md:h-96 bg-zinc-950 border border-zinc-800 rounded-lg text-sm md:text-base text-zinc-300 placeholder-zinc-600 px-4 py-3 md:px-6 md:py-4 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono leading-relaxed transition-all"
                  />

                  {/* Counter & Stats */}
                  {nameList.trim() ? (
                    <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 bg-zinc-950 border border-zinc-800 rounded-lg gap-3 sm:gap-0">
                      <div className="flex gap-4 md:gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          <span className="text-xs md:text-sm text-zinc-400">
                            <span className="font-bold text-zinc-200">{nameList.split('\n').filter(n => n.trim()).length}</span> {nameList.split('\n').filter(n => n.trim()).length === 1 ? 'nome' : 'nomes'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="text-zinc-500" size={14} />
                          <span className="text-xs md:text-sm text-zinc-400">
                            <span className="font-bold text-zinc-200">{Math.ceil(nameList.split('\n').filter(n => n.trim()).length / 2)}</span> PDF{Math.ceil(nameList.split('\n').filter(n => n.trim()).length / 2) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setNameList('')}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 md:mt-6 text-center text-zinc-600 text-xs md:text-sm">
                      Adicione os nomes acima e veja no preview
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleExport}
                    disabled={!nameList.trim() || !isConnected}
                    className="w-full mt-4 md:mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 md:py-3.5 md:px-6 rounded-lg flex items-center justify-center gap-2 md:gap-3 shadow-sm transition-all duration-200 text-base"
                  >
                    <Download size={18} className="md:w-5 md:h-5" />
                    {isConnected ? 'Gerar PDFs' : 'Backend Offline'}
                  </button>
                </div>

                {/* Help Text */}
                <div className="text-center text-[10px] md:text-xs text-zinc-600">
                  <p>💡 Cada PDF contém 2 nomes (topo e base)</p>
                  <p className="mt-1">Para personalizar, acesse a aba <span className="text-zinc-400 font-medium">Design</span></p>
                </div>
              </div>
            </div>
          ) : (
            /* CANVAS - Design and Preview modes */
            <>
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
