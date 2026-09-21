// Exportar para o Elastic Journey — lê o desenho aberto e grava um arquivo com o que o Elastic
// Journey precisa para montar uma jornada: as telas, as decisões e as setas entre elas.
//
// Guarda só esses campos, e não o desenho inteiro. Um agrupamento grande passa de 140 MB quando
// levado com tudo (cores, efeitos, tipografia, transformações) e fica perto de 20 MB com o que
// importa — o resto nunca é lido do outro lado.
//
// Não acessa a rede: o arquivo é gerado e baixado na própria máquina de quem exporta.

const FORMAT = 'elastic-journey/figma-export@1';

/** Campos que o Elastic Journey lê. Qualquer outro é peso morto no arquivo. */
function slim(node) {
  const out = { id: node.id, type: node.type, name: node.name };

  const box = node.absoluteBoundingBox;
  if (box) {
    out.absoluteBoundingBox = { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  // O título da tela sai do maior texto dentro dela, então o tamanho da fonte tem de vir junto.
  if (node.type === 'TEXT') {
    out.characters = node.characters;
    const size = node.fontSize;
    // Um texto com tamanhos diferentes no meio devolve um símbolo em vez de número; nesse caso o
    // tamanho não serve para comparar, e o texto entra sem ele.
    if (typeof size === 'number') {
      out.style = { fontSize: size };
    }
  }

  // Losango é a forma que representa uma decisão; o texto de dentro é a pergunta que ela faz.
  if (node.type === 'SHAPE_WITH_TEXT') {
    out.shapeType = node.shapeType;
    out.characters = node.text ? node.text.characters : '';
  }

  // A seta diz o que leva a quê, e o rótulo dela ("sim", "não") diz em que caso.
  if (node.type === 'CONNECTOR') {
    if (node.connectorStart && node.connectorStart.endpointNodeId) {
      out.connectorStart = { endpointNodeId: node.connectorStart.endpointNodeId };
    }
    if (node.connectorEnd && node.connectorEnd.endpointNodeId) {
      out.connectorEnd = { endpointNodeId: node.connectorEnd.endpointNodeId };
    }
    const label = node.text ? node.text.characters : '';
    if (label) {
      out.characters = label;
    }
  }

  if ('children' in node && node.children.length > 0) {
    out.children = node.children.map(slim);
  }
  return out;
}

function countNodes(node) {
  let total = 1;
  for (const child of node.children || []) {
    total += countNodes(child);
  }
  return total;
}

/**
 * Exporta o que estiver selecionado no canvas; sem seleção, a página inteira. Exportar o arquivo
 * todo raramente é o que se quer — uma jornada nasce de um trecho do desenho, não de tudo.
 */
function pick() {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    return { nodes: selection, scope: selection.length === 1 ? selection[0].name : selection.length + ' itens' };
  }
  return { nodes: [...figma.currentPage.children], scope: figma.currentPage.name };
}

function describe() {
  const picked = pick();
  const total = picked.nodes.reduce((sum, node) => sum + countNodes(node), 0);
  return { scope: picked.scope, nodes: total, empty: picked.nodes.length === 0 };
}

function build() {
  const picked = pick();
  // Mantém a mesma forma que o Elastic Journey já lê, com a seleção ocupando o lugar de uma página:
  // assim a leitura do arquivo enviado e a leitura direta do Figma seguem o mesmo caminho lá.
  return {
    format: FORMAT,
    name: figma.root.name,
    exportedAt: new Date().toISOString(),
    document: {
      id: '0:0',
      type: 'DOCUMENT',
      name: figma.root.name,
      children: [
        {
          id: figma.currentPage.id,
          type: 'CANVAS',
          name: figma.currentPage.name,
          children: picked.nodes.map(slim),
        },
      ],
    },
  };
}

figma.showUI(__html__, { width: 340, height: 260 });
figma.ui.postMessage({ type: 'ready', ...describe() });

figma.on('selectionchange', () => {
  figma.ui.postMessage({ type: 'ready', ...describe() });
});

figma.ui.onmessage = (message) => {
  if (message.type === 'export') {
    const payload = build();
    figma.ui.postMessage({
      type: 'file',
      fileName: sanitize(figma.root.name) + '.journey.json',
      content: JSON.stringify(payload),
    });
  } else if (message.type === 'close') {
    figma.closePlugin();
  }
};

function sanitize(name) {
  return (name || 'desenho').replace(/[^\p{L}\p{N}\-_ ]+/gu, '').trim().replace(/\s+/g, '-') || 'desenho';
}
