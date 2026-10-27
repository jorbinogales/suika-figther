# Julio (new champion, class "Programador", ranged artist) — art spec (Codex)

Reference: `art/ref/julio.png` (Julio: wears a cap turned backwards, keep face/outfit/colors/proportions EXACTLY). He carries a DRAWING TABLET
(graphics tablet with a stylus) in one hand and draws with INK. Same format as the other champions (`art/SPRITE_SPEC.md`, framing like `art/raw/jorbi/walk.png`):
one PNG per animation, horizontal strip of N equal 512x512 cells, FLAT PURE MAGENTA #FF00FF background, faces RIGHT, same pixel scale in
every frame, feet on the same baseline (~90% of cell height), ~74% of cell height tall, black outline, hard pixel edges.
Ink color theme: deep indigo / blue-black ink with a few violet highlights.

## A) art/raw/julio/<anim>.png
| anim    | frames | description |
|---------|--------|-------------|
| idle    | 4 | breathing loop, tablet held in the left hand against the hip, stylus in the right hand |
| walk    | 6 | walk cycle (tablet in hand) |
| run     | 6 | faster run |
| attack  | 6 | basic attack #1 (SLOWER, deliberate): carefully sketches a doodle on the tablet, then flicks the drawing forward with the stylus |
| attack2 | 4 | basic attack #2 (FAST, snappy): quick scribble and a fast flick forward (fewer frames, more abrupt than attack) |
| power1  | 6 | "Trazo": draws a big S-shaped stroke in the air with the stylus (arm sweeps up then down), ink trails, ends pointing forward |
| power2  | 5 | "Ola de tinta": dash lunge forward riding/inside a wave of ink, leaning far forward, ink splashes trailing behind (pixel art, no blur) |
| power3  | 6 | "Charco de tinta": crouches and slams the stylus/ink bottle on the ground / pours ink forming a puddle, drips |
| ult     | 8 | "El arte de las gotas": raises the tablet to the sky, dramatic pose, ink droplets rising from the tablet, glowing indigo aura, finishing with both arms up |
| death   | 6 | falls and lies on the ground, last frame = final pose (tablet beside him) |

## B) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- julio_p1.png  a bold S-shaped ink stroke / calligraphy swoosh
- julio_p2.png  a wave of dark ink crashing forward with splashes
- julio_p3.png  a spreading ink puddle with drips and ripples
- julio_ult.png a cluster of ink drops falling from above with a drawing tablet

## C) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of image, pixel art)
- ink_drawing.png  a small sheet of paper / sketch with a quick pencil-ink doodle on it, slightly tilted as if flying (basic attack projectile)
- ink_drop.png     a single big falling ink drop (teardrop), glossy indigo with a violet highlight
- ink_blot.png     a flat top-down ink splat/blot (used as the ground puddle and the ink mark), indigo, irregular edges
