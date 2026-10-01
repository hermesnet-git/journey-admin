// Roteamento das linhas do canvas em ângulo reto, desviando das etapas. Cada linha tem uma ou mais
// portas de saída e de chegada possíveis (lado da etapa + direção) e o caminho mais curto numa grade,
// com custo extra a cada curva, escolhe a porta. Linha para a frente sai pela direita e chega pela
// esquerda; linha de volta (laço) também pode sair e chegar por cima ou por baixo, como um desenho à
// mão faria. Recalculado quando o fluxo para de mudar (depois de arrastar, organizar ou ligar etapas).

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };
export type Dir = 'E' | 'S' | 'W' | 'N';
// Saída: dir = sentido em que a linha deixa a etapa. Chegada: dir = sentido em que a linha entra nela.
export interface Port {
  pt: Pt;
  dir: Dir;
  cost?: number;
}
export interface RouteRequest {
  id: string;
  // Linha de volta (laço): o rótulo vai no trecho mais longo, o que contorna o fluxo.
  loop?: boolean;
  starts: Port[];
  ends: Port[];
  // Pontos de conexão padrão (direita da origem, esquerda do destino): servem pra saber se a rota
  // ainda vale para a posição atual das etapas.
  anchorStart: Pt;
  anchorEnd: Pt;
}
export interface EdgeRoute {
  points: Pt[];
  loop?: boolean;
  anchorStart: Pt;
  anchorEnd: Pt;
}

const CELL = 10;
const PAD = 16; // folga em volta de cada etapa
const STUB = 24; // trecho reto obrigatório na saída e na chegada
const TURN_COST = 6;
// Passar por uma célula onde outra linha já passou (cruzar ou correr junto): caro, para os laços
// contornarem o fluxo por fora em vez de atravessar as linhas principais.
const CROSS_COST = 80;
const MARGIN = 200;
const MAX_EXPANSIONS = 300_000;
const DIRS: Dir[] = ['E', 'S', 'W', 'N'];
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const dirIndex = (d: Dir) => DIRS.indexOf(d);
const horizontal = (d: Dir) => d === 'E' || d === 'W';

class MinHeap {
  private keys: number[] = [];
  private values: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(key: number, value: number) {
    const k = this.keys;
    const v = this.values;
    k.push(key);
    v.push(value);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): number {
    const k = this.keys;
    const v = this.values;
    const top = v[0];
    const lastK = k.pop()!;
    const lastV = v.pop()!;
    if (k.length > 0) {
      k[0] = lastK;
      v[0] = lastV;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

export function routeEdges(requests: RouteRequest[], obstacles: Box[]): Map<string, EdgeRoute> {
  const routes = new Map<string, EdgeRoute>();
  if (requests.length === 0) return routes;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const extend = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  obstacles.forEach((b) => {
    extend(b.x, b.y);
    extend(b.x + b.width, b.y + b.height);
  });
  requests.forEach((r) => [...r.starts, ...r.ends].forEach((p) => extend(p.pt.x, p.pt.y)));
  minX -= MARGIN;
  minY -= MARGIN;
  maxX += MARGIN;
  maxY += MARGIN;
  const cols = Math.ceil((maxX - minX) / CELL) + 1;
  const rows = Math.ceil((maxY - minY) / CELL) + 1;
  const cells = cols * rows;

  const blocked = new Uint8Array(cells);
  obstacles.forEach((b) => {
    const x0 = Math.max(0, Math.ceil((b.x - PAD - minX) / CELL));
    const x1 = Math.min(cols - 1, Math.floor((b.x + b.width + PAD - minX) / CELL));
    const y0 = Math.max(0, Math.ceil((b.y - PAD - minY) / CELL));
    const y1 = Math.min(rows - 1, Math.floor((b.y + b.height + PAD - minY) / CELL));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
  });

  const cellOf = (p: Pt) => ({
    cx: Math.min(cols - 1, Math.max(0, Math.round((p.x - minX) / CELL))),
    cy: Math.min(rows - 1, Math.max(0, Math.round((p.y - minY) / CELL))),
  });
  // A área da própria etapa (folga e nome embaixo) pode engolir a ponta: segue reto um pouco até achar
  // célula livre. Se continuar bloqueado depois disso, a porta dá de cara com outra etapa — não serve
  // (seguir reto mais longe atravessaria essa etapa).
  const freeAlong = (p: Pt, d: number): { cx: number; cy: number } | null => {
    let c = cellOf(p);
    for (let i = 0; i < 8 && blocked[c.cy * cols + c.cx]; i++) {
      const nx = c.cx + DX[d];
      const ny = c.cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
      c = { cx: nx, cy: ny };
    }
    return blocked[c.cy * cols + c.cx] ? null : c;
  };
  // Células já ocupadas por linhas traçadas antes (a ordem dos pedidos importa: para a frente primeiro).
  const used = new Uint8Array(cells);
  const markUsed = (points: Pt[]) => {
    for (let i = 1; i < points.length; i++) {
      const a = cellOf(points[i - 1]);
      const b = cellOf(points[i]);
      const steps = Math.max(Math.abs(b.cx - a.cx), Math.abs(b.cy - a.cy));
      for (let k = 0; k <= steps; k++) {
        const cx = a.cx + Math.sign(b.cx - a.cx) * k;
        const cy = a.cy + Math.sign(b.cy - a.cy) * k;
        used[cy * cols + cx] = 1;
      }
    }
  };
  const isFree = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < cols && cy < rows && !blocked[cy * cols + cx];
  // Vira cedo: quando a linha termina em "reto → desce/sobe → reto até o destino", a descida vai para
  // perto da origem (se o caminho estiver livre), deixando um trecho final longo onde o rótulo cabe.
  const turnEarly = (points: Pt[]): Pt[] => {
    const n = points.length;
    if (n < 4) return points;
    const p0 = points[n - 4];
    const p1 = points[n - 3];
    const p2 = points[n - 2];
    const p3 = points[n - 1];
    const goingRight = p0.y === p1.y && p1.x === p2.x && p2.y === p3.y && p1.x > p0.x && p3.x > p2.x;
    if (!goingRight) return points;
    const yTop = Math.min(p1.y, p2.y);
    const yBottom = Math.max(p1.y, p2.y);
    for (let x = p0.x + STUB; x < p1.x; x += CELL) {
      const c = cellOf({ x, y: yTop });
      const end = cellOf({ x, y: yBottom });
      let free = true;
      for (let cy = c.cy; cy <= end.cy && free; cy++) free = isFree(c.cx, cy) && !used[cy * cols + c.cx];
      const row = cellOf({ x: p1.x, y: p2.y });
      for (let cx = c.cx; cx <= row.cx && free; cx++) free = isFree(cx, row.cy);
      if (free) {
        return simplify([...points.slice(0, n - 3), { x, y: p1.y }, { x, y: p2.y }, p3]);
      }
    }
    return points;
  };
  const g = new Float64Array(cells * 4);
  const came = new Int32Array(cells * 4);

  for (const req of requests) {
    g.fill(Infinity);
    came.fill(-1);
    const heap = new MinHeap();
    // Saídas: cada porta começa depois do seu trecho reto, já andando no seu sentido.
    const startPortByState = new Map<number, Port>();
    req.starts.forEach((port) => {
      const d = dirIndex(port.dir);
      const stub = { x: port.pt.x + DX[d] * STUB, y: port.pt.y + DY[d] * STUB };
      const c = freeAlong(stub, d);
      if (!c) return;
      const state = (c.cy * cols + c.cx) * 4 + d;
      const cost = port.cost ?? 0;
      if (cost < g[state]) {
        g[state] = cost;
        startPortByState.set(state, port);
      }
    });
    // Chegadas: a célula antes do trecho reto final, por porta.
    const goals = req.ends.flatMap((port) => {
      const d = dirIndex(port.dir);
      const stub = { x: port.pt.x - DX[d] * STUB, y: port.pt.y - DY[d] * STUB };
      const c = freeAlong(stub, (d + 2) & 3);
      return c ? [{ port, d, cell: c.cy * cols + c.cx, cx: c.cx, cy: c.cy }] : [];
    });
    if (goals.length === 0) startPortByState.clear();
    const h = (cx: number, cy: number) => Math.min(...goals.map((t) => Math.abs(cx - t.cx) + Math.abs(cy - t.cy)));
    startPortByState.forEach((_, state) => {
      const cell = state >> 2;
      heap.push(g[state] + h(cell % cols, (cell / cols) | 0), state);
    });

    let goalState = -1;
    let goalPort: Port | null = null;
    let expansions = 0;
    while (heap.size > 0 && expansions < MAX_EXPANSIONS) {
      const state = heap.pop();
      expansions++;
      const cell = state >> 2;
      const dir = state & 3;
      const hit = goals.find((t) => t.cell === cell && t.d === dir);
      if (hit) {
        goalState = state;
        goalPort = hit.port;
        break;
      }
      const cx = cell % cols;
      const cy = (cell / cols) | 0;
      const base = g[state];
      const goalHere = goals.find((t) => t.cell === cell);
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((dir + 2) & 3)) continue; // sem voltar pelo mesmo caminho
        // Na célula de chegada só falta virar para o sentido de entrada, sem andar.
        if (goalHere && goalHere.d === nd && nd !== dir) {
          const nstate = cell * 4 + nd;
          const cost = base + TURN_COST + (goalHere.port.cost ?? 0);
          if (cost < g[nstate]) {
            g[nstate] = cost;
            came[nstate] = state;
            heap.push(cost, nstate);
          }
        }
        const nx = cx + DX[nd];
        const ny = cy + DY[nd];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ncell = ny * cols + nx;
        const goalNext = goals.find((t) => t.cell === ncell);
        if (blocked[ncell] && !goalNext) continue;
        const cost =
          base + 1 + (nd !== dir ? TURN_COST : 0) + (used[ncell] ? CROSS_COST : 0) + (goalNext && goalNext.d === nd ? (goalNext.port.cost ?? 0) : 0);
        const nstate = ncell * 4 + nd;
        if (cost < g[nstate]) {
          g[nstate] = cost;
          came[nstate] = state;
          heap.push(cost + h(nx, ny), nstate);
        }
      }
    }

    let points: Pt[];
    if (goalState >= 0 && goalPort) {
      const states: number[] = [];
      for (let st = goalState; st >= 0; st = came[st]) states.push(st);
      states.reverse();
      const startPort = startPortByState.get(states[0]) ?? req.starts[0];
      const cellsPath = states.map((st) => {
        const cell = st >> 2;
        return { x: minX + (cell % cols) * CELL, y: minY + ((cell / cols) | 0) * CELL };
      });
      points = buildPath(startPort, goalPort, cellsPath);
    } else {
      points = fallback(req.starts[0], req.ends[0]);
    }
    points = turnEarly(points);
    markUsed(points);
    routes.set(req.id, { points, anchorStart: req.anchorStart, anchorEnd: req.anchorEnd, loop: req.loop });
  }
  return routes;
}

// A grade arredonda a posição: o trecho inicial e o final voltam para a linha (ou coluna) exata da
// porta, para a linha encostar reta na etapa.
function buildPath(start: Port, end: Port, cellsPath: Pt[]): Pt[] {
  const pts = [start.pt, ...cellsPath, end.pt];
  const startH = horizontal(start.dir);
  const first = startH ? cellsPath[0].y : cellsPath[0].x;
  for (let i = 1; i < pts.length - 1; i++) {
    const v = startH ? pts[i].y : pts[i].x;
    if (v !== first) break;
    pts[i] = startH ? { x: pts[i].x, y: start.pt.y } : { x: start.pt.x, y: pts[i].y };
  }
  const endH = horizontal(end.dir);
  const last = endH ? cellsPath[cellsPath.length - 1].y : cellsPath[cellsPath.length - 1].x;
  for (let i = pts.length - 2; i > 0; i--) {
    const v = endH ? pts[i].y : pts[i].x;
    if (v !== last) break;
    pts[i] = endH ? { x: pts[i].x, y: end.pt.y } : { x: end.pt.x, y: pts[i].y };
  }
  return simplify(pts);
}

function fallback(start: Port, end: Port): Pt[] {
  const midX = (start.pt.x + end.pt.x) / 2;
  return simplify([start.pt, { x: midX, y: start.pt.y }, { x: midX, y: end.pt.y }, end.pt]);
}

// Tira pontos repetidos e os do meio de um trecho reto.
export function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      const sameX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - p.x) < 0.5;
      const sameY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - p.y) < 0.5;
      if (sameX || sameY) out.pop();
    }
    out.push(p);
  }
  return out;
}

// Encaixa a rota nos pontos de conexão reais. Ela só vale se foi calculada para a posição atual das
// etapas (âncoras perto da conexão padrão); senão devolve null e a linha simples segue a etapa até a
// nova rota ficar pronta. Quando a rota usa a conexão padrão, troca a ponta pelo ponto real e endireita
// o primeiro/último trecho (a grade deixa alguns pixels de diferença); saída ou chegada por cima/baixo
// fica como foi calculada.
export function fitRoute(route: EdgeRoute | undefined, source: Pt, target: Pt): Pt[] | null {
  if (!route || route.points.length < 2) return null;
  const near = (a: Pt, b: Pt) => Math.abs(a.x - b.x) <= CELL + 2 && Math.abs(a.y - b.y) <= CELL + 2;
  if (!near(route.anchorStart, source) || !near(route.anchorEnd, target)) return null;
  const pts = route.points.map((p) => ({ ...p }));
  const n = pts.length;
  const startDefault = near(pts[0], route.anchorStart);
  const endDefault = near(pts[n - 1], route.anchorEnd);
  if (n === 2) {
    const s = startDefault ? source : pts[0];
    const t = endDefault ? target : pts[1];
    if (s.y === t.y || s.x === t.x) return [s, t];
    const midX = (s.x + t.x) / 2;
    return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t];
  }
  if (startDefault) {
    if (route.points[0].y === route.points[1].y) pts[1].y = source.y;
    else pts[1].x = source.x;
    pts[0] = source;
  }
  if (endDefault) {
    if (route.points[n - 2].y === route.points[n - 1].y) pts[n - 2].y = target.y;
    else pts[n - 2].x = target.x;
    pts[n - 1] = target;
  }
  return pts;
}

// Onde vai o rótulo da linha: no trecho mais perto do destino que tenha espaço (saídas da mesma
// Decisão dividem o começo do caminho); sem nenhum trecho longo — ou num laço —, no maior.
export function labelPoint(points: Pt[], longest = false): Pt {
  for (let i = points.length - 1; i > 0 && !longest; i--) {
    if (Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) >= 60) {
      return { x: (points[i].x + points[i - 1].x) / 2, y: (points[i].y + points[i - 1].y) / 2 };
    }
  }
  let best = { x: points[0].x, y: points[0].y };
  let bestLen = -1;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (len > bestLen) {
      bestLen = len;
      best = { x: (points[i].x + points[i - 1].x) / 2, y: (points[i].y + points[i - 1].y) / 2 };
    }
  }
  return best;
}

export function roundedPath(points: Pt[], radius = 8): string {
  if (points.length === 0) return '';
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i - 1];
    const c = points[i];
    const n = points[i + 1];
    const r1 = Math.min(radius, Math.hypot(c.x - p.x, c.y - p.y) / 2);
    const r2 = Math.min(radius, Math.hypot(n.x - c.x, n.y - c.y) / 2);
    const ax = c.x - Math.sign(c.x - p.x) * r1;
    const ay = c.y - Math.sign(c.y - p.y) * r1;
    const bx = c.x + Math.sign(n.x - c.x) * r2;
    const by = c.y + Math.sign(n.y - c.y) * r2;
    d += `L${ax} ${ay}Q${c.x} ${c.y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d}L${last.x} ${last.y}`;
}
