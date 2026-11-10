# Maduro summons (Codex): bodyguard + cockroach animations

Same rules as art/UNITS_ANIM_SPEC.md ("Leandro's bots" section): one PNG per animation, horizontal strip of equal SQUARE 512x512 cells,
FLAT PURE MAGENTA #FF00FF background, pixel art, hard edges, black outline, facing RIGHT, same scale and baseline in every frame,
same design/colors as the static reference in art/raw/objects/<unit>.png (look at it first).

## bodyguard (Maduro's W escorts) -> art/raw/bodyguard/walk.png (6), attack.png (5), death.png (6)
Reference: art/raw/objects/bodyguard.png. Stands ~74% of the cell height.
- walk: loop, brisk escort walk.
- attack: quick strong punch / baton strike toward the right, impact on frames 3-4.
- death: hit reaction, stagger, fall; last frame = lying on the ground (stays, then fades).

## roach (Maduro's E box bugs) -> art/raw/roach/walk.png (6), attack.png (5), death.png (6)
Reference: art/raw/objects/roach.png (brown cockroach, side view, facing right, antennae and 6 legs). The roach is WIDE and low: let it use
~70% of the cell width (it will be short), feet on the baseline ~90% of the cell height.
- walk: loop, legs scuttling alternately, antennae wiggling, body bobbing slightly.
- attack: lunges forward and bites (mandibles open on frames 3-4), small green toxic drip optional.
- death: flips onto its back with legs curling up; last frame = on its back, legs in the air, still.

When done, tell me; I'll run tools/process_sprites.py / tools/atlas.py to pack them.
