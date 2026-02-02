import os
import io
from PIL import Image, ImageDraw, ImageFont

# --- CONSTANTS ---
# A4 Size at 300 DPI
A4_WIDTH = 2480
A4_HEIGHT = 3508
DPI = 300
TEXT_COLOR = (0, 0, 0, 255)

# Slot Configuration
# Left column: Rotate 90 (Reading up)
# Right column: Rotate -90/270 (Reading down - inverted relative to left?)
# BASED ON USER FEEDBACK: Text needs to be "deitado" (lying down) relative to the current "em pé" (standing).
# Current was 0, User wants 90.
# Slot Configuration
# Left column: Rotate 90 (Reading up)
# Right column: Rotate -90 (Reading down)
# Slot Configuration
# Left column: Rotate 90 (Reading up). Text should be to the LEFT of the fold/logo (visual X smaller)
# Right column: Rotate -90 (Reading down). Text should be to the RIGHT of the fold/logo (visual X larger)
# Adjusted coordinates based on "Gigantic" screenshot showing text centered on the fold.
# Slot Configuration
# Left column: Rotate 90. Text at left side.
# Right column: Rotate -90. Text at right side.
# Adjusted coordinates (More inwards margin, smaller font max)
# Slot Configuration
# Left column: Rotate -90 (Reading down - matching logo).
# Right column: Rotate 90 (Reading up - inverted).
# Slot Configuration
# Left column: Rotate -90 (Reading down). Text X=400 (Left of center 620).
# Right column: Rotate 90 (Reading up). Text X=1640 (Left of center 1860).
# Both texts should now appear "Above" (to the left of) the logo/fold.
# Slot Configuration
# Left column: Rotate -90 (Reading down). Text X=840 (Right of center 620).
# Right column: Rotate 90 (Reading up). Text X=2080 (Right of center 1860).
# Based on feedback "Below" = "Left side", moving to "Above" = "Right side of logo".
# Slot Configuration
# Left column: Rotate -90. X=800 (Slightly left of 840 to clear logo). Y=750 (HIGHER UP).
# Right column: Rotate 90. X=2040. Y=750 (HIGHER UP).
# Moving "Mais pra cima" (Y-axis) and fixing overlap (X-axis).
# Slot Configuration
# Left column: Rotate -90. X=440 (LEFT side of center 620). Y=750 (HIGHER UP).
# Right column: Rotate 90. X=1680 (LEFT side of center 1860). Y=750 (HIGHER UP).
# Goal: Text "Above the Logo" (visually Left side when reading) and High Y.
# Slot Configuration
# Left column ONLY for now.
# Rotate -90 (Reading down). X=440 (Left). Y=600 (HIGHER!).
# Moving to 600 based on "foi pra baixo" feedback (750 -> 600).
# Slot Configuration (FINAL CALIBRATED)
# Left Column: X=920, Y=890, Rot=-90 (User defined)
# Right Column: Mirrored relative to slot centers. 
# Left Center 620 -> 920 (+300 offset)
# Right Center 1860 -> 2160 (+300 offset) vertically aligned.
# Vertical Offset between slots: 1754px (2631-877).
# Slot Configuration (FINAL CALIBRATED)
# Left Column: X=920, Y=890, Rot=-90
# Right Column: X=1560, Y=820, Rot=90 (User calibrated)
# Vertical Offset: 1754px
SLOTS = [
    # Top-Left (Center X: 620, Center Y: 877)
    {"x": 620, "y": 877, "max_w": 1800, "max_h": 400, "rotation": 90}, 
    
    # Bottom-Left (Center X: 620, Center Y: 2631)
    {"x": 620, "y": 2631, "max_w": 1800, "max_h": 400, "rotation": 90},
    
    # Top-Right (Center X: 1860, Center Y: 877)
    {"x": 1860, "y": 877, "max_w": 1800, "max_h": 400, "rotation": -90},
    
    # Bottom-Right (Center X: 1860, Center Y: 2631)
    {"x": 1860, "y": 2631, "max_w": 1800, "max_h": 400, "rotation": -90}
]

def fit_text_to_box(draw, text, font_path, max_width, max_height, max_font_size=160):
    """
    Iteratively reduces font size until text fits within the bounding box.
    Returns the optimal ImageFont object.
    """
    font_size = max_font_size
    min_font_size = 40
    
    # Check if Font Exists
    current_font_path = font_path
    if not os.path.exists(current_font_path):
        # Specific Windows Fallback
        windows_fallback = "C:/Windows/Fonts/Arial.ttf"
        if os.path.exists(windows_fallback):
            current_font_path = windows_fallback
        else:
            # Last Resort
            print(f"[WARNING] Font not found at {font_path} and no system fallback. Using pixel font.")
            return ImageFont.load_default()

    font = ImageFont.truetype(current_font_path, font_size)

    while font_size > min_font_size:
        # Load Font with current size
        try:
            font = ImageFont.truetype(current_font_path, font_size)
        except OSError:
            return ImageFont.load_default()

        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        if text_w <= max_width and text_h <= max_height:
            return font
        
        font_size -= 10 # Faster step down
        
    return ImageFont.truetype(current_font_path, min_font_size)

def generate_badge(name, template_path, font_path="assets/fonts/OpenSans-Bold.ttf", elements=None):
    """
    Generate a single badge image from a template and element configuration.
    
    Args:
        name: Name to use for legacy SLOTS (mainly for filename)
        template_path: Path to the base template image
        font_path: Path to the font file
        elements: List of element dicts with keys: content, x, y, rotation, max_w, max_h, fontSize
    
    Returns:
        PIL Image object
    """
    
    # === CALIBRATION OFFSETS ===
    # Adjust these values to align preview with PDF output
    # Positive values shift text RIGHT and DOWN
    POSITION_OFFSET_X = -35  # Horizontal offset (correction: move Left)
    POSITION_OFFSET_Y = -10  # Vertical offset (correction: move Up slightly)
    # ============================

    # ============================

    # 1. Load Template (With Global Caching)
    global _CACHED_TEMPLATE
    
    # Initialize cache if needed
    if '_CACHED_TEMPLATE' not in globals() or _CACHED_TEMPLATE is None:
        try:
            if os.path.exists(template_path):
                img = Image.open(template_path).convert("RGBA")
                # Pre-resize and store in cache
                _CACHED_TEMPLATE = img.resize((A4_WIDTH, A4_HEIGHT), Image.BILINEAR)
                print(f"[CACHE] Template loaded and cached: {template_path}")
            else:
                # Fallback
                _CACHED_TEMPLATE = Image.new('RGBA', (A4_WIDTH, A4_HEIGHT), (255, 255, 255, 255))
        except Exception as e:
            print(f"[ERROR] Failed to load template: {e}")
            _CACHED_TEMPLATE = Image.new('RGBA', (A4_WIDTH, A4_HEIGHT), (255, 255, 255, 255))

    # Use a COPY of the cached template for this instance
    base = _CACHED_TEMPLATE.copy()
    
    # 2. Font Setup (with caching)
    current_font_path = font_path
    if not os.path.exists(current_font_path):
        windows_fallback = "C:/Windows/Fonts/Arial.ttf"
        current_font_path = windows_fallback if os.path.exists(windows_fallback) else None

    # Font cache for performance
    font_cache = {}

    # 3. Process Elements
    if elements and len(elements) > 0:
        for el in elements:
            text_content = el.get("content", name)
            if not text_content or text_content == "Nome Sobrenome":
                continue
            
            x = el.get("x", 1240)
            y = el.get("y", 1754)
            max_w = el.get("max_w", 1800)
            max_h = el.get("max_h", 400)
            rotation = el.get("rotation", 0)
            user_font_size = int(el.get("fontSize", 160))

            # Load Font (with caching)
            if user_font_size not in font_cache:
                try:
                    if current_font_path:
                        font_cache[user_font_size] = ImageFont.truetype(current_font_path, user_font_size)
                    else:
                        font_cache[user_font_size] = ImageFont.load_default()
                except Exception:
                    font_cache[user_font_size] = ImageFont.load_default()
            
            font = font_cache[user_font_size]

            # OPTIMIZED: Smart layer sizing (2x padding instead of 2x dimensions)
            # Calculate actual text size first
            temp_img = Image.new('RGBA', (1, 1))
            temp_draw = ImageDraw.Draw(temp_img)
            bbox = temp_draw.textbbox((0, 0), text_content, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            # Create layer with 2x padding (much smaller than before)
            layer_w = min(text_w * 2, max_w * 2)  # Cap at max_w * 2
            layer_h = min(text_h * 2, user_font_size * 3)  # Cap at 3x font size
            
            text_layer = Image.new('RGBA', (layer_w, layer_h), (255, 255, 255, 0))
            draw = ImageDraw.Draw(text_layer)

            # Center text
            text_x = (layer_w - text_w) // 2
            text_y = (layer_h - text_h) // 2
            draw.text((text_x, text_y), text_content, font=font, fill=(55, 55, 55, 255))  # Medium dark gray

            # Rotate (BILINEAR is faster than BICUBIC)
            if rotation != 0:
               text_layer = text_layer.rotate(-rotation, expand=True, resample=Image.BILINEAR)
            
            # Paste centered at (x, y) + offset - matching frontend translate(-50%, -50%)
            paste_x = int(x - text_layer.width // 2 + POSITION_OFFSET_X)
            paste_y = int(y - text_layer.height // 2 + POSITION_OFFSET_Y)
            base.paste(text_layer, (paste_x, paste_y), text_layer)

    else:
        # Legacy SLOTS fallback
        for slot in SLOTS:
            x, y = slot["x"], slot["y"]
            max_w, max_h = slot["max_w"], slot["max_h"]
            rotation = slot["rotation"]

            # Use fit_text_to_box for legacy mode
            temp_img = Image.new('RGBA', (1, 1))
            temp_draw = ImageDraw.Draw(temp_img)
            font = fit_text_to_box(temp_draw, name, current_font_path or "Arial.ttf", max_w, max_h, 160)

            bbox = temp_draw.textbbox((0, 0), name, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            layer_w = text_w + 100
            layer_h = text_h + 100
            text_layer = Image.new('RGBA', (layer_w, layer_h), (255, 255, 255, 0))
            draw = ImageDraw.Draw(text_layer)

            text_x = (layer_w - text_w) // 2
            text_y = (layer_h - text_h) // 2
            draw.text((text_x, text_y), name, font=font, fill=(55, 55, 55, 255))  # Medium dark gray

            if rotation != 0:
                text_layer = text_layer.rotate(-rotation, expand=True, resample=Image.BILINEAR)

            paste_x = int(x - text_layer.width / 2)
            paste_y = int(y - text_layer.height / 2)
            base.paste(text_layer, (paste_x, paste_y), text_layer)

    return base
