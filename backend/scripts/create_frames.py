"""Generate simple original placeholder overlay PNGs for the four built-in demo layouts.
These are NOT official Locket frame artworks. They are samples for validating the Sharp pipeline.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
FONTS = [Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'), Path('/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf')]
FONT = next((str(p) for p in FONTS if p.exists()), None)
config = json.loads((ROOT / 'frames/frames.json').read_text())

def font(n):
    return ImageFont.truetype(FONT, n) if FONT else ImageFont.load_default()

schemes = {
 'classic': {'bg': (245,245,245), 'border': (25,25,25), 'ink': (22,22,22), 'top': 'CLASSIC FOUR CUT', 'footer': 'KHON168  /  PHOTOBOOTH'},
 'cute': {'bg': (255,221,236), 'border': (213,83,145), 'ink': (165,42,104), 'top': 'CUTE MEMORIES', 'footer': 'KHON168  *  SWEET MOMENTS'},
 'holo': {'bg': (216,228,255), 'border': (93,94,173), 'ink': (69,61,149), 'top': 'HOLO DREAMS', 'footer': 'KHON168  /  Y2K EDITION'},
 'school': {'bg': (255,237,193), 'border': (35,113,154), 'ink': (38,83,126), 'top': 'BACK TO SCHOOL', 'footer': 'KHON168  /  MAKE MEMORIES'}
}
for name, frame in config.items():
    w,h = frame['width'], frame['height']
    scheme=schemes[name]
    overlay=Image.new('RGBA',(w,h),scheme['bg']+(255,))
    draw=ImageDraw.Draw(overlay)
    if name=='holo':
        for y in range(h):
            t=y/max(1,h-1)
            fill=(int(204+24*t),int(225-12*t),int(255-36*t),255)
            draw.line([(0,y),(w,y)],fill=fill,width=1)
    # Cut out each photo slot; Sharp places resized images beneath the overlay.
    for rect in frame['slots']:
        x,y,sw,sh=[rect[k] for k in ['left','top','width','height']]
        draw.rectangle([x,y,x+sw-1,y+sh-1], fill=(0,0,0,0))
        for n in range(3):
            draw.rounded_rectangle([x-n-2,y-n-2,x+sw+n+1,y+sh+n+1],radius=10+n,outline=scheme['border']+(255,),width=1)
    top=scheme['top']; tfont=font(44 if name!='classic' else 29)
    bbox=draw.textbbox((0,0), top,font=tfont)
    draw.text(((w-(bbox[2]-bbox[0]))/2, 30 if name!='classic' else 16),top,font=tfont,fill=scheme['ink']+(255,))
    # Border decorations are deliberately very simple and editable.
    if name != 'classic':
        for i in range(5):
            x=85+i*200
            y=h-119
            draw.ellipse([x-10,y-10,x+10,y+10],fill=scheme['border']+(255,))
    footer=scheme['footer']; bfont=font(30 if name!='classic' else 26)
    bbox=draw.textbbox((0,0),footer,font=bfont)
    draw.text(((w-(bbox[2]-bbox[0]))/2, h-(65 if name!='classic' else 74)),footer,font=bfont,fill=scheme['ink']+(255,))
    out=ROOT/frame['overlay'] if 'overlay' in frame else ROOT/'frames'/'overlays'/f'{name}.png'
    # `overlay` in config is relative to frames/
    out=ROOT/'frames'/frame['overlay']
    out.parent.mkdir(parents=True,exist_ok=True)
    overlay.save(out)
    print(out.name, overlay.size)
