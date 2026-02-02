import streamlit as st
import zipfile
import io
import os
import unicodedata
import re
from src.badge_engine import generate_badge, A4_WIDTH, A4_HEIGHT, DPI

# --- CONFIGURATION & STYLES ---
st.set_page_config(page_title="Gerador de Crachás", layout="wide", page_icon="🪪")

DARK_CSS = """
<style>
    /* Force Dark Mode Background */
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
    }
    /* Input Fields */
    .stTextArea textarea {
        background-color: #262730;
        color: white;
        border: 1px solid #4B5563;
    }
    /* Buttons */
    .stButton > button {
        background-color: #0E1117;
        color: #3B82F6;
        border: 2px solid #3B82F6;
        border-radius: 8px;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    .stButton > button:hover {
        background-color: #3B82F6;
        color: white;
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
    }
    /* Headers */
    h1, h2, h3 {
        font-family: 'Segoe UI', sans-serif;
        color: #E6E6E6;
    }
</style>
"""
st.markdown(DARK_CSS, unsafe_allow_html=True)

def sanitize_filename(name):
    """Clean filename for ZIP storage."""
    nfkd = unicodedata.normalize('NFKD', name)
    ascii_text = nfkd.encode('ASCII', 'ignore').decode('utf-8')
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '', ascii_text.replace(" ", "_"))
    return clean.upper()

# --- MAIN APP ---
def main():
    st.title("🪪 Gerador de Crachás de Mesa")
    st.markdown("Cole a lista de nomes abaixo para gerar os PDFs prontos para impressão.")

    # --- CONFIGURATION IN SIDEBAR ---
    # --- CONFIGURATION IN SIDEBAR ---
    with st.sidebar:
        st.header("⚙️ Calibragem Fina")
        
        # Calibration Sliders
        calib_mode = st.checkbox("Ativar Modo Calibragem", value=False)
        
        if calib_mode:
            # --- SESSION STATE INIT (4 Independent Slots) ---
            if "slots_state" not in st.session_state:
                # Load defaults from badge_engine SLOTS or hardcoded starting point
                # We use hardcoded here to ensure a "Clean" start if needed, matching current Code
                st.session_state.slots_state = [
                    {"x": 920, "y": 890, "rot": -90},   # Slot 0 (Top Left)
                    {"x": 920, "y": 2644, "rot": -90},  # Slot 1 (Bot Left)
                    {"x": 1560, "y": 820, "rot": 90},   # Slot 2 (Top Right)
                    {"x": 1560, "y": 2574, "rot": 90}   # Slot 3 (Bot Right)
                ]
            
            if "font_size" not in st.session_state:
                st.session_state.font_size = 160

            st.divider()
            
            # --- SELECTION & CONTROLS ---
            # Map friendly names to indices
            selections = {
                "Todos (Move Tudo)": [0, 1, 2, 3],
                "Esquerda (Lote)": [0, 1],
                "Direita (Lote)": [2, 3],
                "Slot 1 (Topo Esq)": [0],
                "Slot 2 (Inf Esq)": [1],
                "Slot 3 (Topo Dir)": [2],
                "Slot 4 (Inf Dir)": [3]
            }
            
            target_name = st.selectbox("🎯 Selecione o que Mover:", list(selections.keys()), index=1) # Default Left
            targets = selections[target_name]
            primary_idx = targets[0] # Reference for displaying values
            
            step_size = st.select_slider("Precisão (px)", options=[1, 10, 50, 100], value=10)
            show_guides = st.toggle("Mostrar Guias", value=True)
            
            # --- LOGIC ---
            def move(dx, dy):
                for idx in targets:
                    st.session_state.slots_state[idx]["x"] += dx
                    st.session_state.slots_state[idx]["y"] += dy
            
            def set_val_x():
                new_val = st.session_state.input_x
                old_val = st.session_state.slots_state[primary_idx]["x"]
                diff = new_val - old_val
                for idx in targets:
                    st.session_state.slots_state[idx]["x"] += diff
            
            def set_val_y():
                new_val = st.session_state.input_y
                old_val = st.session_state.slots_state[primary_idx]["y"]
                diff = new_val - old_val
                for idx in targets:
                    st.session_state.slots_state[idx]["y"] += diff
                    
            def set_rot():
                new_val = st.session_state.input_rot
                # Rotation: Usually absolute set makes sense for groups
                for idx in targets:
                    st.session_state.slots_state[idx]["rot"] = new_val

            # --- D-PAD ---
            c_pad, c_vals = st.columns([1, 1.5])
            
            with c_pad:
                st.write("🎮 **Mover**")
                bd1, bd2, bd3 = st.columns([1,1,1])
                st.button("⬆️", key="u_btn", use_container_width=True, on_click=move, args=(0, -step_size))
                
                bl, bd, br = st.columns([1,1,1])
                bl.button("⬅️", key="l_btn", on_click=move, args=(-step_size, 0))
                bd.button("⬇️", key="d_btn", on_click=move, args=(0, step_size))
                br.button("➡️", key="r_btn", on_click=move, args=(step_size, 0))
                
            with c_vals:
                st.write("🔢 **Valores (Ref.)**")
                # We use key="input_x" etc and on_change to trigger updates
                # Value is read from the Primary slot of the selection
                ref_slot = st.session_state.slots_state[primary_idx]
                
                st.number_input("Posição X", value=ref_slot["x"], step=10, key="input_x", on_change=set_val_x)
                st.number_input("Posição Y", value=ref_slot["y"], step=10, key="input_y", on_change=set_val_y)
                st.slider("Rotação", -180, 180, value=ref_slot["rot"], key="input_rot", on_change=set_rot)

            st.divider()
            st.subheader("Geral")
            st.slider("Tamanho Fonte", 50, 400, key="font_size")
            calib_name = st.text_input("Testar Nome", "Gabriel Ferreira")
            
            # --- LIVE PREVIEW (Now in Main Area) ---
            # Active selection is shown in the success box above.
    
    if calib_mode:
        st.subheader("👁️ Calibragem em Tempo Real")
        
        # Build props from state
        final_slots = []
        cur_sel = st.session_state.current_selection
        
        for idx, s in enumerate(st.session_state.slots_state):
            final_slots.append({
                "x": s["x"], "y": s["y"], 
                "max_w": 1800, "max_h": 400, 
                "rotation": s["rot"], 
                "max_font_size": st.session_state.font_size,
                "show_guides": show_guides,
                "is_active": (idx in cur_sel) # Pass active state
            })
        
        try:
            template_path = "assets/templates/template.png"
            font_path = "assets/fonts/OpenSans-Bold.ttf"
            img = generate_badge(calib_name, template_path, font_path, final_slots)
            
            # Show coordinates of first 2 slots for reference
            s = st.session_state.slots_state
            st.caption(f"📍 Slots Atuais: S0(TE):{s[0]['x']},{s[0]['y']} | S2(TD):{s[2]['x']},{s[2]['y']}")
            st.image(img, use_container_width=True)
            
        except Exception as e:
            st.error(f"Erro no preview: {e}")

    # --- INPUT SECTION (Normal Mode) ---
    if not calib_mode:
        col1, col2 = st.columns([2, 1])
        
        with col1:
             names_input = st.text_area("Lista de Nomes (Um por linha)", height=300)
    
        with col2:
            st.info("ℹ️ Certifique-se de que os arquivos `template.png` e `OpenSans-Bold.ttf` existem nas pastas `assets/`.")
            st.metric(label="Resolução de Saída", value=f"{DPI} DPI")

        # Action Section
        if st.button("GERAR LOTE DE CRACHÁS"):
            if not names_input.strip():
                st.warning("A lista de nomes está vazia!")
                return

            names_list = [n.strip() for n in names_input.split('\n') if n.strip()]
            total = len(names_list)
            
            # Feedback UI
            progress_bar = st.progress(0)
            status = st.empty()
            
            # Buffer for ZIP
            zip_buffer = io.BytesIO()
            template_path = "assets/templates/template.png"
            font_path = "assets/fonts/OpenSans-Bold.ttf"
            
            errors = []
            
            try:
                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                    for i, name in enumerate(names_list):
                        # Progress Update
                        status.text(f"Processando ({i+1}/{total}): {name}")
                        progress_bar.progress((i + 1) / total)
                        
                        try:
                            # 1. Generate Image
                            img = generate_badge(name, template_path, font_path)
                            
                            # 2. Convert to PDF Bytes
                            pdf_bytes = io.BytesIO()
                            img.save(pdf_bytes, format="PDF", resolution=float(DPI))
                            
                            # 3. Add to Zip
                            filename = f"CRACHA_{sanitize_filename(name)}.pdf"
                            zf.writestr(filename, pdf_bytes.getvalue())
                            
                        except Exception as e:
                            errors.append(f"Erro em '{name}': {str(e)}")
                
                # Finalize
                status.success(f"Concluído! {total} processados.")
                if errors:
                    st.error(f"{len(errors)} erros encontrados.")
                    st.write(errors)
                
                # Download Button
                zip_buffer.seek(0)
                st.download_button(
                    label="⬇️ BAIXAR ARQUIVO .ZIP",
                    data=zip_buffer,
                    file_name="crachas_finalizados.zip",
                    mime="application/zip"
                )

            except Exception as e:
                st.error(f"Erro Crítico no Sistema: {e}")

if __name__ == "__main__":
    main()
