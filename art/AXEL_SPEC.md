# Axel-kun (new champion, class "Soporte") — art spec (Codex)

Reference: `art/ref/axel.png` (slender, warm-brown skin, short black hair, big smile, maroon t-shirt, dark grey pants, dark sneakers).
Keep face/outfit/colors/proportions EXACTLY. Same format as the other champions (`art/SPRITE_SPEC.md`, see `art/raw/jorbi/walk.png`
for framing): one PNG per animation, horizontal strip of N equal 512x512 cells, FLAT PURE MAGENTA #FF00FF background,
faces RIGHT, same pixel scale in every frame, feet on the same baseline (~90% of cell height), ~74% of cell height tall,
black outline, hard pixel edges. Axel is a support/hacker-ish nerd who fights from range by throwing laptops.

## A) art/raw/axel/<anim>.png
| anim          | frames | description |
|---------------|--------|-------------|
| idle          | 4 | relaxed breathing loop, cheerful, a white laptop tucked under one arm |
| walk          | 6 | walk cycle (laptop under the arm) |
| run           | 6 | faster run, leaning forward |
| attack        | 5 | basic attack: throws a WHITE laptop forward overhand (wind-up, release with arm extended, recover) |
| power1_virus  | 6 | "Malware": standing STILL, typing on a PURPLE-glowing laptop balanced on one forearm, skull/bug glyph on its screen, ends in a throw of the purple laptop |
| power1_trojan | 6 | same pose/timing but the laptop glows RED/ORANGE with a horse-head glyph; ends in a throw |
| power1_worm   | 6 | same pose/timing but the laptop glows GREEN with a worm glyph; ends in a throw |
| power2        | 6 | "Proveedor humilde": sitting/standing relaxed reading a MANGA book with both hands, content smile, little hearts/plus sparkles (loopable, calm) |
| power3        | 6 | "Regateador hábil": confident haggling pose — rubs thumb and fingers (money gesture), winks, a small gold coin flips up and is caught, a protective cyan sparkle at the end |
| ult           | 8 | "No estoy solo": plants feet, cups both hands around mouth and SHOUTS with a big open mouth, sound waves implied by tense body (the game draws the aura), final pose arms spread |
| death         | 6 | falls and lies on the ground, last frame = final pose (laptop lying nearby) |
(Characters in the 3 malware strips must clearly differ by the laptop glow color and glyph so the player can tell which program it is.)

## B) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- axel_p1.png  a laptop with a skull-and-bug screen, 3 colored glows (purple, red, green) around it
- axel_p2.png  an open manga book with a green healing cross and sparkles
- axel_p3.png  a gold coin with a handshake / bargain tag and a cyan shield sparkle
- axel_ult.png a megaphone-like shout with sound waves and a crowd/heart "friends" symbol

## C) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of the image, pixel art, 3/4 view, slightly tilted as if flying)
- laptop_white.png   closed/open white modern laptop (basic-attack projectile)
- laptop_virus.png   same laptop design but PURPLE glowing, skull-bug on screen
- laptop_trojan.png  same laptop design but RED/ORANGE glowing, trojan-horse on screen
- laptop_worm.png    same laptop design but GREEN glowing, worm on screen
