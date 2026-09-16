# Mapa de conteúdo e rastreabilidade

Cada visão da apresentação e onde sua afirmação foi verificada. As fontes marcadas como **código** foram lidas na implementação, não na documentação.

| # | Visão | O que afirma | Verificado em |
|---:|---|---|---|
| 01 | Capa | Posicionamento e as ineficiências de construir jornada canal a canal | Briefing; catálogo SDUI v1 |
| 02 | Antes e depois | As mesmas seis responsabilidades existindo cinco vezes ou uma só; indicadores de negócio que viram junto | Visão funcional fornecida pelo autor; `ej-admin-arquitetura-logica.md` §16 |
| 03 | A tese | Separação entre intenção, execução e experiência | Catálogo SDUI v1 §§3–4; `ej-admin-arquitetura-logica.md` §2, §16 |
| 04 | Mapa da plataforma | As três soluções, os dois momentos e quem fala com quem | **Código**: adapters de publicação do portal, cliente de especificação e cliente do motor no `ms-journey` |
| 05 | Portal Administrativo | Onze domínios em seis grupos; validação só na publicação | `ej-admin-arquitetura-logica.md` §5–§6; **código**: comentário do caso de uso de publicação |
| 06 | Publicação | Duas projeções coordenadas e verificação prévia de disponibilidade | **Código**: caso de uso de publicação de versão, ordem literal das etapas |
| 07 | Runtime | `ms-journey` como porta única, cinco operações, três estados de passo | **Código**: controlador do `ms-journey` e o tipo de resposta de passo |
| 08 | Ciclo de uma etapa | As oito chamadas reais de uma etapa, com corpos | **Código**: `ms-journey`, resolvedor de passo, cliente do motor e conversão de variáveis |
| 09 | Contrato SDUI v1 | Envelope canônico, níveis, invariantes e versionamento | Catálogo SDUI v1 §§5, 6, 12, 13, 14 |
| 10 | Projeção multicanal | Mesma árvore, três formas; regras de projeção aplicadas ao vivo | Catálogo SDUI v1 §7 e §7.1 (tabelas normativas por componente) |
| 11 | Emulador de Canais | Cockpit, BFF único, cinco hosts, uma borda de saída | `simulacoes/emulador-canais/docs/arquitetura.md` |
| 12 | Renderizadores | Runtime headless no centro, adapter na borda; ainda não são SDKs | Estrutura de pacotes do emulador; `docs/status-implementacao.md` |
| 13 | Fronteiras | Os seis guardrails que sustentam o desacoplamento | **Código**: comentários de fronteira nas classes de borda; `ej-admin-arquitetura-logica.md` §16 |
| 14 | Achados de arquitetura | Quatro divergências entre contrato declarado e implementação | **Código**: ver detalhamento abaixo |
| 15 | Estado atual | 456 de 506 requisitos concluídos, com as lacunas nomeadas | `requisitos/admin/progresso.md` |
| 16 | Evolução | Prioridade organizada por horizonte | Inferência a partir das lacunas documentadas e dos achados |
| 17 | Fontes e premissas | Rastreabilidade e convenções editoriais | Todos os itens acima |

## Detalhamento dos achados (visão 13)

| Achado | Evidência | Efeito prático |
|---|---|---|
| Publicação sem compensação | O caso de uso implanta o processo e só então grava as telas; o tratamento de exceção registra auditoria de falha e repropaga, sem desfazer a implantação | Falha na segunda projeção deixa processo implantado sem telas correspondentes. Mitigado por verificação de disponibilidade antes de qualquer efeito colateral |
| Revisão anterior não é marcada | O contrato do repositório de snapshots declara que publicar marca a revisão anterior como substituída; a implementação apenas insere, e a string correspondente não existe no código | Republicar a mesma versão cria segundo registro ativo com a mesma chave lógica; a leitura limita a um resultado sem desempate explícito |
| Lista de canais descartada | O portal envia a lista de canais da jornada; o contrato de entrada da transformação declara campos de canal no singular e ignora campos desconhecidos | Sem efeito hoje, porque nenhum desses campos participa da geração do processo. O contrato entre os dois serviços está desalinhado |
| Canal não chega à tela | O tipo de canal é injetado como variável sem prefixo; o contexto entregue ao renderizador é filtrado pelas variáveis com prefixo de formulário e de dados | Vínculo de visibilidade por canal não resolve por esse caminho, apesar de o canal funcionar em condições de desvio |

## Decisões de representação

1. O diagrama de publicação mostra o portal como coordenador porque é ele que valida, monta os envelopes, verifica disponibilidade e chama os dois destinos em ordem definida, persistindo apenas após o sucesso de ambos.
2. O registro de especificação aparece nas duas pontas, publicação e runtime, porque serve aos dois: recebe envelopes na publicação e resolve a tela do passo em execução, sem nunca tocar o estado da instância.
3. O `ms-journey` aparece como ponto único do canal porque tanto o próprio serviço quanto a arquitetura do emulador impedem acesso direto dos hosts ao motor e ao registro.
4. O repositório de snapshots aparece como armazenamento, nunca como dono do contrato, conforme o catálogo v1.
5. Os renderizadores são apresentados como caminho para SDKs, não como SDKs: a separação entre runtime headless e adapter existe, mas publicação versionada, superfície estável e documentação de consumo são lacunas explícitas.
6. Os números de maturidade aparecem por frente, não por feature individual, para que a visão executiva não dependa de familiaridade com a numeração interna de requisitos.
