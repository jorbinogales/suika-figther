# Jorbi (new champion) — art spec (Codex)

Reference: `art/ref/jorbi.png` (Jorbi: short dark hair with fade, black glasses, white short-sleeve patterned shirt, brown belt,
navy pants, black sneakers, gold bracelet on one wrist, black watch). Keep face/outfit/colors/proportions EXACTLY.
Same format as the other champions (see `art/SPRITE_SPEC.md`): one PNG per animation, horizontal strip of N equal 512x512 square cells,
FLAT PURE MAGENTA #FF00FF background, faces RIGHT, same pixel scale in every frame, feet on the same baseline (~90% of cell height),
~74% of the cell height tall, black outline, hard pixel edges. Look at `art/raw/leandro/walk.png` for the expected framing/scale.
Jorbi is a melee fighter ("programador" class: fights with fists).

## A) Normal form -> art/raw/jorbi/<anim>.png
| anim    | frames | description |
|---------|--------|-------------|
| idle    | 4 | breathing loop, fists loosely up (fighter stance) |
| walk    | 6 | walk cycle |
| run     | 6 | faster run, leaning forward |
| attack  | 5 | basic melee: quick right-hand punch (wind-up, strike, recover) |
| attack3 | 6 | HEAVY third hit: big wind-up, huge critical haymaker/uppercut with impact lines, recover (more dramatic than attack) |
| power1  | 6 | "Hay money": both hands sweep forward flinging a big fan of banknotes toward the right (draw only a few bills near the hands) |
| power2  | 6 | "Rico caldito": quickly slurps/eats a bowl of soup held in both hands, steam rising, satisfied pose at the end |
| dash    | 4 | fast lunge/dash forward: body leaning far forward, fist ahead, speed feel (no motion blur, pixel art) |
| ult     | 8 | transformation "Peneflexionada": flexes, rips off the shirt sleeves, muscles visibly swell, ends in a muscular power-flex pose |
| death   | 6 | falls and lies on the ground, last frame = final pose |

## B) Buffed form -> art/raw/jorbi_buff/<anim>.png   (same character AFTER the transformation)
MUCH more muscular (big arms, wide chest), SHIRT SLEEVES TORN OFF (sleeveless ripped shirt), a bit larger/stronger silhouette but
the SAME pixel scale, baseline and face/glasses/hair/pants/shoes/bracelet/watch as the normal form. Anims (same frame counts and
descriptions as above, but powerful/heavier movement): idle(4), walk(6), run(6), attack(5), attack3(6), power1(6), power2(6), dash(4), death(6).
(No ult strip for the buffed form.)

## C) Ability icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- jorbi_p1.png  fan of green banknotes flying
- jorbi_p2.png  bowl of steaming soup (caldito) with a spoon
- jorbi_p3.png  clenched fist with a golden critical-hit star/impact burst
- jorbi_ult.png muscular flexed arm with a torn shirt sleeve and a power aura

## D) Object -> art/raw/objects/bill.png (512x512, magenta bg, subject ~60%): ONE banknote, green, "$" mark, slightly curved/flying, 3/4 view, pixel art.
