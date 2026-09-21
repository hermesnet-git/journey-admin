# O motor por dentro

Abra `index.html` no navegador. São cinco opções visuais, com cinco slides interativos cada, sem instalação ou conexão com a internet.

| Opção | Abordagem |
| --- | --- |
| 1. Motor em movimento | Percurso, ações e situação do pedido em fundo escuro |
| 2. Roteiro e execuções | Composição clara e editorial para uma primeira explicação |
| 3. Diário de um pedido | Dados e histórico no centro da apresentação |
| 4. Caminhos do motor | Escolhas, divisões e encontros no percurso |
| 5. Mesa de experimentos | Perguntas e experimentos para participação do público |

Cada opção abre por `index.html?opcao=1` até `index.html?opcao=5`. Elas compartilham o mesmo exemplo executável e têm títulos e abordagens próprios.

## Os cinco slides

1. Roteiro publicado, início e pedidos independentes.
2. Tarefa humana, resposta recebida, dados guardados e consulta automática.
3. Escolha por condição, dois trabalhos independentes e encontro que espera ambos.
4. Espera por prazo, relógio, canal de mensagens e identificação do pedido correto.
5. Integração, reserva do trabalho, falha, novas tentativas, intervenção e fim.

O foco é o comportamento interno do motor. Os slides usam palavras simples. Os nomes técnicos e as ressalvas ficam nas notas.

## Como experimentar

Crie Ana e Bruno no primeiro slide. Avance apenas um deles no segundo e compare os registros. A prioridade escolhe um dos caminhos.

No terceiro slide, conclua o preparo antes do registro. O encontro ainda aguarda o trabalho pendente. Quando os dois terminam, começa uma espera de 10 minutos.

No quarto, avance o relógio duas vezes. Experimente um assunto diferente ou o número de outro pedido antes de entregar “Agendamento confirmado” ao pedido selecionado. Neste exemplo, mensagens sem espera compatível não ficam guardadas para uso futuro.

No quinto, reserve o trabalho com A e tente reservá-lo com B. Provoque uma falha, avance 2 minutos e tente novamente. Após três falhas, o pedido precisa de intervenção. Corrigir a causa libera outra tentativa. O sucesso leva ao fim.

As setas do teclado e os controles numerados navegam livremente. “Preparar este exemplo” simula os acontecimentos anteriores quando o pedido ainda não alcançou o trecho escolhido. Mudar de slide, por si só, não avança nenhum pedido.

Notas mostra a explicação técnica, as fontes e o histórico completo. Recomeçar limpa só o exemplo da opção atual. O progresso fica no armazenamento local, separado por opção. Se esse recurso estiver bloqueado, a apresentação avisa que o progresso dura apenas enquanto a página está aberta.

## Modelo e limites

A referência é o Camunda 7.24. Pessoas, roteiro e tempos são fictícios. Os botões representam acontecimentos, respostas de executores e passagem do tempo. Nenhum controle chama serviços reais.

O roteiro executa: início, geração de protocolo, confirmação humana, consulta automática, escolha por prioridade, serviço do caminho escolhido, abertura de dois trabalhos, encontro, prazo, envio de convite, espera da confirmação, integração final e fim. Geração, consulta e convite têm sucesso imediato neste recorte.

Os trabalhos abertos representam paralelismo lógico. Isso não exige threads simultâneas. O encontro é estruturado e espera uma chegada de cada caminho. As condições da decisão exclusiva são complementares.

O prazo representa um timer intermediário. No motor real, a continuação depende do executor de jobs depois do vencimento. O relógio da demonstração é compartilhado entre os pedidos.

O canal de mensagens representa um tópico externo. Uma integração lê o canal e identifica a espera pelo nome da mensagem e pelo número do pedido. Esse tópico não é o mesmo conceito que um tópico de external tasks. A demonstração não implementa buffer nem reentrega de mensagens.

A integração final representa uma external task. A política didática define reserva de 2 minutos e até 3 tentativas, com espera de 2 minutos após falha. Esgotar tentativas exige intervenção. A reserva não garante que efeitos externos ocorram exatamente uma vez. A integração precisa tratar possíveis repetições.

O armazenamento local demonstra a ideia de persistência. Um motor real guarda o andamento em armazenamento próprio, com transações e controle de concorrência. O histórico depende da retenção configurada. Uma falha síncrona pode devolver a execução ao último ponto persistido, conforme explicado nas notas.

## Fontes

- [Avanço, espera e persistência](https://docs.camunda.org/manual/7.24/user-guide/process-engine/transactions-in-processes/)
- [Dados do pedido](https://docs.camunda.org/manual/7.24/user-guide/process-engine/variables/)
- [Escolha por condição](https://docs.camunda.org/manual/7.24/reference/bpmn20/gateways/exclusive-gateway/)
- [Divisão e encontro](https://docs.camunda.org/manual/7.24/reference/bpmn20/gateways/parallel-gateway/)
- [Timers](https://docs.camunda.org/manual/7.24/reference/bpmn20/events/timer-events/)
- [Mensagens](https://docs.camunda.org/manual/7.24/reference/bpmn20/events/message-events/)
- [Trabalhos externos, reservas e falhas](https://docs.camunda.org/manual/7.24/user-guide/process-engine/external-tasks/)

A relação entre tópico e identificação da instância também foi conferida em `simulacoes/ms-runtime-camunda/src/main/java/com/jouney/runtimecamunda/kafka/KafkaConnectorWorker.java`.

Texto revisado com a skill humanizer 3.0.0, instalada em `C:/Users/gonza/.claude/plugins/cache/humanizer/humanizer/3.0.0/SKILL.md`.

Arquivos de uso: `index.html`, `styles.css`, `engine.css`, `app.js` e `engine.js`. O material está em `documentacao/runtine-engine/codex`, conforme solicitado.
