# Sprite sheet spec (Codex = visual work)

Game: 2D side-view pixel-art MOBA-brawler (Street Fighter look, single horizontal lane).
Reference characters (keep face, outfit, colors, proportions, pixel-art style EXACTLY):
- `art/ref/leandro.png`  -> Leandro (AI mage, glasses, grey sweater)
- `art/ref/xeviche.png`  -> Xeviche (cybersecurity tank, brown shirt, blue jeans)

## Output format (strict, a script slices them)
- One PNG per animation: `art/raw/<char>/<anim>.png`
- Horizontal strip: N frames side by side, every frame an identical square cell (e.g. N*512 x 512 px).
- Background: FLAT PURE MAGENTA #FF00FF everywhere, no gradients, no shadows, no ground line. (we chroma-key it)
- Character faces RIGHT (side view, 3/4 like the reference), same pixel size/scale in every frame, centered in cell,
  feet on the same baseline (~90% of cell height) in every frame. Nothing may cross the cell border.
- Pixel art only: hard edges, no anti-aliasing blur, same limited palette as the reference, black outline like the reference.
- Effects (projectiles, auras, cacti, tyres, bots) are NOT drawn in the character sheet except small body-attached cast glow;
  they are separate assets.

## Animations and frame counts
| file       | frames | description |
|------------|--------|-------------|
| idle       | 4  | breathing loop |
| walk       | 6  | walk cycle loop |
| run        | 6  | faster run cycle, leaning forward, loop |
| attack     | 5  | basic attack (see per-character) |
| power1     | 6  | skill 1 cast |
| power2     | 6  | skill 2 cast |
| power3     | 6  | skill 3 cast |
| ult        | 8  | ultimate cast, most dramatic |
| death      | 6  | falls and lies on the ground, last frame = final pose |

## Leandro (AI mage, ranged, fragile)
- attack: flicks hand/phone forward shooting a small AI "prompt" projectile (text-bubble) — hand extended in last frames.
- power1 "Fiebre de cactus": slams palm down on the ground, summoning cacti around him.
- power2 "Lanzamiento de contrato": throws a rolled-up cursed contract forward (overhand throw).
- power3 "4 Cauchos": plants a stack of tyres in front of him, both hands pushing forward.
- ult "IA voy": raises both arms, summons a swarm of bots, holographic glow.

## Xeviche (cybersecurity tank, melee, big)
- attack: heavy punch (right fist forward).
- power1 "Lanzamiento de lego": two-handed overhead throw of a giant lego brick.
- power2 "Arepa reina pepiada": eats a huge arepa with both hands (healing), chewing.
- power3 "Setup" (passive buff): adjusts a headset/monitor/keyboard setup, short celebratory "equip" pose.
- ult "Temblor": jumps and slams both fists/body into the ground (ground-pound).
