# Unit animation spec (Codex): minion walk/attack + tower aim sprites

Use the SAME rules as the champion strips (see art/SPRITE_SPEC.md): one PNG per animation, a horizontal strip of N equal SQUARE
512x512 cells, FLAT PURE MAGENTA #FF00FF background everywhere (no ground/shadow), pixel art with hard edges and black outline,
same character design/colors/scale in every frame as the reference static art `art/raw/objects/<unit>.png`
(look at each reference before drawing). Units face RIGHT (the game flips them). Same pixel scale in all frames of a strip,
horizontally centered in each cell, feet/tracks on the same baseline (~90% of cell height), nothing crosses a cell border.
Infantry/robots stand ~74% of the cell height (like the champion sheets). The tank is wide: its width may use up to ~90%
of the cell width (so it will be short). The towers stand ~74% of cell height.

## Minions (6 units) -> art/raw/<unit>/walk.png (6 frames) and art/raw/<unit>/attack.png (5 frames)
Units: minion_blue_melee (soldier w/ knife + riot shield), minion_blue_ranged (soldier w/ rifle), minion_blue_tank (military tank),
minion_red_melee (blade robot), minion_red_ranged (blaster robot), minion_red_auto (big automaton robot).
- walk: loop. Infantry/robots: marching walk cycle. Tank: tracks roll, slight body rock, small dust optional.
- attack (5 frames): melee = slash/stab/shield-bash swing (automaton = heavy two-fist smash); ranged = aim and shoot (muzzle flash on frames 3-4);
  tank = turret recoil with muzzle flash on frame 2-3.

## Towers (2 units) -> art/raw/tower_blue/aim.png and art/raw/tower_red/aim.png — 8 frames, 512x512 cells
Not an animation over time: the 8 frames are the SAME tower with its turret/cannon/eye ROTATED to aim in 8 compass directions on screen
(3/4 top-down-ish view like the reference), in this exact frame order, clockwise starting at east:
1 E (right), 2 SE (down-right), 3 S (toward the viewer/down), 4 SW (down-left), 5 W (left), 6 NW (up-left), 7 N (away/up), 8 NE (up-right).
The base/structure stays identical in all frames; only the weapon turret/barrel (or red eye-cannon) rotates, barrel clearly pointing
that way, ready-to-fire pose, no muzzle flash (the game adds it). Tower is not mirrored: draw all 8 explicitly.

## Tower destruction (2 towers) -> art/raw/<tower>/destroy.png (6 frames) and art/raw/<tower>/rubble.png (1 frame)
Same rules (512x512 cells, magenta background, same pixel scale/baseline as the tower aim frames, design of the reference tower).
- destroy.png (6 frames, plays once when the tower's HP reaches 0): 1 cracks + sparks/smoke, 2 explosion flash with fire,
  3 big blast with debris flying out, 4 structure collapsing, 5 dust/smoke cloud over falling pieces, 6 collapse finished: the
  leftover rubble pile with a little smoke. Blue tower = concrete, sandbags, steel; red tower = scrap metal, cables, sparks.
- rubble.png (1 frame, permanent): ONLY a small pile of rubble where the tower stood: debris of its base (broken concrete/sandbags
  or twisted scrap metal), scorched, a few cables; NOTHING standing on top (no turret, no tower body). Same footprint as the tower base,
  low profile, sits on the baseline, no smoke or a tiny wisp.

## Death animations (6 frames each) -> art/raw/<unit>/death.png
Units: minion_blue_melee, minion_blue_ranged, minion_blue_tank, minion_red_melee, minion_red_ranged, minion_red_auto
(same rules/design as their walk/attack strips, 512x512 cells, magenta background, facing right, same scale/baseline).
Plays once when the unit's HP hits 0; the LAST frame is the final pose lying on the ground (it fades out after).
- soldiers (blue melee/ranged): hit reaction, stagger, fall, lying on the ground (weapon/shield dropped nearby).
- tank: hit, explosion, turret blown off / burning, last frame = smoking burning wreck (low profile).
- small robots (red melee/ranged): sparks, short-circuit, body breaks apart, last frame = low pile of scrap with a few sparks.
- automaton (red auto): staggers, red core flickers and cracks, kneels, collapses; last frame = heavy collapsed wreck, dim core.

## Leandro's bots (ult summons) -> art/raw/bot_melee/ and art/raw/bot_ranged/ : walk.png (6), attack.png (5), death.png (6)
Reference static art: art/raw/objects/bot_melee.png and bot_ranged.png (small white/cyan friendly robots). Keep that exact design.
- bot_melee: walk cycle; attack = quick punch/slash with a cyan energy flash; death = short-circuit and fall apart into parts.
- bot_ranged: walk cycle; attack = arm cannon shot with cyan muzzle flash on frames 3-4; death = same style.
