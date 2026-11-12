# Julio, second branches (Codex): golden ink + puddle form

Same rules as art/JULIO_SPEC.md and art/SPRITE_SPEC.md: horizontal strip of equal SQUARE 512x512 cells, FLAT PURE MAGENTA #FF00FF background,
pixel art, hard edges, black outline, facing RIGHT, same pixel scale and baseline in every frame. Julio must look EXACTLY like in art/raw/julio/*.
New theme: GOLDEN ink (warm gold / amber with white-yellow highlights) next to his usual indigo ink.

## A) Julio as an INK PUDDLE (ultimate "Charco viviente") -> art/raw/julio/
| file | frames | description |
|------|--------|-------------|
| puddle_in.png   | 6 | Transformation: Julio crouches, slams the stylus on the ground, his body melts / sinks into a glossy indigo ink puddle (last frame = just the puddle with a few bubbles, no Julio) |
| puddle_move.png | 6 | LOOP, the puddle slides to the right: low wide irregular ink blob (~70% of cell width, only ~25% of cell height, on the baseline), rippling edge, bubbles popping, a faint gold glint. Same look in all frames, only the wobble changes |
| puddle_out.png  | 5 | Reverse: the puddle swells, Julio rises out of it (last frame = Julio standing in his idle pose) |
| puddle_cast.png | 4 | the puddle "spits" a splash upward (used when he casts a skill as a puddle) |

## B) Icons 128x128 (magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- julio_p1b.png  golden paint bursts firing from a stylus like a machine gun (several gold droplets in a line)
- julio_p2b.png  a golden ink bubble / shield around a small figure with a green cross-like glow
- julio_p3b.png  a golden ink drop bouncing between two targets (zig-zag arrows)
- julio_ultb.png Julio's cap sinking into a puddle of ink with ripples

## C) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of the image)
- ink_gold_drop.png  a golden glossy ink drop / bolt pointing to the right, white-yellow highlight (golden basic attack + burst bullets)
- ink_shield.png     a translucent-looking golden ink bubble sphere, thick glossy rim, swirl inside (shield around a unit)
- ink_chain.png      a short dark-indigo chain link with ink drips (puddle chains)
- ink_bubble.png     a single round ink bubble with a shine (bubbling puddle)

When done tell me; I pack them with tools/process_sprites.py / tools/atlas.py.

## D) Extra: shield casting pose -> art/raw/julio/power2b.png (6 frames)
"Escudo de tinta dorada": Julio stays in place (NO dash, no lunge): raises the tablet and the stylus, a golden ink bubble forms and swells around him (or toward an ally in front),
ending with both arms open and the golden bubble shining. Same format as the other Julio strips (512x512 cells, magenta bg, faces RIGHT).
