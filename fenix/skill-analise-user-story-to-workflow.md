# Skill: Analise de User Stories para Workflow

## Objetivo

Analisar um conjunto de histórias de usuário que compõem uma jornada e preencher um documento de levantamento de fluxo com o entendimento funcional necessário para posterior modelagem de workflow/BPMN.

A análise deve distinguir claramente:

- o que está explicitamente informado nas histórias;
- o que pode ser inferido apenas como sequência funcional descrita;
- o que está ausente, inconsistente ou depende de informação adicional.

A skill não deve inventar direcionamentos, soluções técnicas, prioridades, contratos de integração ou regras de negócio que não estejam documentados.

## Entradas esperadas

- Um ou mais documentos `US*.docx` que descrevam a jornada.
- Um documento modelo, normalmente `Exemplo detalhamento fluxo.docx`.
- Diagramas, imagens ou fluxos associados, quando existirem.
- Um documento de saída, normalmente `Analise.docx`, que deve seguir o formato do modelo.

## Procedimento

1. Ler todos os documentos `US*.docx` antes de concluir a análise.
2. Ler integralmente o documento modelo para identificar:
   - títulos e ordem dos itens;
   - orientações de preenchimento;
   - tabelas e colunas;
   - exemplos que devem ser substituídos.
3. Consultar os diagramas e imagens da jornada para apoiar a compreensão do fluxo, sem tratá-los como substitutos dos requisitos textuais.
4. Consolidar as histórias em uma sequência funcional única, preservando os nomes e sistemas usados nos documentos.
5. Identificar telas, interações do usuário, etapas sistêmicas, integrações, retornos, decisões, esperas, loops e encerramentos.
6. Comparar as histórias entre si para encontrar divergências de sistema, canal, ordem, status, retorno ou nomenclatura.
7. Preencher o documento de saída item por item, seguindo a estrutura do modelo.
8. Remover o conteúdo exemplificativo do modelo das tabelas que precisam representar a jornada real.
9. Quando não houver evidência suficiente, escrever explicitamente uma destas situações:
   - `Não identificado nas USs.`
   - `As USs não informam este detalhe.`
   - `Necessita informação adicional.`
   - `Há divergência entre as USs; o ponto precisa ser alinhado.`
10. Ao final, incluir um resumo analítico sobre a consistência da documentação e sua prontidão para modelagem BPMN.

## Regras por item do modelo

### Item 1: O que precisa ser informado

Responder abaixo de cada orientação do modelo, sem remover a pergunta original. Verificar individualmente:

- telas da jornada;
- sequência das telas;
- ações do usuário;
- dados informados, enviados ou recebidos;
- origem e destino de cada dado;
- disponibilidade dos dados;
- momento de validação;
- valores e condições de decisão;
- integrações;
- tópicos e subscriptions;
- necessidade de aguardar retorno;
- dados de retorno;
- tempos de espera;
- condições de encerramento.

### Item 2: Sequência das telas

Excluir as linhas de exemplo e criar novas linhas para a jornada analisada. Preencher:

- ordem;
- nome da tela ou etapa funcional;
- objetivo;
- ação do usuário ou sistema;
- próxima etapa.

Se a US não trouxer nome formal de tela, usar uma descrição funcional e informar que não foi identificado um nome formal.

### Item 3: Dados necessários

Descrever os dados identificados nas USs e separar dados explicitamente citados de campos que dependem de data mapping ou contrato não disponível.

### Item 4: Matriz de dados

Para cada dado que influencie a condução do fluxo, registrar:

- onde é informado ou recebido;
- quando fica disponível;
- quando é validado;
- valores esperados;
- comportamento descrito nas USs.

Não preencher payloads ou campos obrigatórios por suposição.

### Item 5: Regras de decisão

Registrar somente decisões que tenham condição e caminho descritos nas histórias. Para cada decisão, informar:

- nome da decisão;
- informação validada;
- condição ou valor;
- próximo passo.

Quando a prioridade entre decisões não estiver definida, registrar a ausência de prioridade em vez de escolher uma ordem como regra oficial.

### Item 6: Integrações

Relacionar as integrações citadas nas USs e preencher, quando informado:

- nome funcional;
- sistema destino;
- tópico;
- subscription;
- se aguarda retorno;
- retorno esperado;
- dados recebidos;
- próximo passo.

Manter como pendente o que estiver como `???`, `N/A` ou `SERÁ DEFINIDO EM TEMPO DE DEV`.

### Item 7: Retornos

Descrever quais integrações possuem retorno obrigatório, quais eventos permitem continuar e quais decisões dependem de cada retorno. Destacar quando os documentos não informarem formato, campos, correlação ou códigos completos.

### Item 8: Esperas e prazos

Registrar apenas os prazos encontrados nas USs e indicar quando a aplicação do prazo é ambígua, especialmente para eventos assíncronos e interações do usuário.

### Item 9: Encerramentos

Consolidar todos os encerramentos identificados, incluindo sucesso, falha, timeout, impedimento e retorno para outra etapa. Não transformar um retorno para uma etapa anterior em encerramento.

## Resumo analítico obrigatório ao final

O resumo final deve avaliar, sem inventar soluções:

- coerência do objetivo de negócio;
- consistência dos sistemas envolvidos;
- existência de uma sequência funcional compreensível;
- cobertura dos caminhos principais;
- cobertura de exceções e erros;
- definição dos contratos de integração;
- clareza das regras de decisão;
- definição dos eventos assíncronos;
- definição de loops e reprocessamentos;
- prontidão para BPMN preliminar;
- prontidão para BPMN definitivo ou executável.

O resumo deve explicitar que a documentação pode ser suficiente para um BPMN preliminar quando os caminhos principais estiverem descritos, mas não deve ser classificada como pronta para BPMN definitivo se faltarem ordem formal, paralelismo, eventos, retornos, timeouts, loops, cancelamentos ou sistema responsável por cada operação.

## Formatação do documento de saída

- Preservar a estrutura e as orientações do documento modelo.
- Substituir exemplos preenchidos por dados das USs.
- Usar respostas em itálico.
- Usar cores diferentes para facilitar a leitura:
  - azul para informações encontradas nas USs;
  - verde para continuidade ou caminhos explicitamente descritos;
  - vermelho para inconsistências, lacunas ou informações não identificadas.
- Não remover a indicação de ausência de informação.
- Não apresentar hipótese como decisão aprovada.

## Checklist final

- [ ] Todos os documentos `US*.docx` foram lidos.
- [ ] O documento modelo foi usado como estrutura.
- [ ] Os exemplos do modelo foram removidos das tabelas aplicáveis.
- [ ] Os itens 1 a 9 foram respondidos.
- [ ] As lacunas foram marcadas explicitamente.
- [ ] Não foram inventadas soluções ou direcionamentos.
- [ ] O resumo de consistência e prontidão para BPMN foi incluído ao final.
- [ ] O documento foi validado após a geração.
