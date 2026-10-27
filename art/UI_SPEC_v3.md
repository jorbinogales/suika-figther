# Art spec v3 (Codex): ability targeting indicators + stats panel

Same technological pixel-art style as the HUD (`art/raw/ui/*.png`): hard pixel edges, no blur/anti-aliasing, limited palette.
All indicator art is drawn in WHITE / very light cyan / light grey on FLAT PURE MAGENTA #FF00FF background (magenta is keyed out;
the game tints the white art per ability color at runtime, so do NOT use colored fills). No text. Mostly empty/sparse
so the map stays visible underneath: thin lines, ticks, chevrons, circuit glyphs; no big solid fills.

## art/raw/aim/ (each file exact size)
1. `aim_ring.png`  512x512  — circular RANGE / AREA indicator seen from above: outer double ring with tick marks and small
   circuit/rune segments around it, a thinner inner ring, very sparse radial hatch/dots inside, center empty. Perfectly symmetric,
   ring radius ~250px (touches near the canvas edge).
2. `aim_band.png`  128x128  — seamless HORIZONTALLY TILEABLE trajectory band for projectiles: top and bottom edge lines with small
   ticks along them, and a row of right-pointing chevrons ">" through the middle; the band fills the full 128px height;
   left and right edges must line up when tiled side by side.
3. `aim_cap.png`   128x128  — target reticle for the END of a trajectory / the CENTER of a zone: ring + corner brackets + center dot.
4. `aim_marker.png` 96x96   — placement footprint for ONE wall segment (e.g. a tire): square tech brackets around a ring, sparse hatch.
5. `zone.png`       256x256 — circular ground decal for an ACTIVE area effect (cactus zone / ground slam): runic circuit circle with
   inner glyph ring, symmetrical, sparse.

## art/raw/ui/hud_stats.png — 254 x 230 (small stats-only panel shown to the SIDE of the hero module)
Same HUD frame style as hud_hero / hud_center. One hole only: STATS hole 214x190 at x=20,y=20 (flat #FF00FF, clean rectangle,
nothing inside). Silhouette outside also magenta. No other holes.

## art/raw/ui/hud_enemy.png — 504 x 72 (LINEAR info strip for a clicked champion, top-right; thin so it never blocks the view)
Same HUD frame style. Holes (flat #FF00FF, clean rectangles, nothing inside), all in ONE horizontal row:
- NAMEPLATE hole 170x26 at x=14,y=23
- 6 ITEM holes 38x38 each in one row, gap 4, starting x=196,y=17 (x = 196, 238, 280, 322, 364, 406)
- small "?" BUTTON hole 30x30 at x=462,y=21
Silhouette outside also magenta; low-profile slim bar.

## Announcement banners (epic kill / tower / victory announcements) — 3 files, each exactly 800 x 140
art/raw/ui/hud_banner_blue.png  (BLUE team = modern military: steel, bolts, cyan-blue glowing accents, subtle camouflage/chevron details)
art/raw/ui/hud_banner_red.png   (RED team = robots: dark metal, red glowing circuits/vents, spikes, red lights)
art/raw/ui/hud_banner_gold.png  (neutral/info and victory: gold ornate frame, laurel wings, amber glow)
Same HUD pixel-art style as the other modules (heavy beveled frames, crisp hard pixels, no blur/anti-aliasing). Wide EPIC "fighting game / MOBA announcer" ribbon: a long banner whose ends flare out like
wings/blades, with a dark recessed center area (flat dark navy/charcoal, subtle texture, NO text, left plain so the game can write the title and subtitle over it).
HOLES (flat pure #FF00FF, clean axis-aligned rectangles, nothing drawn inside, fully enclosed by frame art):
- KILLER PORTRAIT hole 108 x 108 at x=18, y=16 (the heaviest, most ornate frame: wings/laurel/crown, big glow)
- VICTIM PORTRAIT hole 64 x 64 at x=718, y=38 (smaller frame with a cracked/skull motif)
The silhouette outside the banner is also flat #FF00FF. No other magenta, no text.

## Banner variants v2 (same 800 x 140 canvas, SAME style, colors and dimensions as art/raw/ui/hud_banner_blue/red/gold.png — use them as the exact reference)
- art/raw/ui/hud_banner_blue_l.png, hud_banner_red_l.png, hud_banner_gold_l.png: identical to the originals but WITHOUT the right portrait frame: the right end is closed with the same ornate wing/blade ending (a symmetrical flared end, matching the left wing silhouette) and the dark center area extends to it. Keep ONLY the left hole: KILLER PORTRAIT 108 x 108 at x=18, y=16 (flat #FF00FF, nothing inside).
- art/raw/ui/hud_banner_gold_plain.png: gold ornate banner with NO holes at all: both ends are the same flared wing ending (no portrait frames), a clean dark center for text. Used for announcer-only messages (welcome, minions, victory).
Outside the silhouette is flat #FF00FF. No text.
