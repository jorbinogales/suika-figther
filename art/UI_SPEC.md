# UI art spec (Codex = visual work)

Style: technological, Warcraft-3-like ornate command panel (heavy gunmetal/dark steel plates, bolts, beveled frames,
glowing cyan/teal circuit lines and small corner ornaments), but PIXEL ART with hard edges (no blur/anti-aliasing),
matching the game's pixel-art look (see `art/ref/game_screenshot.png`, the existing dark navy/blue HUD and green/olive map).
Palette: dark navy/charcoal metal, cyan (#3fd0ff) glow accents, small amber (#ffb020) highlights. Consistent across both files.

CUTOUTS: every place where the game will draw something (slots, portrait, bars, stats area, minimap, nameplate) must be a
HOLE filled with FLAT PURE MAGENTA #FF00FF, a clean axis-aligned rectangle with hard edges, surrounded by the panel's
bevel/frame art. Do NOT draw anything inside the holes (no icons, text, numbers). The area OUTSIDE the panel silhouette
(if the panel is not a perfect rectangle) is also flat #FF00FF. No other magenta anywhere. No text/labels in the art.

## File 1: art/raw/ui/hud_bottom.png  — exactly 2048 x 384 px
Full-width bottom command bar. Holes (approximate px, left to right; keep these sizes/positions reasonably close):
1. LEFT item bay: 6 square holes in 3 columns x 2 rows, each ~92x92, gap ~12, bay starting x~24,y~72 (an inventory-style recess).
2. Hero PORTRAIT hole: ~176x176 at x~340,y~96 (ornate heavier frame).
3. CENTER: 4 square ABILITY holes ~100x100 in one row at y~20, x~600,740,880,1020.
   Below them: a wide HEALTH BAR hole ~560x40 at x~580,y~150 and a MANA BAR hole ~560x28 at x~580,y~200
   (both flat horizontal slots with inset frames).
4. STATS hole: ~330x200 at x~1220,y~90 (a screen-like recessed display).
5. MINIMAP hole: ~420x230 at x~1590,y~70, bottom-right, with the most ornate frame (corner brackets, glow).
Top edge of the bar can have decorative antennas/rivets/raised center piece but the bar stays fully inside the 2048x384 canvas.

## File 2: art/raw/ui/hud_target.png — exactly 768 x 300 px
Compact info panel shown in the TOP-RIGHT of the screen when a champion is selected. Same style. Holes:
1. NAMEPLATE hole: ~400x28 at x~24,y~14.
2. small PORTRAIT hole: ~120x120 at x~24,y~56.
3. STATS hole: ~300x200 at x~160,y~56.
4. ITEMS: 6 square holes ~72x72 in 3 columns x 2 rows, gap ~8, at x~488,y~56.
