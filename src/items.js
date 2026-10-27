// Item catalogue with crafting. Level 1 = basic components (bought directly); a crafted item is made from 2 components (basic or crafted):
// level = 1 + the highest component level, up to MAX_LEVEL 3. Stats are derived from the recipe, so a hybrid item (AI power + health) is simply
// the sum of its components (+15 %). Buying a crafted item consumes the components you already carry and only charges the missing parts + a fee.
// Stat fields: atk, ap, armor, mr, hp, mana (flat) · speed, aspd, lifesteal, cdr (fractions) · hpRegen, manaRegen (per second)
export const CATS = { ad: 'Ataque físico', ap: 'Poder de IA', arm: 'Defensa física', mr: 'Defensa de IA', hp: 'Vida', util: 'Utilidad', rec: 'Recuperación' };
export const CAT_COL = { ad: '#ff9a6a', ap: '#c77dff', arm: '#f2c14e', mr: '#7ee0ff', hp: '#5dff8a', util: '#ffd23f', rec: '#ff7ab8' };
export const SLOTS = 6, MAX_LEVEL = 3, CRAFT_BONUS = 1.15, FEE = [0, 50, 100];

const defs = [];
const B = (id, name, cat, cost, desc, stats = {}, extra = {}) => defs.push({ id, name, cat, cost, desc, stats, ...extra });
const C = (id, name, cat, recipe, desc, extra = {}) => defs.push({ id, name, cat, recipe, desc, ...extra });

// ---- level 1: basic components ----
B('b_pesa', 'Pesa de gimnasio', 'ad', 160, 'Un poco de fuerza.', { atk: 8 });
B('b_cafe', 'Café expreso', 'ad', 180, 'Ataca más rápido.', { aspd: 0.08 });
B('b_colmillo', 'Colmillo', 'ad', 200, 'Roba un poco de vida.', { lifesteal: 0.04 });
B('b_chip', 'Chip de memoria', 'ap', 170, 'Un poco de poder de IA.', { ap: 12 });
B('b_pila', 'Pila de maná', 'ap', 150, 'Más maná.', { mana: 80 });
B('b_cargador', 'Cargador', 'ap', 140, 'Regenera maná.', { manaRegen: 1.5 });
B('b_placa', 'Placa de acero', 'arm', 150, 'Armadura básica.', { armor: 10 });
B('b_filtro', 'Filtro de señal', 'mr', 150, 'Resistencia de IA básica.', { mr: 10 });
B('b_vial', 'Vial de vitalidad', 'hp', 160, 'Más vida.', { hp: 100 });
B('b_botiquin', 'Botiquín', 'hp', 140, 'Regenera vida.', { hpRegen: 2 });
B('b_zapas', 'Zapatillas', 'util', 150, 'Más velocidad.', { speed: 0.04 });
B('b_reloj', 'Reloj de arena', 'util', 180, 'Poderes más rápidos.', { cdr: 0.04 });
B('pocion_vida_peq', 'Poción de vida pequeña', 'rec', 90, 'Consumible: cura vida en 5 s.', {}, { consumable: { hp: 130, time: 5, charges: 3 } });
B('pocion_mana_peq', 'Poción de maná pequeña', 'rec', 90, 'Consumible: devuelve maná.', {}, { consumable: { mana: 110, time: 3, charges: 3 } });

// ---- level 2: two components ----
C('teclado_mecanico', 'Teclado mecánico', 'ad', ['b_pesa', 'b_pesa'], 'Teclas que golpean fuerte.');
C('guantes_tacticos', 'Guantes tácticos', 'ad', ['b_pesa', 'b_cafe'], 'Más daño y golpes más rápidos.');
C('navaja_suiza', 'Navaja suiza', 'ad', ['b_pesa', 'b_colmillo'], 'Roba vida con tus ataques.');
C('mancuerna_codigo', 'Mancuerna de código', 'ad', ['b_pesa', 'b_vial'], 'Fuerza y resistencia.');
C('cadena_bici', 'Cadena de bicicleta', 'ad', ['b_pesa', 'b_zapas'], 'Ataque y velocidad.');
C('martillo_debug', 'Martillo de debug', 'ad', ['b_pesa', 'b_reloj'], 'Daño y poderes más rápidos.');
C('pantalla_holo', 'Pantalla holográfica', 'ap', ['b_chip', 'b_chip'], 'Proyecta poder de IA.');
C('memoria_ram', 'Memoria RAM', 'ap', ['b_chip', 'b_pila'], 'Poder de IA y maná.');
C('cable_fibra', 'Cable de fibra', 'ap', ['b_chip', 'b_cargador'], 'Poder y regeneración de maná.');
C('libro_algoritmos', 'Libro de algoritmos', 'ap', ['b_chip', 'b_reloj'], 'Poder y recarga de poderes.');
C('bot_prompts', 'Bot de prompts', 'ap', ['b_chip', 'b_cafe'], 'Poder y velocidad de ataque.');
C('casco_seguridad', 'Casco de seguridad', 'arm', ['b_placa', 'b_placa'], 'Protege contra golpes.');
C('escudo_firewall', 'Escudo de firewall', 'arm', ['b_placa', 'b_vial'], 'Armadura y vida.');
C('botas_reforzadas', 'Botas reforzadas', 'arm', ['b_placa', 'b_zapas'], 'Armadura y velocidad.');
C('rodilleras_pro', 'Rodilleras pro', 'arm', ['b_placa', 'b_botiquin'], 'Armadura y regeneración.');
C('antivirus_portatil', 'Antivirus portátil', 'mr', ['b_filtro', 'b_filtro'], 'Resiste daño de IA.');
C('escudo_antimalware', 'Escudo antimalware', 'mr', ['b_filtro', 'b_vial'], 'Resistencia y vida.');
C('capa_cifrado', 'Capa de cifrado', 'mr', ['b_filtro', 'b_zapas'], 'Resistencia y velocidad.');
C('amuleto_logico', 'Amuleto lógico', 'mr', ['b_filtro', 'b_chip'], 'Resistencia y poder de IA.');
C('bateria_extendida', 'Batería extendida', 'hp', ['b_vial', 'b_vial'], 'Más vida.');
C('proteina_extra', 'Proteína extra', 'hp', ['b_vial', 'b_botiquin'], 'Vida y regeneración.');
C('sistema_raid', 'Sistema RAID', 'hp', ['b_vial', 'b_placa'], 'Vida y armadura.');
C('anillo_vitalidad', 'Anillo de vitalidad', 'hp', ['b_vial', 'b_filtro'], 'Vida y resistencia mágica.');
C('botas_turbo', 'Botas turbo', 'util', ['b_zapas', 'b_zapas'], 'Más velocidad.');
C('termo_cafe', 'Termo de café', 'util', ['b_reloj', 'b_cargador'], 'Recarga y maná.');
C('mortero_portatil', 'Mortero portátil', 'util', ['b_pesa', 'b_chip'], 'Activo: despliega un mortero que bombardea desde lejos.', { active: { type: 'mortar', cd: 45, life: 14 } });
C('maletin_soldados', 'Maletín de soldados', 'util', ['b_vial', 'b_placa'], 'Activo: invoca 2 soldados que te siguen.', { active: { type: 'soldiers', cd: 60, life: 18 } });
C('escudo_emergencia', 'Escudo de emergencia', 'util', ['b_placa', 'b_filtro'], 'Activo: te da un escudo temporal.', { active: { type: 'shield', cd: 40, time: 5 } });
C('sprint_energia', 'Sprint de energía', 'util', ['b_zapas', 'b_cafe'], 'Activo: gran velocidad por unos segundos.', { active: { type: 'sprint', cd: 30, time: 3 } });
C('bomba_humo', 'Bomba de humo', 'util', ['b_filtro', 'b_zapas'], 'Activo: ralentiza a los enemigos cercanos.', { active: { type: 'smoke', cd: 35, time: 3 } });
C('teleport_base', 'Teleport a la base', 'util', ['b_reloj', 'b_zapas'], 'Activo: te teletransporta a tu base tras 4 s sin recibir daño.', { active: { type: 'recall', cd: 60 } });
C('pocion_vida_gde', 'Poción de vida grande', 'rec', ['pocion_vida_peq', 'b_vial'], 'Consumible: cura mucha vida en 5 s.', { consumable: { hp: 300, time: 5, charges: 3 } });
C('pocion_mana_gde', 'Poción de maná grande', 'rec', ['pocion_mana_peq', 'b_pila'], 'Consumible: devuelve mucho maná.', { consumable: { mana: 240, time: 3, charges: 3 } });
C('barra_energetica', 'Barra energética', 'rec', ['pocion_vida_peq', 'pocion_mana_peq'], 'Consumible: vida y maná al instante.', { consumable: { hp: 90, mana: 70, time: 0.5, charges: 3 } });
C('antidoto', 'Antídoto', 'rec', ['b_botiquin', 'b_filtro'], 'Consumible: quita aturdimiento, silencio, ralentización y veneno, y cura un poco.', { consumable: { hp: 70, time: 1, charges: 3, cleanse: true } });

// ---- level 3: components that are themselves crafted ----
C('punio_acero', 'Puño de acero', 'ad', ['teclado_mecanico', 'guantes_tacticos'], 'Un golpe devastador.');
C('bate_servidor', 'Bate de servidor', 'ad', ['teclado_mecanico', 'martillo_debug'], 'Pesado y letal.');
C('tarjeta_grafica', 'Tarjeta gráfica', 'ap', ['pantalla_holo', 'memoria_ram'], 'Gráficos y poder.');
C('procesador_cuantico', 'Procesador cuántico', 'ap', ['pantalla_holo', 'libro_algoritmos'], 'Cálculo extremo.');
C('nucleo_ia', 'Núcleo de IA', 'ap', ['libro_algoritmos', 'cable_fibra'], 'El corazón de una IA.');
C('chaleco_antibalas', 'Chaleco antibalas', 'arm', ['casco_seguridad', 'escudo_firewall'], 'Armadura sólida.');
C('armadura_rack', 'Armadura de rack', 'arm', ['casco_seguridad', 'rodilleras_pro'], 'Un rack entero encima.');
C('filtro_spam', 'Filtro de spam', 'mr', ['antivirus_portatil', 'escudo_antimalware'], 'Bloquea hechizos.');
C('firewall_magico', 'Firewall mágico', 'mr', ['antivirus_portatil', 'amuleto_logico'], 'Muro contra la IA.');
C('servidor_redundante', 'Servidor redundante', 'hp', ['bateria_extendida', 'sistema_raid'], 'Mucha vida.');
C('corazon_silicio', 'Corazón de silicio', 'hp', ['bateria_extendida', 'proteina_extra'], 'Un corazón de chips.');
C('dron_combate', 'Dron de combate', 'util', ['bot_prompts', 'cable_fibra'], 'Activo: un dron te acompaña y dispara.', { active: { type: 'drone', cd: 50, life: 18 } });
C('elixir_mixto', 'Elixir mixto', 'rec', ['pocion_vida_gde', 'pocion_mana_gde'], 'Consumible: vida y maná en 4 s.', { consumable: { hp: 190, mana: 150, time: 4, charges: 3 } });

export const ITEMS = [], ITEM_BY_ID = {};
for (const d of defs) {
  const it = { ...d };
  if (it.recipe) {
    const cs = it.recipe.map(r => { if (!ITEM_BY_ID[r]) throw new Error(`recipe of ${it.id}: unknown component ${r}`); return ITEM_BY_ID[r]; });
    it.lvl = 1 + Math.max(...cs.map(c => c.lvl)); if (it.lvl > MAX_LEVEL) throw new Error(`${it.id} exceeds ${MAX_LEVEL} crafting levels`);
    it.fee = FEE[it.lvl - 1]; it.cost = cs.reduce((a, c) => a + c.cost, 0) + it.fee;
    it.stats = {};
    if (!it.consumable) for (const c of cs) for (const k in c.stats) it.stats[k] = (it.stats[k] || 0) + c.stats[k];
    for (const k in it.stats) it.stats[k] = Math.round(it.stats[k] * CRAFT_BONUS * 100) / 100;
  } else it.lvl = 1;
  ITEMS.push(it); ITEM_BY_ID[it.id] = it;
}
export const sellValue = item => Math.round(item.cost * 0.5);
export const STAT_LABEL = { atk: 'Ataque físico', ap: 'Poder de IA', armor: 'Armadura', mr: 'Res. mágica', hp: 'Vida', mana: 'Maná', speed: 'Velocidad', aspd: 'Vel. de ataque', lifesteal: 'Robo de vida', cdr: 'Recarga de poderes', hpRegen: 'Regen. vida/s', manaRegen: 'Regen. maná/s' };
export const fmtStat = (k, v) => (['speed', 'aspd', 'lifesteal', 'cdr'].includes(k) ? `+${Math.round(v * 100)}%` : `+${Math.round(v * 10) / 10}`);

// What buying `id` costs with the inventory `inv` (slots {id, cd, charges}): components already owned are consumed, missing ones are bought.
// -> { ok, gold, use: [slot indexes consumed], topUp: slot (consumable stack refill), reason }
export function buyPlan(inv, id) {
  const it = ITEM_BY_ID[id]; if (!it) return { ok: false, gold: 0, use: [], reason: 'No existe' };
  if (it.consumable) { const i = inv.findIndex(s => s && s.id === id && s.charges < it.consumable.charges); if (i >= 0) return { ok: true, gold: it.cost, use: [], topUp: i }; }
  const use = new Set(); let gold = 0;
  const need = cid => {
    const i = inv.findIndex((s, k) => s && s.id === cid && !use.has(k)); if (i >= 0) { use.add(i); return; }
    const c = ITEM_BY_ID[cid]; if (c.recipe) { c.recipe.forEach(need); gold += c.fee; } else gold += c.cost;
  };
  if (it.recipe) { it.recipe.forEach(need); gold += it.fee; } else gold = it.cost;
  const free = inv.filter(s => !s).length + use.size;
  return { ok: free > 0, gold, use: [...use], reason: free > 0 ? null : 'INVENTARIO LLENO' };
}
// recipe tree for the shop: { id, owned, children } — `owned` nodes consume a slot of the inventory (their subtree is not expanded)
export function recipeTree(inv, id) {
  const use = new Set(), node = (cid, root) => {
    if (!root) { const i = inv.findIndex((s, k) => s && s.id === cid && !use.has(k)); if (i >= 0) { use.add(i); return { id: cid, owned: true, children: [] }; } }
    const c = ITEM_BY_ID[cid]; return { id: cid, owned: false, children: (c.recipe || []).map(r => node(r, false)) };
  };
  return node(id, true);
}
// the part of an item's recipe that can be bought next with `gold` (AI helper): returns an item id or null
export function nextAffordable(inv, id, gold) {
  const t = recipeTree(inv, id), walk = n => { for (const c of n.children) { if (c.owned) continue; if (buyPlan(inv, c.id).gold <= gold && buyPlan(inv, c.id).ok) return c.id; const d = walk(c); if (d) return d; } return null; };
  return walk(t);
}
