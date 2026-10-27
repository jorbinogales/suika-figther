# Héctor (new champion, class "Ciberseguridad", tank, melee fists) — art spec (Codex)

Reference: `art/ref/hector.png` (Héctor, a cyclist — keep his face, body, outfit and colors EXACTLY; sturdy/strong build). Same format as the other champions (`art/SPRITE_SPEC.md`,
framing/scale like `art/raw/jorbi/walk.png`): one PNG per animation, horizontal strip of N equal 512x512 square cells, FLAT PURE MAGENTA #FF00FF background, faces RIGHT, same pixel scale
in every frame, feet on the same baseline (~90% of cell height), ~74% of the cell height tall, black outline, hard pixel edges.

## A) art/raw/hector/<anim>.png
| anim   | frames | description |
|--------|--------|-------------|
| idle   | 4 | breathing loop, tough guard stance |
| walk   | 6 | walk cycle |
| run    | 6 | faster run |
| attack | 5 | basic attack: strong straight PUNCH (wind-up, strike, recover) |
| power1 | 6 | "Proteína": drinks a big protein shake from a shaker bottle, flexes, a soft green healing glow around him in the last frames |
| power2 | 6 | "Cadenas engrasadas": swings heavy greasy iron chains and hurls them forward with one arm (chains extended, dark grease drips) — draw only the part of the chain near his hand |
| power3 | 6 | "Equipo de protección": quickly straps on protective gear (helmet, shoulder and knee pads), ends with a guard pose and a faint cyan shield shimmer |
| ult    | 8 | "Ciclismo profesional": a bicycle rolls in and he hops on it, grips the handlebars, last frames: riding pose ready to go, orange fire starting at the wheels |
| death  | 6 | falls and lies on the ground, last frame = final pose |

## B) Bike form -> art/raw/hector_bike/run.png (6 frames, same cell/scale rules; the cyclist + bicycle fill ~80% of the cell width and ~74% of its height)
Héctor riding his bicycle fast to the right, pedaling (6-frame loop), leaning forward, orange-red FLAMES trailing from the rear wheel and the pedals. Same outfit. Bike: sturdy mountain bike, dark frame.

## C) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- hector_p1.png  a protein shaker bottle with a green heart/plus and a muscle arm
- hector_p2.png  heavy dark greasy iron chains with a hook, grease drops
- hector_p3.png  a knight-like protective helmet + shield with a cyan glow
- hector_ult.png a bicycle wheel on fire with flames and speed lines

## D) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of the image, pixel art)
- chain_hook.png  a heavy iron hook/grapple head attached to a short piece of chain, pointing RIGHT, dark metal with grease shine
- chain_link.png  a single big iron chain link, dark and greasy, horizontal
