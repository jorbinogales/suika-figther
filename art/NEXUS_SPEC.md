# Nexus art spec (Codex) — the base core each team must defend

Same pixel-art style, canvas rules and magenta background as the towers (`art/raw/tower_blue/aim.png`, `art/UNITS_ANIM_SPEC.md`):
512x512 square cells, FLAT PURE MAGENTA #FF00FF background, black outline, hard pixel edges, 3/4 top-down-ish view like the towers.
The nexus is a BIG structure (clearly larger than a tower) centered in the cell, base on the baseline (~90% of cell height), ~80% of the cell height tall, ~80% of the width.
- BLUE team = modern military: fortified command bunker / HQ with reinforced concrete, sandbags, radar dish + antennas, a glowing blue command core in the middle, blue flag/lights.
- RED team = robots: a mechanical fortress/factory with a huge glowing red reactor core, pistons, cables, spikes, red lights.

## Per nexus -> art/raw/<nexus_blue|nexus_red>/
- idle.png    1 frame (a single 512x512 cell): the intact nexus.
- destroy.png 8 frames (8 cells in one row, 4096x512): collapse sequence: 1 cracks + sparks, 2 core overloads (bright flash), 3 first explosion, 4 big blast with debris flying, 5 structure collapsing, 6 huge fireball/smoke cloud, 7 dust settling over the ruins, 8 final ruins with a little smoke.
- rubble.png  1 frame: permanent ruins of the nexus base (a low heap of rubble where it stood, scorched, nothing standing on top; same footprint as the nexus).
