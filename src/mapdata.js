// Walkability map: three CURVED lanes (top / middle / bottom) joined by the two bases; a river crosses the map and can only be forded where it meets a lane.
// Everything else is dense forest (trees and bushes): impassable, except the camp clearings between the lanes.
export const F = 1.3;   // map scale (all the numbers below were designed for F = 1)
export const WORLD_W = Math.round(5760 * F / 64) * 64, WORLD_H = Math.round(2700 * F / 64) * 64, CELL = 64;
export const GW = Math.ceil(WORLD_W / CELL), GH = Math.ceil(WORLD_H / CELL);
export const LANE_HALF = 200;      // half width of a lane
export const BASE_X = 285 * F, BASE_Y = WORLD_H / 2;
const CX = WORLD_W / 2;
// lane centre lines y(x), mirror-symmetric around the middle of the map (only cosines)
export const laneYAt = (li, x) => { const u = (x - CX) / F; return F * (li === 0 ? 540 + 90 * Math.cos(u / 570) + 33 * Math.cos(u / 210) : li === 1 ? 1350 - 90 * Math.cos(u / 630) - 27 * Math.cos(u / 255) : 2205 - 90 * Math.cos(u / 570) - 33 * Math.cos(u / 210)); };
export const RIVER = { x0: CX - 270 * F, x1: CX + 270 * F, y0: 135 * F, y1: WORLD_H - 135 * F };  // river through the centre of the map (bounds)
export const riverOffset = y => F * (Math.sin(y / (180 * F)) * 51 + Math.sin(y / (80 * F)) * 12);   // smooth meander
// towers per team and lane: [outer, inner] x for the BLUE team (red mirrors them); the inner one is the last tower of the lane and heals allies
export const TOWER_XS = [2300 * F, 1252 * F];   // [outer, inner]
// No neutral camps: their old clearings are now open paths that connect the lanes (x for the BLUE half; red mirrors them)
export const CAMP_SITES = [], CAMPS = [];
export const CONNECTORS = [[0, 1, 1600 * F], [1, 2, 1600 * F]].flatMap(([a, b, x]) => [[a, b, x], [a, b, WORLD_W - x]]);

export const walk = new Uint8Array(GW * GH);
const circle = (cx, cy, r) => {
  for (let j = Math.max(0, Math.floor((cy - r) / CELL)); j <= Math.min(GH - 1, Math.floor((cy + r) / CELL)); j++)
    for (let i = Math.max(0, Math.floor((cx - r) / CELL)); i <= Math.min(GW - 1, Math.floor((cx + r) / CELL)); i++)
      if (Math.hypot(i * CELL + CELL / 2 - cx, j * CELL + CELL / 2 - cy) <= r) walk[j * GW + i] = 1;
};
const poly = pts => {
  for (let n = 1; n < pts.length; n++) {
    const [ax, ay, ar] = pts[n - 1], [bx, by, br] = pts[n], steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 16);
    for (let s = 0; s <= steps; s++) { const t = s / steps; circle(ax + (bx - ax) * t, ay + (by - ay) * t, ar + (br - ar) * t); }
  }
};
for (let li = 0; li < 3; li++) for (let x = 0; x <= WORLD_W; x += 32) circle(x, laneYAt(li, x), LANE_HALF);
for (let y = RIVER.y0; y <= RIVER.y1; y += 16) circle(CX + riverOffset(y), y, 100 * F);   // the shallow river is walkable along its whole length (it joins the lanes)
circle(BASE_X, BASE_Y, 450 * F); circle(WORLD_W - BASE_X, BASE_Y, 450 * F);   // bases
for (const sx of [1, -1]) for (const li of [0, 2]) {   // curved ramps from each base up / down to the outer lanes
  const X = x => sx === 1 ? x : WORLD_W - x, sy = li === 0 ? -1 : 1;
  poly([[X(360 * F), BASE_Y + sy * 240 * F, 170 * F], [X(495 * F), BASE_Y + sy * 495 * F, 170 * F], [X(630 * F), laneYAt(li, 630 * F) - sy * 120 * F, LANE_HALF], [X(960 * F), laneYAt(li, 960 * F), LANE_HALF]]);
}
CONNECTORS.forEach(([a, b, x]) => poly([[x, laneYAt(a, x), 120 * F], [x, (laneYAt(a, x) + laneYAt(b, x)) / 2, 100 * F], [x, laneYAt(b, x), 120 * F]]));   // paths between lanes


// Boss places. Beast lair: a clearing cut into the blue-side forest right next to the river, between the middle and bottom lanes (opens to the river).
// Captain camp mirrors the beast clearing between top and middle on the red side, with an opening to the river.
export const LAIR_BEAST = (() => { const x = CX - 270 * F - 360; return { x, y: (laneYAt(1, x) + laneYAt(2, x)) / 2, r: 300 }; })();
export const CAMP_CAPTAIN = (() => { const x = WORLD_W - LAIR_BEAST.x; return { x, y: (laneYAt(0, x) + laneYAt(1, x)) / 2, r: LAIR_BEAST.r }; })();
export const ARENA_ROBOT = { x: CX, y: WORLD_H / 2, r: 560 };
circle(LAIR_BEAST.x, LAIR_BEAST.y, LAIR_BEAST.r); poly([[LAIR_BEAST.x + 160, LAIR_BEAST.y, 170], [CX + riverOffset(LAIR_BEAST.y) - 80, LAIR_BEAST.y, 130]]);
circle(CAMP_CAPTAIN.x, CAMP_CAPTAIN.y, CAMP_CAPTAIN.r); poly([[CAMP_CAPTAIN.x - 160, CAMP_CAPTAIN.y, 170], [CX + riverOffset(CAMP_CAPTAIN.y) + 80, CAMP_CAPTAIN.y, 130]]);


// Small trails through the forest: narrow, walkable, no trees, drawn with the same grass as the forest floor (not dirt). Each one winds from a lane to the next lane (always with an exit at both ends).
export const grass = new Uint8Array(GW * GH);
const carveGrass = (cx, cy, r) => {
  for (let j = Math.max(0, Math.floor((cy - r) / CELL)); j <= Math.min(GH - 1, Math.floor((cy + r) / CELL)); j++)
    for (let i = Math.max(0, Math.floor((cx - r) / CELL)); i <= Math.min(GW - 1, Math.floor((cx + r) / CELL)); i++)
      if (Math.hypot(i * CELL + CELL / 2 - cx, j * CELL + CELL / 2 - cy) <= r && !walk[j * GW + i]) { walk[j * GW + i] = 1; grass[j * GW + i] = 1; }
};
{
  let k = 0;
  for (const [a, b] of [[0, 1], [1, 2]]) for (const fx of [0.22, 0.36, 0.64, 0.78]) {
    const x0 = fx * WORLD_W, ph = (k++) * 1.7, pts = [];
    for (let t = 0; t <= 1.0001; t += 1 / 40) { const x = x0 + Math.sin(t * Math.PI * 2.2 + ph) * 140 * F * Math.sin(t * Math.PI), ya = laneYAt(a, x) + LANE_HALF - 60, yb = laneYAt(b, x) - LANE_HALF + 60; pts.push([x, ya + (yb - ya) * t]); }
    for (let n = 1; n < pts.length; n++) { const [ax, ay] = pts[n - 1], [bx, by] = pts[n], st = Math.ceil(Math.hypot(bx - ax, by - ay) / 12); for (let q = 0; q <= st; q++) carveGrass(ax + (bx - ax) * q / st, ay + (by - ay) * q / st, 46); }
  }
}

export const cellWalk = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && walk[j * GW + i] === 1;
// Collision uses the same smoothed field that paints the dirt (see world.js buildMap), so you can walk exactly where the ground looks like path
// (the raw cell grid is coarser than the blurred ground and left invisible walls along path edges).
const smooth = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  let t = 0, w = 0;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const wt = 1 / (1 + di * di + dj * dj); t += (cellWalk(i + di, j + dj) ? 1 : 0) * wt; w += wt; }
  smooth[j * GW + i] = t / w;
}
const sm = (i, j) => smooth[Math.max(0, Math.min(GH - 1, j)) * GW + Math.max(0, Math.min(GW - 1, i))];
export const walkField = (x, y) => {
  const gx = x / CELL - 0.5, gy = y / CELL - 0.5, i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  return (sm(i, j) * (1 - fx) + sm(i + 1, j) * fx) * (1 - fy) + (sm(i, j + 1) * (1 - fx) + sm(i + 1, j + 1) * fx) * fy;
};
// walkable where the cell grid says so OR where the ground is painted as path (never blocks anything that used to be open)
export const OPEN = { on: false };   // survival mode: the whole map is open ground (no forest, no lanes)
export const isWalk = (x, y) => OPEN.on ? x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H : x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H && (cellWalk(Math.floor(x / CELL), Math.floor(y / CELL)) || walkField(x, y) >= 0.46);

const smoothG = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  let t = 0, w = 0;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const wt = 1 / (1 + di * di + dj * dj), x = i + di, y = j + dj; t += (x >= 0 && y >= 0 && x < GW && y < GH && grass[y * GW + x] ? 1 : 0) * wt; w += wt; }
  smoothG[j * GW + i] = t / w;
}
const sg = (i, j) => smoothG[Math.max(0, Math.min(GH - 1, j)) * GW + Math.max(0, Math.min(GW - 1, i))];
export const grassField = (x, y) => {
  const gx = x / CELL - 0.5, gy = y / CELL - 0.5, i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  return (sg(i, j) * (1 - fx) + sg(i + 1, j) * fx) * (1 - fy) + (sg(i, j + 1) * (1 - fx) + sg(i + 1, j + 1) * fx) * fy;
};
