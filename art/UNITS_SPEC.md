# Units art spec (Codex): minions and towers

Same pixel-art look as the champions in `art/raw/leandro/*.png` (full-body, black outline, hard pixel edges, no blur, limited
palette, 3/4 side view like the champion sprites). ALL sprites face RIGHT (the game flips them). One subject per image,
FLAT PURE MAGENTA #FF00FF background, nothing else (no ground, no shadow, no text). Canvas 512x512, subject fills ~80% of it,
standing/at rest pose (feet or tracks near the bottom, centered).
Output into art/raw/objects/ :

BLUE team = modern military (blue accent patches/lights):
- minion_blue_melee.png   soldier with helmet, body armor, combat knife / riot shield, ready to melee.
- minion_blue_ranged.png  soldier with helmet holding an assault rifle.
- minion_blue_tank.png    military battle tank, side view (3/4), blue accent markings, turret cannon pointing right. (wide, not tall)

RED team = robots (red glowing eyes/lights):
- minion_red_melee.png    small scrappy robot with blade arms.
- minion_red_ranged.png   small robot with an arm cannon / blaster.
- minion_red_auto.png     big heavy "automaton" robot (bulky, humanoid, glowing red core, clearly larger/menacing than the small robots).

TOWERS (3/4 top-down-ish view, ~1 tile footprint, tall structure, centered):
- tower_blue.png  conventional military gun tower: sandbag/concrete base, mounted heavy cannon/turret, antenna, blue accent flag/light.
- tower_red.png   robot tower: mechanical spire with a big glowing red eye/turret cannon, pistons, cables.
