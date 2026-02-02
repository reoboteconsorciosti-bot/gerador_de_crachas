from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import base64
import io
import os
import zipfile
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from badge_engine import generate_badge, A4_WIDTH, A4_HEIGHT, DPI

app = FastAPI()

# Enable CORS for React Frontend (Port 3000 typically)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class SlotConfig(BaseModel):
    x: int
    y: int
    max_w: int
    max_h: int
    rotation: int
    max_font_size: Optional[int] = 160
    show_guides: Optional[bool] = False
    is_active: Optional[bool] = False

class PreviewRequest(BaseModel):
    name: str
    elements: List[Dict[str, Any]] # Generic dict to enable flexibility

class BatchRequest(BaseModel):
    names: List[str]
    elements: List[Dict[str, Any]]

# --- PATHS ---
# Assuming running from 'backend/' directory
TEMPLATE_PATH = "assets/templates/template.png"
FONT_PATH = "assets/fonts/MuseoSansCyrl-700.ttf"  # Museo Sans Cyrl 700

def ensure_assets():
    if not os.path.exists(TEMPLATE_PATH):
        print(f"WARNING: Template not found at {os.path.abspath(TEMPLATE_PATH)}")
    if not os.path.exists(FONT_PATH):
        print(f"WARNING: Font not found at {os.path.abspath(FONT_PATH)}")

@app.on_event("startup")
async def startup_event():
    ensure_assets()

# --- ENDPOINTS ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "backend": "FastAPI"}

@app.post("/api/preview")
def generate_preview(req: PreviewRequest):
    try:
        # req.elements is already a list of dicts
        img = generate_badge(req.name, TEMPLATE_PATH, FONT_PATH, req.elements)
        
        # Convert to Base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return {"image_base64": img_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper function for parallel processing (must be at top level)
def process_single_pair_pdf(args):
    """
    Worker function to generate a single PDF for a pair of names.
    Args:
        args: Tuple of (pair, elements_config, template_path, font_path, dpi)
    """
    pair, elements_template, template_path, font_path, dpi = args
    
    try:
        # Create element list for this PDF
        elements_for_pdf = []
        for el_index, el in enumerate(elements_template):
            modified_el = el.copy()
            if el_index in [0, 2]:  # Top
                modified_el['content'] = pair[0].strip() if len(pair) > 0 else 'Nome Sobrenome'
            elif el_index in [1, 3]:  # Bottom
                modified_el['content'] = pair[1].strip() if len(pair) > 1 else 'Nome Sobrenome'
            elements_for_pdf.append(modified_el)
        
        # Generate Badge
        img = generate_badge("Badge", template_path, font_path, elements_for_pdf)
        
        # Save to PDF bytes
        pdf_bytes = io.BytesIO()
        img.save(pdf_bytes, format="PDF", resolution=float(dpi))
        
        # Filename
        clean_names = [n.strip().replace(" ", "_") for n in pair]
        filename = f"crachas_{'-'.join(clean_names)}.pdf"
        
        return (filename, pdf_bytes.getvalue(), None)
    except Exception as e:
        return (None, None, str(e))

@app.post("/api/generate-batch")
def generate_batch(req: BatchRequest):
    if not req.names:
        raise HTTPException(status_code=400, detail="List of names is empty")

    # Group names in pairs
    name_pairs = []
    for i in range(0, len(req.names), 2):
        name_pairs.append(req.names[i:i+2])
    
    zip_buffer = io.BytesIO()
    errors = []

    # Calculate CPU workers (leave 1 core free for system/server)
    max_workers = max(1, os.cpu_count() - 1)
    
    # Prepare arguments for parallel execution
    # Note: We pass copies of req.elements to avoid any shared state issues
    process_args = [
        (pair, req.elements, TEMPLATE_PATH, FONT_PATH, DPI) 
        for pair in name_pairs
    ]

    import concurrent.futures

    # Store results in memory to check count before zipping
    batch_results = []
    
    # Parallel Execution
    with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Map returns results in order
        batch_results = list(executor.map(process_single_pair_pdf, process_args))
    
    # Check for errors
    for filename, pdf_data, error in batch_results:
        if error:
            errors.append(f"Error generating {filename or 'unknown'}: {error}")

    if errors:
        print(f"Batch errors: {errors}")
    
    # DECISION: Single PDF or ZIP?
    successful_pdfs = [(fname, data) for fname, data, err in batch_results if data]
    
    if len(successful_pdfs) == 1:
        # Single file - return PDF directly
        filename, pdf_data = successful_pdfs[0]
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        # Multiple files - return ZIP
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for filename, pdf_data, error in batch_results:
                if pdf_data:
                    zf.writestr(filename, pdf_data)
        
        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=crachas_finalizados.zip"}
        )
