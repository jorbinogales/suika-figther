# Luis (new champion, class "Hacker", melee fist fighter) — art spec (Codex)

Reference: `art/ref/luis.png` (Luis: black hoodie with the hood UP, curly dark hair, glasses, short beard, dark pants, black sneakers). Keep face/outfit/colors/proportions EXACTLY.
Same format as the other champions (`art/SPRITE_SPEC.md`, framing/scale like `art/raw/jorbi/walk.png`): one PNG per animation, a horizontal strip of N equal 512x512 square cells,
FLAT PURE MAGENTA #FF00FF background, faces RIGHT, same pixel scale in every frame, feet on the same baseline (~90% of cell height), ~74% of cell height tall, black outline, hard pixel edges.
Theme accent: neon GREEN code glow (matrix-style) on his effects.

## A) art/raw/luis/<anim>.png
| anim    | frames | description |
|---------|--------|-------------|
| idle    | 4 | breathing loop, hands in the hoodie pocket / loosely at the sides, hood up |
| walk    | 6 | walk cycle |
| run     | 6 | faster run, leaning forward |
| attack  | 5 | basic melee: quick straight PUNCH with the right fist (wind-up, strike, recover) |
| power1  | 6 | "Antivirus": raises one wrist, taps a glowing green wristband, a small holographic green burst appears in front (a robot gets deployed; do NOT draw the robot) |
| power2  | 6 | "Amenaza": pulls the hood lower and crouches into a stealth pose, body fading with green digital glitch/static, last frame very faint/stealthy (still drawn solid; the game applies transparency) |
| power3  | 6 | "Hacker profesional": both hands typing fast on an invisible keyboard in the air, green code symbols orbiting around him, intense focused look |
| ult     | 8 | "Tu programa es mío": extends one arm forward with spread fingers like grabbing/controlling, eyes glowing green, green code tendrils flowing from his hand, final pose arm fully extended |
| death   | 6 | falls and lies on the ground, last frame = final pose |

## B) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- luis_p1.png  small cute-but-tough white/green guard robot with a shield and laser eye
- luis_p2.png  a hooded silhouette half-transparent with glitch/static lines (stealth)
- luis_p3.png  a padlock with a "silenced" crossed-out spell star and green code
- luis_ult.png a hand controlling a puppet cursor / strings of green code over a skull or chip

## C) Luis's Antivirus FLYING DRONES -> art/raw/drone/<anim>.png (distinct design from every other robot in the game)
A small hovering combat drone (NOT humanoid): round white/steel body with a single big glowing green eye/lens, two small rotor/propeller discs or anti-grav thrusters, a tiny laser emitter under the body, green accent lights, a tiny shield plate. Cute but tough. Pixel art, black outline, same rules/format as the champion strips (512x512 cells, magenta #FF00FF background, faces RIGHT, same pixel scale in every frame). The drone body fills ~45% of the cell height and is centered (it floats; no ground, no shadow); keep its hover height the same in all frames except for the bob described.
- idle.png   4 frames: hovering in place, gentle bob up/down, rotors spinning
- walk.png   4 frames: flying forward (leaning slightly forward, rotors blurred-spinning)
- attack.png 4 frames: charges the lens and fires a laser pulse forward (frames 2-3 show the bright green muzzle flash)
- death.png  5 frames: sparks, spins out of control, breaks apart, final frame = small smoking scrap pile on the baseline
