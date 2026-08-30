# ROADMAP — o que ainda vai ser feito

> **Nada aqui está travado.** Este arquivo é a fila de trabalho combinada com o dono do projeto;
> as decisões JÁ TOMADAS (e que não se discutem sem motivo) estão no `CLAUDE.md`.
> Cada item tem: o que é, por que vale, onde mexe e o que precisa ser decidido antes.
>
> Os 6 itens abaixo foram aprovados de uma vez, nesta ordem de valor. Podem ser feitos um por vez.

## Estado atual (pra quem chega agora)

O produto já faz: gravar/enviar áudio → transcrever (Groq Whisper) → resumir (Groq chat) → PDF →
aviso na caixa de entrada por SSE. Além disso, já entregue e documentado no `CLAUDE.md`:

- transcrição com **timestamps clicáveis** (o `verbose_json` já devolvia os segmentos);
- **streaming de áudio por Range** com token de capacidade (WebM do navegador ainda baixa inteiro);
- **busca** no título + transcrição + resumo, que devolve o TRECHO e o segundo, e leva pra `?t=`;
- **perguntar sobre o áudio** (síncrono, nada gravado);
- **exclusão de conta (LGPD)**, reprocessar gravação pronta, título vindo da headline do resumo,
  wake lock ao gravar, retomar de onde parou, `/health` + heartbeat do worker, faxina de órfãos.

---

## 1. Tela de Tarefas (agrega os `action_items`)

**O que é.** Uma tela `/tarefas` com TODAS as pendências de todos os áudios, cada uma mostrando de
qual gravação veio (e, quando der, o minuto em que foi combinada). Marcar como feita persiste.

**Por que.** O resumo **já produz** `action_items` e eles morrem dentro do card de uma gravação. É
funcionalidade nova inteira **sem nenhuma chamada de IA a mais** — o dado já está gerado e pago. É a
diferença entre "o app resume reuniões" e "o app me diz o que eu tenho que fazer".

**Onde mexe.** Contexto novo `task` (`packages/task/{core,adapters}`) OU extensão do `summary` —
decidir. Migration nova. Rota `GET /task`, `POST /task/:id/done`. Item novo no `nav-items.ts`
(sidebar + bottom nav compartilham esse dado).

**A decidir antes.**
- A tarefa é **derivada** do resumo (recalculada a cada reprocessamento, e o "feito" se perde) ou
  **materializada** uma vez (linha própria, sobrevive ao reprocessamento)? Recomendação:
  materializada na criação do resumo, com chave (recordingId, texto) pra reprocessar não duplicar —
  mesma ideia do índice único da notificação.
- O que acontece com a tarefa quando a gravação é excluída: some junto (é o esperado, e o
  `RecordingEraser` é onde isso entra).

## 2. Tipos de áudio (templates de resumo)

**O que é.** Um `<select>` no composer ("reunião", "aula", "consulta médica", "entrevista", "outro")
e o worker escolhe o PROMPT por tipo. Aula → conceitos, dúvidas em aberto, o que estudar. Consulta →
sintomas, orientações, medicação, retorno. Entrevista → perguntas e respostas-chave.

**Por que.** Hoje existe UM prompt pra tudo. Isso muda a **qualidade do que sai**, não a aparência —
é o que faz alguém preferir isso a jogar o áudio num chat genérico.

**Onde mexe.** Coluna `kind` na `recordings` (+ migration), VO no `recording/core` (fail-closed:
valor desconhecido lê como "outro"), prompts no `apps/worker/src/extraction/`, select no composer.

**A decidir antes.**
- As seções do resumo mudam por tipo (`topics`/`action_items` viram outra coisa) ou só o texto muda?
  Recomendação: **manter o formato JSON atual** (headline/overview/topics/action_items) e variar só
  as INSTRUÇÕES do que colocar em cada campo — senão o `Summary`, o DTO, o PDF e a tela precisam
  virar polimórficos por um ganho pequeno.
- Reprocessar depois de trocar o tipo deve ser oferecido na tela (o botão já existe).

## 3. Compartilhar o resumo por link

**O que é.** Contexto novo `sharing`: `ShareLink` (token, recordingId, escopo, validade, revogado).
Uma tela **pública** `/s/:token` que renderiza o resumo sem login. Botão "compartilhar" no detalhe.

**Por que.** Transforma "meu resumo" em "o resumo que eu mandei pro time".

**Onde mexe.** Contexto novo + migration; route group `(public)` no front; rota pública no backend
(controller próprio FORA do `AuthMiddleware`, como o stream de áudio e o SSE já fazem).

**A decidir antes (privacidade — o projeto tem seção de LGPD, isso não pode ser feito no automático).**
- Validade **obrigatória** ou link eterno? Recomendação: obrigatória, com opções (24h, 7d, 30d).
- O escopo inclui o ÁUDIO e a TRANSCRIÇÃO ou só o resumo? Recomendação: só o resumo por padrão,
  áudio como opt-in explícito no momento de criar o link.
- Revogar é obrigatório (lista de links ativos no perfil).
- O link **não** pode virar acesso a nada além daquela gravação — mesma lógica do `purpose` no token
  de capacidade do áudio.

## 4. Marcadores e anotações no tempo

**O que é.** Clicar num trecho da transcrição e marcar ("importante") ou escrever uma nota ancorada
naquele segundo. Uma tela que junta os marcadores da biblioteca inteira.

**Por que.** É o que faz alguém voltar num áudio de três meses atrás. Só faz sentido agora, porque
os timestamps passaram a existir.

**Onde mexe.** Contexto novo `annotation` (recordingId, ownerId lógico, segundo, texto opcional),
migration, painel na tela de detalhe ao lado da transcrição, tela de listagem.

**A decidir antes.** Se a nota sobrevive ao reprocessamento (o segundo continua válido — o áudio não
muda, só a transcrição). Recomendação: sobrevive, porque a âncora é o TEMPO, não o segmento.

## 5. Tela de admin

**O que é.** `/admin` com usuários, uso de disco, gravações falhas, e os botões de promover a admin
e desativar conta.

**Por que.** O `role=admin` e a allowance de 1 GB já existem, mas promover alguém é `UPDATE` na mão
(está documentado como decisão consciente no `CLAUDE.md` — **este item muda essa decisão**, então
atualizar o guia junto).

**Onde mexe.** Guard de role no backend (o `UserDTO` já carrega `role`), rotas novas, route group
próprio no front escondido pra quem não é admin.

**A decidir antes.** Desativar conta volta a ser rota (hoje é SQL na mão, e a tela de perfil oferece
EXCLUSÃO, não desativação). Um admin desativando outra pessoa é diferente de alguém se excluindo —
não misturar os dois caminhos.

## 6. Dois detalhes que fazem parecer app nativo

- **Share target no PWA**: compartilhar um áudio de qualquer app do Android e o Audio Mind aparecer
  na lista. `share_target` no `manifest.ts` + uma rota que recebe o arquivo por POST e cai no fluxo
  de upload que já existe.
- **Pausar e retomar a gravação** (`MediaRecorder.pause()/resume()`), que hoje não existe: quem
  grava uma reunião de uma hora quer pausar no intervalo. Atenção: o cronômetro é medido pelo
  RELÓGIO (`Date.now() - startedAt`), então pausar exige descontar o tempo parado, senão a duração
  gravada mente.

---

## O que foi decidido NÃO fazer (e por quê)

- **Rate limit no login, CI e fatiar áudio em blocos** — o dono tirou do escopo de propósito.
- **Dashboard de métricas** ("horas gravadas", "tempo economizado"): enche o olho e não serve pra
  nada num app pessoal — os áudios já estão listados na tela inicial.
- **Baixar de URL do YouTube**: precisa de yt-dlp no container, quebra toda semana e tem uma zona
  jurídica que o projeto não quer.
- **Workspaces/times com permissão por recurso**: é outro projeto inteiro. O item 3 entrega a maior
  parte do valor de compartilhar com 5% do trabalho.
- **Timestamps no PDF ao lado de cada tópico**: os `topics` são PARÁFRASES, não citações — casar
  cada um com um segmento é adivinhação, e um minuto de aparência confiável ao lado de um texto que
  não foi dito ali é pior que não ter minuto nenhum. **Em aberto**: um apêndice com a transcrição
  inteira cronometrada resolveria de forma honesta, mas transforma o PDF de "o resumo" em um
  calhamaço de 10-15 páginas — é decisão de produto, não de implementação.

## Como trabalhar estes itens

Vale tudo que está no `CLAUDE.md` (modelagem rica, CQRS, portas, adapters no app, commit por escopo,
direto na `main`). Antes de declarar pronto:

```bash
npx turbo run build      # o check-types do web depende dos tipos que o next build gera
npx turbo run check-types test
```
