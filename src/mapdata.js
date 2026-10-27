// Walkability map (ARAM-style): one open middle lane + two winding forest paths (north / south) + the two bases.
// Everything else is dense forest (trees and bushes): impassable.
export const WORLD_W = 3200, WORLD_H = 1500, CELL = 64;
export const GW = Math.ceil(WORLD_W / CELL), GH = Math.ceil(WORLD_H / CELL);
export const MID = { y0: 600, y1: 912 };                      // walkable band of the middle lane
// Camps sit beside the routes; their entrances face the path instead of occupying it.
export const CAMP_SITES = [
  { x: 1010, y: 150, entryX: 1010, entryY: 300 },
  { x: 1650, y: 175, entryX: 1650, entryY: 430 },
  { x: 2300, y: 150, entryX: 2300, entryY: 300 },
  { x: 1110, y: 1070, entryX: 1010, entryY: 1190 },
  { x: 1880, y: 1030, entryX: 1835, entryY: 1150 },
  { x: 2170, y: 1070, entryX: 2300, entryY: 1200 },
];
export const CAMPS = CAMP_SITES.map(({ x, y }) => [x, y]);

// irregular forest paths: [x, y, radius]
const NORTH = [[700, 650, 90], [640, 540, 70], [770, 440, 85], [900, 385, 70], [1010, 300, 78], [1180, 245, 66], [1330, 305, 78], [1470, 395, 68],
  [1650, 430, 78], [1800, 355, 72], [1960, 262, 64], [2120, 248, 82], [2300, 300, 78], [2430, 425, 74], [2575, 520, 70], [2520, 650, 90]];
const SOUTH = [[820, 860, 90], [750, 985, 72], [890, 1085, 82], [1010, 1190, 78], [1175, 1262, 66], [1335, 1205, 80], [1500, 1112, 70],
  [1650, 1070, 78], [1835, 1150, 70], [1990, 1255, 84], [2150, 1285, 64], [2300, 1200, 78], [2405, 1090, 76], [2335, 960, 70], [2450, 870, 90]];

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
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const cy = j * CELL + CELL / 2; if (cy >= MID.y0 && cy <= MID.y1) walk[j * GW + i] = 1; }
circle(190, 756, 270); circle(WORLD_W - 190, 756, 270);   // bases
poly(NORTH); poly(SOUTH);
// A central opening through the lower forest connects the lane to the southern route.
poly([[WORLD_W / 2, MID.y1 - 32, 90], [WORLD_W / 2, 1100, 90]]);
// ...and a matching one through the upper forest toward the northern route.
poly([[WORLD_W / 2, MID.y0 + 32, 90], [WORLD_W / 2, 430, 90]]);
CAMP_SITES.forEach(({ x, y, entryX, entryY }) => {
  poly([[entryX, entryY, 64], [x, y, 64]]);
  circle(x, y, 118);
});


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
export const isWalk = (x, y) => x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H && (cellWalk(Math.floor(x / CELL), Math.floor(y / CELL)) || walkField(x, y) >= 0.46);
