# Abertura de BD pelo VE (FTAT-933): viabilidade no Elastic Journey

Data: 03/11/2026. Fontes: as 9 USs, `Analise.docx`, `Workflow.png`, o desenho de arquitetura
"solução síncrona", o contrato `arquitetura/Gtw Redes Service Test Management-V1.0.0-API.json` e o
Figma [B2B] Suporte Técnico, página "Abertura de BD - App" (extração em `figma/`).

Nada foi criado na plataforma. Este documento serve de base para conciliar as telas do Figma com as USs.

## 1. Conclusão

A jornada cabe no Elastic Journey com os tipos de etapa que já existem: integração REST com prazo e
saída de falha, espera de mensagem Kafka com prazo, Decisão com várias saídas, telas com botões, lista
de seleção, seletor de data e checkbox. O que impede a construção definitiva é a documentação:
contratos de integração (os data mappings estão no Jira), formato da mensagem para o VE e decisões de
fluxo que as USs não fecham.

## 2. Como a jornada fica montada

| Trecho das USs / diagramas | Etapa no Elastic Journey |
|---|---|
| VE inicia com CNPJ, designador de serviço (013), designador de acesso (069) e bloqueio financeiro | Início com variáveis de entrada |
| Consulta BD (Service Now, TMF621) | Integração REST, prazo 30 s, saída "Se falhar" |
| Consulta Massiva/Manutenção (Sigitm, Customer Problem Management) | Integração REST, prazo 30 s, saída "Se falhar" |
| Existe BD, Massiva ou bloqueio? | Decisão com várias saídas |
| Impedimento ou falha ("procure o atendimento Vivo") | Tela informativa, depois Fim |
| Pré-diagnóstico: cliente pronto ou não pronto | Tela com 2 botões que gravam a resposta |
| Diagnóstico no HPSD (TMF653 `POST /serviceTest`) | Integração REST |
| Resultado do HPSD chega pelo Kafka | Espera de mensagem, prazo 30 s, caminho de falha |
| ID06/ID07/ID10 ou outro ID | Decisão |
| Pedir reset do modem, cliente confirma | Tela com 2 botões |
| Consulta de slots no WFM, cliente escolhe | REST com saída em lista + tela com lista de seleção |
| Cria WO; slot ocupado volta para a consulta de slots | REST + Decisão + laço de volta |
| Cria BD; se falhar, cancela a WO sem aguardar resposta | REST + Decisão + REST em segundo plano |

Ordem de grandeza: cerca de 19 telas (sem o desambiguador), 7 integrações REST, 1 espera Kafka e 6 a 8
decisões.

## 3. Pontos de plataforma que precisam de decisão

1. **Formato da tela para o VE.** As USs dizem que o VE espera o JSON `task_encontrou_cliente.v1.0.0`,
   recebido por polling numa fila Redis (`wf-journey`), e avança com
   `POST /process-instance/{id}/advance`. O Elastic Journey entrega telas no formato do próprio
   catálogo, consultando a etapa atual e concluindo a etapa. O VE adota o contrato da plataforma ou
   existe uma camada de tradução. É o ponto de maior impacto.
2. **Retorno do HPSD pelo Kafka.** A espera de mensagem localiza a jornada pelo `correlationId` e
   espera o formato `{correlationId, messageName, payload: {status, code, data}}`. O serviço que
   recebe o retorno do teste (marcado como "elemento alterado" no desenho) precisa publicar nesse
   formato. O `correlationId` precisa ir no `POST /serviceTest` e voltar no retorno, e o contrato
   TMF653 não indica qual campo faz isso.
3. **Sem execução paralela.** A plataforma só tem Decisão exclusiva, então BD e Massiva ficam em
   sequência. As USs não definem paralelismo nem a ordem entre bloqueio, BD e Massiva.
4. **Token do API Gateway.** O desenho usa token sistêmico (client credentials). Isso se resolve com
   uma integração REST inicial que busca o token e o envia no cabeçalho como `{{token}}`; o cabeçalho
   aceita variável. A plataforma ainda não guarda credencial de REST de forma definitiva.
5. **Síncrono ou assíncrono.** O `Workflow.png` coloca "Aguarda resposta da camada de integração"
   depois de cada chamada, o que indica mensageria. O desenho de arquitetura é chamado de "solução
   síncrona" e usa chamada direta, exceto no HPSD. A plataforma suporta os dois; é preciso escolher.
6. **Prazo em tela.** A US 3 pede 30 s para a resposta do cliente. Há prazo para espera de mensagem,
   mas não para tela.

## 4. O fluxo desenhado no Figma

1. **Desambiguador** (5 telas): tipo de suporte (casa ou empresa), empresa por CNPJ, serviço (móvel
   ou fixo), Internet/Telefone/TV, endereço.
2. **Validação de status**: "Continuar", carregando, decisão "Cliente tem algum ponto de impedimento
   do serviço?".
   - Sim: 5 telas informativas, uma por cenário: Massiva + Atraso em pagamentos, Massiva + Visita
     técnica, Massiva, Atraso em pagamentos, Visita técnica.
   - Não: reiniciar o modem.
3. **Reiniciar o modem**: "Já reiniciei" ou "Não consigo reiniciar", depois "A internet voltou?". Sim
   leva à tela final "Sua internet voltou"; Não (ou não consegue reiniciar) leva ao diagnóstico.
4. **Diagnóstico automático**: "Continuar" ou "Ir para o início", carregando, decisão pelo ID do
   HPSD.
   - 06, 07 ou 10: reiniciar de novo e perguntar se voltou. Sim, fim; Não, Abertura de BD.
   - 09 (sem energia): verificar tomada e cabo, perguntar se voltou, depois "Tem energia no
     endereço?". Termina em Abertura de BD ou na tela "O problema pode estar na rede elétrica".
   - 01, 02, 08 ou sem resposta: Abertura de BD.
5. **Abertura de BD**: "Vamos agendar uma visita técnica", escolha de data e período com aceite
   opcional "Aceito que a Vivo me avise se surgir um horário mais cedo", tela "Você agendou a visita
   técnica".

Os textos de cada tela estão em `figma/resumo-telas.md`.

## 5. Divergências entre Figma e USs (pauta da conciliação)

1. **O Figma acrescenta regras que as USs não têm**: reinício do modem antes do diagnóstico; cenário
   ID 09 (sem energia); IDs 01/02/08 nomeados; "sem resposta" do HPSD leva à visita técnica, enquanto
   as USs dizem que o tempo esgotado encerra a jornada.
2. **Cliente não resolveu após o reset (ID 06/07/10)**: o Figma e o `Workflow.png` seguem para a
   visita técnica; a US 4 não trata esse caso.
3. **Pré-diagnóstico**: as USs falam em "perguntas pré-diagnóstico" e "cliente pronto ou não pronto".
   No Figma isso aparece como a tela "Agora, vamos testar a sua conexão", com "Continuar" e "Ir para
   o início". Confirmar se é a mesma coisa.
4. **Telas de impedimento pedem mais dados**: lista de faturas em atraso (valor, vencimento), previsão
   da massiva com protocolo e visita já agendada (data, horário, protocolo). As USs só preveem um
   indicador de bloqueio financeiro enviado pelo VE. Falta definir quem fornece esses dados.
5. **BD aberto aparece como "Visita técnica agendada"**: confirmar se todo BD aberto tem visita.
6. **Telas que faltam no Figma**: slot ocupado (US 7), BD não criado (US 8), falha ou
   indisponibilidade de integração ("procure o atendimento Vivo"), carregando entre consultas do WFM.
7. **Identificadores**: o escopo das USs é informar o ID do BD ao cliente, mas a tela de sucesso só
   mostra data e período. A tela "Sua internet voltou" mostra um protocolo sem origem definida (o
   registro no Salesforce está riscado no `Workflow.png`).
8. **Desambiguador no VE ou na jornada**: as USs dizem que o VE inicia o fluxo com CNPJ, endereço e
   designador, e que a experiência do VE está fora do escopo. Isso indica que a jornada começa em
   "Validação de status".
9. **Tela de horários**: os períodos dependem da data escolhida, e o catálogo de telas não filtra uma
   lista pelo valor de outro campo da mesma tela. Alternativas: duas telas (data, depois período) ou
   uma lista única de horários. O aceite "horário mais cedo" não existe nas USs nem no contrato do WFM.
10. **Ações sem equivalente**: "Salvar na agenda" não tem ação no catálogo. "Ir pra Central de
    faturas" e "Ir pra Central de visitas" podem usar abertura de link.
11. **Escopo do serviço**: o Figma oferece Internet, Telefone e TV, mas só o caminho de Internet está
    desenhado.

## 6. Contratos disponíveis

Só o TMF653 (Service Test Management) está na pasta. Faltam os data mappings de Consulta de BD,
Consulta de Massivas, Diagnóstico Automático, Consulta de Slot WFM, Abertura de WO e agendamento e
Abertura de BD. Para um protótipo, as integrações podem apontar para APIs simuladas; para publicar,
os contratos são necessários.

## 7. Arquivos em `figma/`

| Arquivo | Conteúdo |
|---|---|
| `abertura-bd-app.figma-export.json` | Arquivo para importar em Nova jornada → Figma → Enviar arquivo: página, seção "Fluxo Completo" com 11 seções internas (os quadros de agrupamento do desenho viraram seções com o próprio título, senão o importador confunde agrupamento com tela), 27 telas completas e 2 decisões, sem elementos ocultos. As setas não entram como ligações (ver abaixo) |
| `telas.json` | Árvore completa das 27 telas visíveis (resposta da API do Figma) |
| `estrutura-fluxo.json` | Seção "Fluxo Completo" em 2 níveis: grupos, decisões, setas e rótulos |
| `cenarios-bloqueio-chips.json` | Rótulos dos 5 cenários de impedimento |
| `resumo-telas.md` | Textos e componentes de cada tela, na ordem de leitura |

Origem: arquivo `krz3cFCXs0W4C4hI2m5r0D`, página `41777:6650`, seção `42148:8430`. As setas do
Figma são vetores nomeados "origem --> destino", não conectores nativos. Os 9 quadros ocultos da
seção foram ignorados.
