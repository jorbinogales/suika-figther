# Bosses of the MOBA (Codex): beast, captain, giant robot + their camps / war zone decor

Same rules as art/UNITS_ANIM_SPEC.md and art/SPRITE_SPEC.md: one PNG per animation, horizontal strip of equal SQUARE 512x512 cells,
FLAT PURE MAGENTA #FF00FF background, pixel art, hard edges, black outline, facing RIGHT, same pixel scale + baseline (feet at ~90% of cell height)
in every frame of a unit. Everything is top-down 3/4 view like the existing units (art/raw/minion_red_auto/*).
Folders: art/raw/<unit>/<anim>.png. Tell me when each group is ready (I pack them with tools/process_sprites.py).

## 1) boss_beast — gigantic FUR BEAST (slow, huge: fill ~92% of the cell height). Brown-grey shaggy fur, long arms, small angry eyes, tusks. Neutral monster.
| anim  | frames | description |
|-------|--------|-------------|
| idle  | 4 | heavy breathing, shoulders rising, arms hanging |
| walk  | 6 | slow lumbering walk (knuckles nearly touching the ground) |
| attack| 6 | A1 "golpe": raises ONE fist high and punches the ground in front of him (impact on frames 4-5) |
| shake | 7 | A2 "sacudida": raises BOTH arms overhead, slams both fists into the ground, ground shakes (impact on frames 5-6) |
| roar  | 6 | A3 "grito": throws head back, huge open mouth, chest out, shock lines around the head |
| death | 7 | collapses on his side, last frame = lying on the ground |

## 2) boss_captain — military CAPTAIN (regular size: ~74% of the cell height, like the soldiers). Khaki/desert uniform, peaked cap with a gold badge, medals, pistol/radio. NOT blue (he is neutral).
| anim  | frames | description |
|-------|--------|-------------|
| idle  | 4 | stands at attention, hand on belt |
| walk  | 6 | marching walk |
| attack| 5 | pistol / baton basic attack |
| missiles | 6 | A1 "lluvia de misiles": raises the radio to the mouth and points at the sky with the other arm, shouting |
| summon | 5 | A2 "refuerzos": blows a whistle / raises a flag, arm waving forward |
| heal  | 6 | A3 "curarse": takes out a medkit / injects himself, green cross glow |
| death | 6 | hit, staggers, falls, last frame = lying on the ground, cap beside him |

## 2b) camp soldiers (neutral, same size as the blue minions, khaki/desert colours so they are NOT confused with blue or red): camp_soldier_melee (knife + shield), camp_soldier_rifle (rifle)
Each: walk 6, attack 5, death 6 (same rules as art/UNITS_ANIM_SPEC.md minions). Also art/raw/objects/camp_soldier_melee.png + camp_soldier_rifle.png (static, 512x512, one subject).

## 3) boss_robot — GIANT WAR ROBOT, it NEVER MOVES (fill ~92% of the cell height, very wide). Dark steel + rust, two flamethrower arms, shoulder/chest machine guns, huge stomping legs, glowing red eye.
| anim  | frames | description |
|-------|--------|-------------|
| idle  | 4 | stands, vents steaming, eye glowing, slight hum shake |
| flame | 6 | LOOP: both arms pointing forward (right) spitting a flame jet (flame in the strip, long, ~60% of the cell width extra; keep the robot on the left of the cell) |
| mg    | 6 | LOOP: shoulder machine guns firing, muzzle flashes, shell casings (no bullets drawn; the game draws the shots) |
| stomp | 7 | lifts one huge leg and stomps the ground, shockwave/dust ring on frames 5-7 |
| death | 8 | explodes in stages, last frame = burning wreck (low profile) |

## 4) Objects -> art/raw/objects/ (512x512, magenta bg, ONE subject centered ~60% of the image, pixel art)
- boss_plane.png   a cargo transport PLANE seen from above/3-4 view, flying to the right, with a steel cable / hook hanging below its belly
- boss_missile.png a missile falling nose-down toward the viewer (captain's missile rain) with a short flame/smoke tail
- war_wall.png     a section of ragged STONE WALL (grey-brown boulders and rubble stacked), ~horizontal, to be placed in a ring; low profile, sits on the baseline
- war_crater.png   a scorched impact crater with cracked ground and a little smoke (flat on the ground, top-down)
- war_deadtree.png a leafless DEAD / burnt tree (same scale as art/raw/objects tree sprites; dry grey-brown trunk and bare branches)
- war_barbed.png   a short piece of barbed wire fence with posts
- war_rubble.png   a small pile of rubble and scrap metal
- lair_nest.png    a giant nest made of broken tree trunks, branches and fur for the beast (wide)
- lair_bones.png   a pile of big animal bones with a skull
- lair_fur.png     tufts of grey-brown fur stuck on a broken log
- camp_tent.png    a khaki military tent
- camp_sandbags.png a curved wall of sandbags
- camp_crates.png  a stack of wooden ammo crates + a barrel
- camp_flag.png    a tall pole with a khaki/olive military flag (a captain's emblem: gold star)

## 5) Icons 128x128 (flat magenta bg, one centered icon, pixel art, same style as art/raw/icons/*.png) -> art/raw/icons/
- boss_beast.png (angry furry beast face), boss_captain.png (officer with peaked cap), boss_robot.png (giant robot head with a red eye)
- buff_purple.png  a glowing purple crystal / AI chip     (AI damage buff)
- buff_red.png     a glowing red crystal / fist emblem    (physical damage buff)
- buff_green.png   a glowing green crystal / heart + drop (health + mana buff)
- buff_yellow.png  a glowing golden crystal / shield      (resistances + shield buff)
