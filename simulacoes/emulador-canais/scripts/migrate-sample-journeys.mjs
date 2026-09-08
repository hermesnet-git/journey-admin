const adminBaseUrl = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:8081';
const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD ?? 'admin';

const journeys = [
  ['Cadastro Vivo+ (WhatsApp)', '7d7ce99a-ab6d-40fd-88a3-e27f83acccb6'],
  ['Cadastro Vivo+ (Mobile)', '873213b9-f6d7-410a-8618-3d267a99d73c'],
  ['Cadastro Vivo+ (Web)', 'd174339e-c96b-4a9b-9b74-78f42f5a3719'],
];

async function request(path, options = {}) {
  const response = await fetch(`${adminBaseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path}: HTTP ${response.status} - ${text}`);
  }
  return body;
}

const login = await request('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
const headers = {
  authorization: `Bearer ${login.token}`,
  'content-type': 'application/json',
};

function migrateNode(node) {
  const props = { ...(node.props ?? {}) };
  if (node.type === 'ui.stack') {
    props.spacingToken = props.spacingToken ?? props.gapToken ?? 'spacing.md';
    props.alignment = props.alignment ?? props.align ?? 'stretch';
    delete props.gapToken;
    delete props.align;
    delete props.justify;
    delete props.wrap;
    if (props.direction === 'responsive') props.direction = 'horizontal';
  }
  if (node.type === 'ui.container') {
    delete props.marginToken;
    delete props.borderToken;
    delete props.maxWidthToken;
  }
  if (node.type === 'ui.card') delete props.interactive;
  return {
    ...node,
    version: '1.0.0',
    props,
    active: node.active ?? null,
    children: node.children?.map(migrateNode) ?? null,
  };
}

for (const [name, journeyId] of journeys) {
  const versions = await request(`/api/v1/journeys/${journeyId}/versions`, { headers });
  if (versions.some((version) => version.versionNumber > 1)) {
    console.log(`${name}: ignorada; já possui versão posterior à v1.`);
    continue;
  }

  const versionOne = versions.find((version) => version.versionNumber === 1);
  if (!versionOne) throw new Error(`${name}: versão v1 não encontrada.`);
  const immutable = await request(
    `/api/v1/journeys/${journeyId}/versions/${versionOne.versionId}`,
    { headers },
  );
  const flow = await request(`/api/v1/journeys/${journeyId}/flow`, { headers });
  const roots = new Map(
    immutable.snapshot.flowNodes
      .filter((node) => node.embeddedScreenRoot)
      .map((node) => [node.id, migrateNode(node.embeddedScreenRoot)]),
  );
  const input = {
    name: flow.name,
    nodes: flow.nodes.map((node) => ({
      ...node,
      userTaskConfig: node.userTaskConfig
        ? { ...node.userTaskConfig, embeddedScreenRoot: roots.get(node.nodeId) ?? null }
        : null,
    })),
    connections: flow.connections,
    annotations: flow.annotations,
  };

  await request(`/api/v1/journeys/${journeyId}/flow`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });
  await request(`/api/v1/journeys/${journeyId}/flow/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const created = await request(`/api/v1/journeys/${journeyId}/versions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ description: 'Migração para o contrato SDUI canônico v1.0.0' }),
  });
  const published = await request(
    `/api/v1/journeys/${journeyId}/versions/${created.versionId}/publish`,
    { method: 'POST', headers },
  );
  console.log(`${name}: v${published.versionNumber} publicada (${published.status}).`);
}
