import math
from PIL import Image, ImageFilter, ImageDraw, ImageOps

def create_combined_product_mockup():
    bg_img_path = "docs/images/today-overview.png"
    fg_img_path = "docs/images/selection-assistant.png"
    output_path = "docs/images/hero-product.png"

    # Open images
    bg = Image.open(bg_img_path).convert("RGBA")
    fg = Image.open(fg_img_path).convert("RGBA")

    # Target canvas size: 1200 x 780
    canvas_w, canvas_h = 1200, 780

    # Create background with subtle modern mesh/gradient
    # Base gradient from #f8fafc to #edf2f7
    base_bg = Image.new("RGBA", (canvas_w, canvas_h), (248, 250, 252, 255))
    draw = ImageDraw.Draw(base_bg)
    for y in range(canvas_h):
        ratio = y / canvas_h
        r = int(248 * (1 - ratio) + 238 * ratio)
        g = int(250 * (1 - ratio) + 242 * ratio)
        b = int(252 * (1 - ratio) + 246 * ratio)
        draw.line([(0, y), (canvas_w, y)], fill=(r, g, b, 255))

    # Resize main window (today-overview) slightly to fit nicely on the canvas
    # bg original: 1024x688 -> scale to ~960 width
    scale_bg = 980 / bg.width
    bg_w = int(bg.width * scale_bg)
    bg_h = int(bg.height * scale_bg)
    bg_resized = bg.resize((bg_w, bg_h), Image.Resampling.LANCZOS)

    # Add rounded corners to bg
    def round_corners(im, radius):
        mask = Image.new('L', im.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), im.size], radius=radius, fill=255)
        res = im.copy()
        res.putalpha(mask)
        return res

    bg_rounded = round_corners(bg_resized, 18)

    # Create soft shadow for bg
    def create_shadow(im_size, radius, blur=24, offset=(0, 14), shadow_alpha=40):
        w, h = im_size
        pad = blur * 2
        shadow_w = w + pad * 2
        shadow_h = h + pad * 2
        shadow = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow)
        s_rect = [
            pad + offset[0],
            pad + offset[1],
            pad + offset[0] + w,
            pad + offset[1] + h
        ]
        s_draw.rounded_rectangle(s_rect, radius=radius, fill=(15, 23, 42, shadow_alpha))
        shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
        return shadow, pad

    bg_shadow, pad_bg = create_shadow(bg_rounded.size, radius=18, blur=28, offset=(0, 16), shadow_alpha=45)

    # Position for background window (slightly towards top-left)
    bg_x = 40
    bg_y = 40

    # Paste background shadow & window
    base_bg.alpha_composite(bg_shadow, (bg_x - pad_bg, bg_y - pad_bg))
    base_bg.alpha_composite(bg_rounded, (bg_x, bg_y))

    # Resize foreground popup (selection-assistant: 960x960) -> scale to ~480x480
    fg_size = 490
    fg_resized = fg.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
    fg_rounded = round_corners(fg_resized, 18)

    # Foreground popup shadow (rich elevation)
    fg_shadow, pad_fg = create_shadow(fg_rounded.size, radius=18, blur=32, offset=(0, 20), shadow_alpha=70)

    # Position for floating popup (bottom-right overlap)
    fg_x = canvas_w - fg_size - 40
    fg_y = canvas_h - fg_size - 40

    # Paste foreground shadow & popup
    base_bg.alpha_composite(fg_shadow, (fg_x - pad_fg, fg_y - pad_fg))
    base_bg.alpha_composite(fg_rounded, (fg_x, fg_y))

    # Save final optimized image
    base_bg.convert("RGB").save(output_path, "PNG", optimize=True)
    print(f"Successfully generated {output_path} ({canvas_w}x{canvas_h})")

if __name__ == "__main__":
    create_combined_product_mockup()
