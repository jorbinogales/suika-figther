# UI art spec v2 (Codex) — compact, separate modules

Same exact style as the existing `art/raw/ui/hud_bottom.png` and `art/raw/ui/hud_target.png` (heavy gunmetal/navy steel,
cyan #3fd0ff circuit inlays, tiny amber #ffb020 lights, pixel art, hard edges). BUT now the HUD is SMALLER and split into
separate floating modules with empty space between them. Each module is its own image at exactly the size below,
drawn at its NATIVE on-screen pixel size (so details are small and compact; keep pixel clusters crisp, no blur).

CUTOUTS: same rules as before. Every place where the game draws something is a clean axis-aligned HOLE of FLAT PURE MAGENTA
#FF00FF, nothing drawn inside. The area outside the module silhouette is also flat #FF00FF (the silhouette may be
non-rectangular / chamfered but should fill most of the canvas). No other magenta. No text/labels/icons in the art.
Holes must be fully enclosed by panel art (never touching the canvas edge).

## 1. art/raw/ui/hud_hero.png — 260 x 230  (hero portrait module, bottom-left)
- PORTRAIT hole 128x128 at x=20,y=36 (ornate frame).
- NAMEPLATE hole 128x24 at x=20,y=172.
- Small "?" BUTTON hole 36x36 at x=164,y=36 (a little side tab/button bay attached to the portrait frame).

## 2. art/raw/ui/hud_center.png — 520 x 190  (abilities + health/mana, bottom-center)
- 4 ABILITY holes 76x76 in a row at y=16, x = 64, 162, 260, 358 (22px gaps, separated by frame pillars).
- HEALTH BAR hole 440x28 at x=40,y=112.
- MANA BAR hole 440x18 at x=40,y=146.

## 3. art/raw/ui/hud_minimap.png — 370 x 230  (minimap module, bottom-right; most ornate: corner brackets)
- MINIMAP hole 330x180 at x=20,y=24.

## 4. art/raw/ui/hud_items.png — 148 x 240  (inventory module, middle of the LEFT screen edge, vertical)
- 6 ITEM holes 56x56 in 2 columns x 3 rows, gap 8: x = 14 and 78; y = 28, 92, 156.
- A slim top header ornament; a vertical panel.
