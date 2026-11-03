// Baixa o BPMN publicado de uma jornada e refaz só o desenho (BPMN DI) com o ELK: ligações em ângulo
// reto com rótulo ("Sim"/"Não"...), eventos "Se falhar" presos na borda de baixo da etapa, nomes de
// Decisão e Fim fora do símbolo e as seções da jornada como grupos. A lógica do processo não muda:
// só entram atributos `name` nas ligações e os grupos (artefatos visuais, ignorados pelo motor).
//
// Uso: node organizar_bpmn.mjs <journeyId> <arquivo-de-saida.bpmn>

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { api, login } from './sdui_helpers.mjs';

const require = createRequire(import.meta.url);
const ELK = require('../../../../front/node_modules/elkjs/lib/elk.bundled.js');
const { DOMParser, XMLSerializer } = require('../../../../simulacoes/emulador-canais/node_modules/@xmldom/xmldom');

const ENGINE = 'http://localhost:8080/engine-rest';
const NS = {
  bpmn: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
  dc: 'http://www.omg.org/spec/DD/20100524/DC',
  di: 'http://www.omg.org/spec/DD/20100524/DI',
};
const SIZE = { startEvent: [36, 36], endEvent: [36, 36], exclusiveGateway: [50, 50] };
const TASK = [100, 80];
const EXTERNAL_LABEL = new Set(['startEvent', 'endEvent', 'exclusiveGateway']);
const FLOW_NODES = new Set(['startEvent', 'endEvent', 'userTask', 'serviceTask', 'receiveTask', 'exclusiveGateway']);

// Texto quebrado em linhas de até `max` caracteres → tamanho aproximado do rótulo.
const labelSize = (txt, max = 22) => {
  const lines = [];
  for (const word of txt.split(' ')) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word; else lines.push(word);
  }
  return { width: Math.max(...lines.map((l) => l.length)) * 6.2 + 6, height: lines.length * 14 };
};

async function main() {
  const [journeyId, saida] = process.argv.slice(2);
  if (!journeyId || !saida) throw new Error('uso: node organizar_bpmn.mjs <journeyId> <saida.bpmn>');
  const key = `Journey_${journeyId.replaceAll('-', '')}`;
  const xml = (await (await fetch(`${ENGINE}/process-definition/key/${key}/xml`)).json()).bpmn20Xml;
  const token = await login();
  const flow = await api('GET', `/journeys/${journeyId}/flow`, token);
  const labelOf = new Map(flow.connections.map((c) => [c.connectionId, c.label]));

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const defs = doc.documentElement;
  const proc = doc.getElementsByTagNameNS(NS.bpmn, 'process')[0];
  const kids = Array.from({ length: proc.childNodes.length }, (_, i) => proc.childNodes.item(i)).filter((n) => n.nodeType === 1);
  const elems = kids.filter((n) => FLOW_NODES.has(n.localName));
  const boundaries = kids.filter((n) => n.localName === 'boundaryEvent');
  const flows = kids.filter((n) => n.localName === 'sequenceFlow');
  const typeOf = new Map(elems.map((e) => [e.getAttribute('id'), e.localName]));
  const hostOf = new Map(boundaries.map((b) => [b.getAttribute('id'), b.getAttribute('attachedToRef')]));

  // 1) Rótulos nas ligações (o motor ignora `name`).
  for (const f of flows) {
    const label = labelOf.get(f.getAttribute('id'));
    if (label) f.setAttribute('name', label);
  }

  // 2) Seções da jornada → grupos (category + group).
  const sectionOf = new Map();
  for (const s of flow.sections ?? []) {
    const cat = doc.createElementNS(NS.bpmn, 'category');
    cat.setAttribute('id', `Category_${s.id}`);
    const val = doc.createElementNS(NS.bpmn, 'categoryValue');
    val.setAttribute('id', `CategoryValue_${s.id}`);
    val.setAttribute('value', s.name);
    cat.appendChild(val);
    defs.insertBefore(cat, proc);
    const group = doc.createElementNS(NS.bpmn, 'group');
    group.setAttribute('id', `Group_${s.id}`);
    group.setAttribute('categoryValueRef', `CategoryValue_${s.id}`);
    proc.appendChild(group);
    for (const id of s.nodeIds) sectionOf.set(id, s.id);
  }

  // 3) Layout com ELK: seções viram nós compostos; "Se falhar" vira porta na borda de baixo da etapa.
  const leaf = (e) => {
    const id = e.getAttribute('id');
    const [width, height] = SIZE[e.localName] ?? TASK;
    const name = e.getAttribute('name') ?? '';
    const node = { id, width, height, ports: [], layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE' } };
    if (EXTERNAL_LABEL.has(e.localName) && name) node.labels = [{ id: `L_${id}`, text: name, ...labelSize(name) }];
    for (const b of boundaries) {
      if (b.getAttribute('attachedToRef') === id) node.ports.push({ id: `P_${b.getAttribute('id')}`, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } });
    }
    return node;
  };
  const sectionNodes = (flow.sections ?? []).map((s) => ({
    id: `Group_${s.id}`, layoutOptions: { 'elk.padding': '[top=40,left=25,bottom=25,right=25]' },
    labels: [{ id: `L_Group_${s.id}`, text: s.name, ...labelSize(s.name, 60) }],
    children: elems.filter((e) => sectionOf.get(e.getAttribute('id')) === s.id).map(leaf),
  }));
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL', 'elk.json.edgeCoords': 'ROOT', 'elk.json.shapeCoords': 'ROOT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60', 'elk.spacing.nodeNode': '45', 'elk.spacing.edgeNode': '20',
      'elk.spacing.edgeEdge': '12', 'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      'elk.nodeLabels.placement': 'OUTSIDE V_BOTTOM H_CENTER', 'elk.edgeLabels.placement': 'CENTER',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX', 'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: [...elems.filter((e) => !sectionOf.has(e.getAttribute('id'))).map(leaf), ...sectionNodes],
    edges: flows.map((f) => {
      const src = f.getAttribute('sourceRef');
      const name = f.getAttribute('name');
      return {
        id: f.getAttribute('id'), sources: [hostOf.has(src) ? `P_${src}` : src], targets: [f.getAttribute('targetRef')],
        labels: name ? [{ id: `L_${f.getAttribute('id')}`, text: name, ...labelSize(name, 26) }] : [],
      };
    }),
  };
  const res = await new ELK().layout(graph);

  const shapes = new Map();
  const labels = new Map();
  const ports = new Map();
  const collect = (n) => {
    for (const ch of n.children ?? []) {
      shapes.set(ch.id, ch);
      for (const l of ch.labels ?? []) labels.set(ch.id, l);
      for (const p of ch.ports ?? []) ports.set(p.id, p);
      collect(ch);
    }
  };
  collect(res);

  // 4) Novo BPMN DI no lugar do antigo.
  const old = doc.getElementsByTagNameNS(NS.bpmndi, 'BPMNDiagram')[0];
  const diagram = doc.createElementNS(NS.bpmndi, 'bpmndi:BPMNDiagram');
  diagram.setAttribute('id', 'BPMNDiagram_1');
  const plane = doc.createElementNS(NS.bpmndi, 'bpmndi:BPMNPlane');
  plane.setAttribute('id', 'BPMNPlane_1');
  plane.setAttribute('bpmnElement', proc.getAttribute('id'));
  diagram.appendChild(plane);
  const bounds = (parent, { x, y, width, height }) => {
    const b = doc.createElementNS(NS.dc, 'dc:Bounds');
    for (const [k, v] of Object.entries({ x, y, width, height })) b.setAttribute(k, String(Math.round(v)));
    parent.appendChild(b);
  };
  const withLabel = (parent, l, dx = 0, dy = 0) => {
    if (!l) return;
    const lab = doc.createElementNS(NS.bpmndi, 'bpmndi:BPMNLabel');
    bounds(lab, { x: l.x + dx, y: l.y + dy, width: l.width, height: l.height });
    parent.appendChild(lab);
  };
  const shape = (elementId, box, extra = {}) => {
    const s = doc.createElementNS(NS.bpmndi, 'bpmndi:BPMNShape');
    s.setAttribute('id', `${elementId}_di`);
    s.setAttribute('bpmnElement', elementId);
    for (const [k, v] of Object.entries(extra)) s.setAttribute(k, v);
    bounds(s, box);
    plane.appendChild(s);
    return s;
  };

  for (const g of sectionNodes) {
    const s = shape(g.id, shapes.get(g.id));
    withLabel(s, labels.get(g.id));
  }
  for (const e of elems) {
    const id = e.getAttribute('id');
    const s = shape(id, shapes.get(id), e.localName === 'exclusiveGateway' ? { isMarkerVisible: 'true' } : {});
    withLabel(s, labels.get(id));
  }
  for (const b of boundaries) {
    const p = ports.get(`P_${b.getAttribute('id')}`);
    const host = shapes.get(b.getAttribute('attachedToRef'));
    const cx = p.x;
    const cy = host.y + host.height;
    const s = shape(b.getAttribute('id'), { x: cx - 18, y: cy - 18, width: 36, height: 36 });
    withLabel(s, { x: cx + 14, y: cy + 12, width: 50, height: 14 });
  }
  const edgeById = new Map((res.edges ?? []).map((e) => [e.id, e]));
  for (const f of flows) {
    const id = f.getAttribute('id');
    const e = edgeById.get(id);
    const sec = e.sections[0];
    const pts = [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint].map((p) => ({ ...p }));
    if (hostOf.has(f.getAttribute('sourceRef'))) pts[0].y += 18; // sai da base do evento "Se falhar", não da borda da etapa
    const edge = doc.createElementNS(NS.bpmndi, 'bpmndi:BPMNEdge');
    edge.setAttribute('id', `${id}_di`);
    edge.setAttribute('bpmnElement', id);
    for (const p of pts) {
      const w = doc.createElementNS(NS.di, 'di:waypoint');
      w.setAttribute('x', String(Math.round(p.x)));
      w.setAttribute('y', String(Math.round(p.y)));
      edge.appendChild(w);
    }
    withLabel(edge, (e.labels ?? [])[0]);
    plane.appendChild(edge);
  }
  defs.replaceChild(diagram, old);

  const outXml = new XMLSerializer().serializeToString(doc);
  writeFileSync(saida, outXml.startsWith('<?xml') ? outXml : `<?xml version="1.0" encoding="UTF-8"?>\n${outXml}`);
  console.log(`BPMN organizado: ${elems.length} etapas, ${boundaries.length} "Se falhar", ${flows.length} ligações, ${sectionNodes.length} grupos`);
  console.log(`Tamanho do desenho: ${Math.round(res.width)} x ${Math.round(res.height)} → ${saida}`);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
