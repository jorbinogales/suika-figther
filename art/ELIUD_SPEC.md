# Eliud (new champion, class "Programador") — art spec (Codex)

Reference: `art/ref/eliud.png` (Eliud: dark skin, black backwards cap, short beard, black stud earring, black hoodie over a lilac shirt, dark grey jeans, black sneakers). Keep face/outfit/colors/proportions EXACTLY.
Same format as the other champions (`art/SPRITE_SPEC.md`, framing/scale like `art/raw/jorbi/walk.png`): one PNG per animation, horizontal strip of N equal 512x512 square cells,
FLAT PURE MAGENTA #FF00FF background, faces RIGHT, same pixel scale in every frame, feet on the same baseline (~90% of cell height), black outline, hard pixel edges.
Theme: chicken / eggs. Eliud wears a SHORT SPEAR strapped on his back (visible, simple wooden shaft with a steel point) in the base form.

## A) Base form (on foot) -> art/raw/eliud/<anim>.png  (Eliud ~74% of the cell height)
| anim      | frames | description |
|-----------|--------|-------------|
| idle      | 4 | breathing loop, an egg in one hand, spear on the back |
| walk      | 6 | walk cycle |
| run       | 6 | faster run, leaning forward |
| attack    | 5 | basic attack: overhand THROW of an egg forward (wind-up, release, recover) |
| power1    | 6 | "Huevo granada": lifts and hurls a HUGE egg shaped like a grenade (with a little pin/fuse on top) two-handed, lobbing it forward |
| power2    | 6 | "Trampa de huevos": crouches and rolls/places a few small eggs on the ground in front of him |
| power3    | 6 | "Lanza": pulls the spear from his back and throws it forward javelin-style (the last frames show him following through with an empty hand) |
| ult       | 8 | "Paquete": points one arm to the sky, a small crate/package is implied falling (do NOT draw the package), triumphant pose |
| transform | 8 | rage transformation: eyes glow orange, a HUGE chicken (hen) appears out of nowhere behind/under him in a burst of feathers and Eliud is lifted onto its back; last frame he sits on the hen holding a giant lance (use the same hen design as in section B) |
| death     | 6 | falls and lies on the ground, last frame = final pose |

## B) Hen-rider form -> art/raw/eliud_hen/<anim>.png  (same pixel scale as the base form, but the giant hen + rider fills ~92% of the cell height and ~85% of its width)
Design: a gigantic brown-and-cream hen (bigger than Eliud), red comb, orange beak, strong yellow legs with talons, wearing a simple saddle; Eliud rides it holding a GIANT LANCE (long wooden shaft, steel head, small red pennant). The hen faces right. Feet of the hen on the common baseline.
Anims (frames): idle(4: hen breathes, bobs head), walk(6: hen strides, Eliud rocks), run(6: hen sprints, wings half open, lance level), attack(5: LANCE THRUST forward, the hen lunges with a peck/step), power1(6: Eliud lobs the huge grenade-egg from the saddle), power2(6: hen lays several small eggs behind/in front while Eliud points), power3(6: Eliud hurls the lance javelin-style; hen flaps), ult(8: hen flaps wings and cackles, Eliud points at the sky), death(6: hen collapses in a cloud of feathers, Eliud thrown off, last frame = both lying on the ground).

## C) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- eliud_p1.png  a giant egg shaped like a grenade with a pin
- eliud_p2.png  a cluster of small eggs lying on the ground with tiny spikes
- eliud_p3.png  a spear stuck in the ground with a feather
- eliud_ult.png a wooden crate with a parachute/gift ribbon falling from the sky

## D) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of the image, pixel art, 3/4 view)
- egg.png          a normal white/cream egg, slightly tilted (basic attack projectile)
- egg_grenade.png  a huge egg shaped like a grenade (pin and lever on top), glossy cream with an orange band
- egg_trap.png     a small egg lying on the ground with tiny spikes/pressure mark (placed trap)
- spear.png        the spear/lance lying horizontally, pointing RIGHT (flying projectile), small red pennant
- spear_stuck.png  the same spear stuck diagonally into the ground at an angle with a small dirt crack (pickup)
- package.png      a closed wooden crate/gift package with a ribbon and a question mark
- package_open.png the same package opened with the lid flipped open and a golden glow coming out
