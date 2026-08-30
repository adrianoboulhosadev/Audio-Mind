# CLAUDE.md — guia de engenharia do Audio-Mind

Instruções e padrões deste monorepo. **Siga à risca** — estas decisões estão travadas.
Para contexto de produto, veja o `README.md`. Para o que ainda **vai** ser feito (fila combinada com
o dono, nada travado), veja o `ROADMAP.md`.

> **Idioma do código: INGLÊS.** O projeto inteiro é em inglês — tabelas/colunas do banco,
> arquivos, pastas, tipos, funções, variáveis, rotas, códigos de erro e comentários. **Nada de
> português no código.** Exceções deliberadas: o **texto que o usuário lê** (copy das
> notificações no `notification/core`, motivos de falha no worker, mensagens de erro do front) e
> o **prompt do LLM**, que pede um resumo em português. Este guia e as mensagens de commit ficam
> em PT.

## Duas bases de referência

Este projeto nasce cruzando dois repositórios já validados:

- **Devs-Bet** → **estrutura, convenções e modelagem**: monorepo Turborepo, pacotes por bounded
  context (`packages/<ctx>/{core,adapters}`), `shared`/`database` separados, modelagem rica
  (entidades com invariantes + value objects), CQRS, portas, eventos de domínio, driven adapters
  no app, `DomainExceptionFilter` global, JWT stateful, worker BullMQ, SSE sem polling,
  kebab-case, código em inglês.
- **Brainy-Career** → **o jeito de falar com o LLM**: `createGroqClient` compartilhado com
  `keepAlive: false`, fail-closed sem a chave, retry só no que é transitório, mapper puro entre a
  resposta do modelo e o tipo do domínio.

Onde os dois divergem, vale o que está escrito aqui.

## Visão geral

Monorepo **Turborepo + npm workspaces** em TypeScript. Arquitetura **hexagonal (ports & adapters)
por bounded context**, com **modelagem RICA** (entidades com comportamento e invariantes + value
objects; regras de negócio moram no modelo, não nos casos de uso).

Contextos de domínio: `auth`, `recording`, `transcription`, `summary`, `task`, `sharing`,
`notification`. O `auth` é a
**referência canônica** de fiação (core → adapters → backend).

Fluxo do produto: o usuário grava no navegador ou envia um arquivo → o backend guarda o áudio e
**enfileira** → o **worker** transcreve (Whisper), resume (LLM) e desenha o PDF → o usuário recebe
um aviso na caixa de entrada, com o resumo pronto e o PDF pra baixar.

**Deployables de produção: 2** — `backend` (API web) e `worker` (pipeline assíncrono). O `web` é o
front. O `database`/Redis sobem via docker no dev.

## Estrutura

```
packages/
  shared/                              # kernel: Id, Entity, AggregateRoot, DomainEvent, UseCase, EventPublisher, Validator, DomainError, Errors
  database/  (database)                # Prisma: schema + migrations + client gerado
  <contexto>/
    core/      (@<contexto>/core)      # src/{model,providers,use-cases} + index.ts; test/ irmão de src/
    adapters/  (@<contexto>/adapters)  # src/{controllers,facade,dto,@types,providers,model} + index.ts (sem testes)
apps/
  backend/   # NestJS: API. Driven adapters (repos Prisma, bcrypt, jwt, produtor BullMQ), middleware, controllers, SSE.
  worker/    # consumidor BullMQ que roda o pipeline (Groq Whisper + Groq LLM + pdfkit). Tem testes.
  web/       # Next.js (App Router) + Tailwind + TanStack Query + Axios + react-hook-form.
  database/  (container-db)            # docker-compose: Postgres + Redis (dev)
```

Contextos e scopes: `@auth/*`, `@recording/*`, `@transcription/*`, `@summary/*`, `@task/*`,
`@sharing/*`, `@notification/*`. `core` e `adapters` são **pacotes separados**. Workspaces:
`["apps/*","packages/shared","packages/database","packages/*/core","packages/*/adapters"]`.

## Modelagem rica (TRAVADA)

O `model/` NÃO é anêmico. Regras vivem no modelo:

- **Value Objects (VO)**: classe pequena que encapsula um conceito com regra própria (ex.:
  `AudioFile`, `RecordingTitle`, `TranscriptText`, `SummaryOverview`, `Email`, `StrongPassword`).
  Padrão:
  - **valida no construtor** e lança erro tipado (`ValidationError.throwError(...)`) se inválido;
  - expõe o dado por `value` (ou getters derivados, ex.: `transcript.wordCount`);
  - regex/limites são `static readonly` **dentro do VO**;
  - é **imutável** (`readonly`).
- **Entity base** (`Entity<T, Props>` no `shared`): carrega `id: Id` + `props`, com `equals`/`clone`.
- **Entidades ricas**: agregam VOs e **comportamento com invariantes**. O construtor recebe `Props`
  (com `id?` opcional — ausência = entidade nova), monta os VOs e **rejeita estados inválidos**.
  Métodos mutadores aplicam a transição validando a regra (ex.: `Recording.startSummarization()`
  lança `INVALID_RECORDING_STATUS` se a transcrição nunca aconteceu).
- **Use-cases orquestram, não regram**: carregam a entidade pela porta, chamam métodos do domínio
  (que se autovalidam) e persistem. Se você está escrevendo um `if` de regra no use-case, ele
  provavelmente pertence a um VO ou entidade.
- **Reconstituição no repositório**: o repo (Prisma e fakes) **reconstitui** a entidade via
  construtor a partir da linha (`new Recording({ id, title, ... })`) e **serializa** lendo os VOs
  (`recording.audio.url`). Sem helpers `toDTO/toDomain` genéricos — montagem **inline**. Use Prisma
  **tipado** (nada de `$queryRaw`).
- **CQRS mantido**: o lado de **leitura** devolve **DTO plano** (interface simples, sem entidade),
  montado direto da query. Entidade rica só no lado de **escrita**.

## Regras de arquitetura (TRAVADAS)

- **Casos de uso**: um por arquivo, `export default class implements UseCase<INPUT, OUTPUT>` com
  método público `execute`, dependências injetadas pelo **construtor** (DI manual). Constantes/regex
  de regra ficam **no VO/entidade**; nada de arquivos `validations.ts`.
- **CQRS**: porta de escrita `<X>Repository` + porta de leitura `<X>QueryRepository` (retorna DTO).
  **Comandos retornam `Promise<void>`**; só os casos de uso de leitura (`...Query`) retornam DTO.
  Consequência real e aceita: `UploadRecording` **não devolve o id** — o front volta pra lista, onde
  a gravação nova é a primeira linha, já mostrando o estágio do pipeline.
- **Ports** = interfaces em `core/src/providers`. **Driven adapters** (repos Prisma, bcrypt, jwt,
  fila, Groq, pdfkit) ficam **no APP que consome a porta** (`apps/backend` e/ou `apps/worker`),
  nunca nos pacotes de contexto. A **única infra compartilhada** é o `PrismaClient`, em
  `packages/database`. Os dois apps têm **repos Prisma próprios** da mesma tabela quando ambos
  consomem a porta — é o preço de o adapter morar no app, e é deliberado.
- **App NUNCA importa `@ctx/core` — só `@ctx/adapters`.** O `@ctx/adapters` é a **única superfície
  pública** do contexto e reexporta (curado) DTOs, portas, **entidades/VOs/eventos** e tipos de
  infra. **Só o pacote `adapters` importa o `core`.** Rodar um use-case a partir do app é sempre via
  controller/facade do adapters (ex.: o worker chama `RecordingFacade.startTranscription`, nunca
  `new StartRecordingTranscription`).
- **`core` só depende de `shared`** (e `uuid`, via shared). **Proibido**: Zod ou qualquer outra lib
  no core. Validação usa `Validator`/`ValidationError`/`Errors` do `shared`.
- **Adapters**: `controllers/` são presenters finos (instanciam o use-case e devolvem só o que o
  app precisa); `facade/` é a entrada única que o app chama (ports **opcionais** no construtor).
- **Controllers do backend (Nest)** montam a Facade num helper `private facade()` que injeta os
  driven adapters uma vez; cada rota chama `this.facade().xxx(...)`.
- **Eventos de domínio (TRAVADO)**: o que aconteceu é registrado como um **fato no passado** pela
  própria entidade, no exato ponto da transição. Base no `shared`: `DomainEvent` (só `occurredAt`),
  `AggregateRoot<T, Props> extends Entity` (com `protected record(event)` e `pullDomainEvents()`) e
  a porta `EventPublisher { publish(events) }`. Quem tem evento **estende `AggregateRoot`** em vez
  de `Entity` (hoje: `User`, `Recording`); as classes de evento ficam em `core/src/model/events.ts`
  e são reexportadas como **valor** pelo `@ctx/adapters` (o listener precisa da classe pra
  `instanceof`).
  - **`pullDomainEvents()` DRENA a lista** e a lista **nunca é `props`** — reconstituir uma linha do
    banco nasce sem evento; só transição feita na execução atual gera fato.
  - **Quem publica é o CASO DE USO**, com `eventPublisher?: EventPublisher` opcional no construtor,
    chamado **depois** do `repository.xxx(...)`.
  - **Evento de CRIAÇÃO é montado no caso de uso, não pela entidade** (`UserRegistered`,
    `RecordingUploaded`): o construtor serve tanto pra criar quanto pra RECONSTITUIR do banco, então
    ele nunca pode registrar nada.
  - **Onde os eventos viram notificação muda por app, e é decisão consciente**: no backend o
    `DomainEventListener` traduz **depois** do commit e **engole o próprio erro** (upload que deu
    certo não pode falhar porque a caixa de entrada falhou); no worker o `PipelineEventPublisher`
    faz o mesmo pro fim do pipeline. Os dois traduzem os próprios eventos em vez de compartilhar um
    tradutor: "o que a gente diz ao usuário quando o pipeline acaba" é copy do app, não regra de
    domínio.
- **Fronteiras**: contextos se tocam **só por portas**, nunca import direto entre cores.
  Orquestração cross-context fica na camada de app. Limites: `auth`=identidade/credencial;
  `recording`=o áudio e o estágio do pipeline; `transcription`=o texto que o modelo ouviu;
  `summary`=o que o LLM escreveu + o PDF; `task`=o que ficou pra fazer;
  `sharing`=quem pode ver isso sem ter conta; `notification`=caixa de entrada (não conhece nenhum outro
  contexto — quem dispara é a camada de app).
- **Dono é resolvido no app, sempre contra a `recording`**: `transcription` e `summary` **não sabem
  quem é dono de nada**. As rotas `GET /transcription/recording/:id` e `GET /summary/recording/:id`
  leem a gravação PRIMEIRO (o que já lança `RECORDING_NOT_FOUND` pra estranho) e só então pedem o
  derivado. A **exclusão** é o mesmo padrão, no `RecordingController`: resumo → transcrição →
  gravação → arquivos em disco.

### Exclusão de conta (LGPD)

- **`DELETE /user/me` é ELIMINAÇÃO, não desativação** — direito de eliminação dos dados pessoais
  (Lei 13.709/2018, art. 18, VI). A tela de perfil lista o que vai embora e só libera o botão depois
  que a pessoa marca que entendeu; o backend cumpre exatamente o que a tela promete.
- **A ordem é: derivados primeiro, identidade por ÚLTIMO.** Apagar o usuário antes deixaria toda
  gravação órfã atrás de um `ownerId` que ninguém resolve; do jeito certo, falhar no meio deixa uma
  conta que ainda funciona e pode tentar de novo.
- **O cascade de uma gravação mora no `RecordingEraser`** (app layer), não no controller: as MESMAS
  etapas na MESMA ordem servem "excluir esse áudio" e "excluir minha conta". Uma segunda cópia da
  ordem é uma segunda chance de esquecer o PDF no disco. A ordem é sempre **derivado primeiro**: links de
  compartilhamento, tarefas, transcrição, resumo, gravação e só então os arquivos em disco. Os links
  vão na frente porque tudo abaixo deixa de existir num instante, e uma URL pública viva é a única
  sobra que ainda responderia.
- A biblioteca inteira sai **por páginas** de 100 (o teto do lado de leitura): cada passada apaga o
  que leu, então a próxima volta menor e o laço termina numa página vazia. Nada de inventar uma
  porta de listagem sem teto só pra isso.

### Busca (cross-context, TRAVADO)

- **A ordem é sempre a mesma**: o `recording` diz **quais ids são do dono** (`listAllIdsByOwnerQuery`),
  `transcription` e `summary` dizem **quais desses casam** com o termo (ids entram, ids saem), e o
  `recording` responde com as **próprias linhas**. Nenhum dos dois derivados aprende o que é dono —
  é a mesma forma do resto do projeto.
- **Passar os ids do dono ANTES não é enfeite**: sem isso a busca de texto varreria a tabela inteira
  e o teto poderia gastar as vagas com gravação de outra pessoa antes de o filtro de dono rodar.
- **ILIKE (`contains` + `insensitive`), não full-text**: não precisa de coluna, índice nem
  dicionário, e a lista de ids já limita a varredura a uma biblioteca. O substituto, no dia em que
  doer, é uma coluna `tsvector` — e o único lugar que muda é o método do repositório.
- **Termo com menos de 2 caracteres devolve vazio**, nunca a biblioteca inteira: uma "busca" que
  casa com tudo não é busca.
- **O resultado diz ONDE casou**: a transcrição devolve o TRECHO e o segundo em que foi dito, e o
  card leva pra `/recordings/:id?t=<segundo>`. Achar o áudio é metade do trabalho; a outra metade é
  não fazer a pessoa caçar dentro de uma hora de gravação.
- **`findTranscriptMatch` prefere o SEGMENTO** a uma janela de caracteres, e não é só pelo
  timestamp: o segmento é uma frase que alguém falou, a fatia do texto começa e termina no meio de
  uma palavra. A janela é o fallback pra transcrição sem segmentos. Quem casou só pelo título ou
  pelo resumo **não ganha trecho** — apontar pra um lugar qualquer da transcrição seria apontar pro
  lugar errado.

## O pipeline (assíncrono)

Estados do `Recording`, e cada transição é um **método** que valida a própria precondição:

```
pending -> transcribing -> summarizing -> ready --(reprocessar, só o dono)--> pending
   \___________|_______________|______-> failed -> (retry) -> pending
```

- `ready` é terminal **pro worker**: `processRecording` sai na hora quando a gravação já está
  pronta, e é isso que faz um job reentregue ser inofensivo. Quem tira uma gravação de `ready` é
  **só o dono**, pelo botão de reprocessar — que existe pra uma gravação antiga ganhar o que o
  pipeline faz hoje (os trechos com timestamp, um modelo melhor). Reprocessar **substitui**
  transcrição e resumo (os dois são upsert por `recordingId`) e roda os dois modelos de novo, então
  a tela confirma antes.
- **`retry()` recusa o que já tem job em cima** (`pending`, `transcribing`, `summarizing`):
  `RECORDING_IN_PIPELINE`. Duas execuções sobre o mesmo áudio seriam dois workers escrevendo as
  mesmas linhas.
- `processRecording` (worker) é **RESUMÍVEL**: lê o status antes de agir. Quem morreu depois de
  gravar a transcrição está em `summarizing` e **não paga a transcrição de novo** — rodar o modelo
  outra vez custaria minutos e dinheiro pelo mesmo texto.
- **Falha é ESTADO, não linha de log**: qualquer exceção vira `recording.fail(motivo)` com um motivo
  que o dono entende (`failure-reason.ts` no worker traduz código de domínio → frase; o fallback é
  vago sobre a causa e preciso sobre o próximo passo). Uma gravação nunca pode ficar presa em
  "transcrevendo" com a causa só num log que ninguém lê.
- `fail()` guarda o **primeiro** motivo em caso de falha repetida — a primeira falha é a causa real,
  a da retentativa costuma ser consequência.
- **Transcrição e resumo são `upsert` por `recordingId`** (coluna única): reprocessar SUBSTITUI,
  nunca empilha.
- **Os `action_items` do resumo viram tarefas ali mesmo** (`SyncRecordingTasks`), antes do PDF:
  nenhuma chamada de modelo a mais, porque a lista já foi escrita e já foi paga. Reprocessar
  reconcilia em vez de empilhar — ver o contexto `task`.
- **O PDF é renderizado ANTES de a gravação ser marcada `ready`**, então "pronto" na caixa de
  entrada nunca aponta pra um botão de download que não faz nada.
- `SummarizeTranscript` e `RenderSummaryPdf` são use cases **separados**: falhar ao desenhar o
  documento não joga fora o texto que o modelo já produziu.

## IA (Groq) — o padrão do Brainy-Career

- **Todo cliente Groq usa `createGroqClient()`** (`apps/worker/src/extraction/groq-llm.ts`) —
  **nunca** `new OpenAI({...})` direto. Motivo real, já causou falha silenciosa em produção no
  projeto de referência: o SDK da OpenAI no Node usa por padrão um agent de keep-alive que reaproveita
  conexão por até 5min; a borda da Groq fecha conexão ociosa antes disso, e um processo de longa
  duração (com gaps reais entre jobs) acaba reusando socket morto → `"Premature close"`.
  `createGroqClient()` resolve com `httpAgent: new HttpsAgent({ keepAlive: false })`.
- **`GROQ_API_KEY` é fail-closed**: sem a chave o worker **recusa iniciar**. Um worker que sobe sem
  IA só serviria pra marcar todo áudio como falho.
- **O áudio é REAMOSTRADO antes de subir** (`audio-compressor.ts`): 16 kHz mono, Opus 32 kbps, via
  ffmpeg. O limite da API é de **BYTES, não de minutos**, e Whisper reamostra pra 16 kHz mono de
  qualquer jeito — mandar um master 48 kHz estéreo é gastar a cota com o que o modelo joga fora. Na
  prática o teto sai de "meia hora, se o formato ajudar" pra ~1h30 (medido: 494 MB → 16,8 MB). Opus e
  não FLAC porque FLAC é lossless e 25 MB compraria pouco mais que antes.
  - **Nunca lança por falta de ffmpeg**: cai pro arquivo original. Worker que recusasse transcrever
    uma gravação de 2 MB por não achar o ffmpeg trocaria um pipeline que funciona por um problema que
    aquele arquivo não tem. Quem decide se ficou pequeno o bastante é o chamador.
  - **Nunca manda MAIS bytes que o original**: reencodar arquivo já pequeno pode inchar.
  - O que ainda passa de 25 MB depois disso vira `failed` com motivo próprio — e o áudio **continua na
    biblioteca**, tocável e baixável.
  - `ffmpeg` está no `Dockerfile` do worker; `FFMPEG_PATH` sobrescreve o binário.
- **A MESMA chave serve pros dois passos**: `whisper-large-v3` (`audio.transcriptions`, com
  `response_format: 'verbose_json'` — é o que devolve o idioma) e o modelo de chat
  (`openai/gpt-oss-120b`, com `response_format: json_object` e `temperature` baixa). Modelos em
  variável de ambiente (`GROQ_MODEL`, `GROQ_TRANSCRIPTION_MODEL`). O default já foi
  `llama-3.3-70b-versatile` e **a Groq aposentou a família llama inteira** — foi o que motivou o
  fallback abaixo.
- **O modelo de chat é PREFERÊNCIA, não trava**: a Groq aposenta modelo e libera modelo por conta,
  então `404 The model ... does not exist or you do not have access to it` transforma **todo** áudio
  em `failed`, com a causa só no log do worker. O `GroqSummaryGenerator` tenta o modelo configurado
  e, **só** se a resposta for "esse modelo não / sem acesso", cai pro próximo de
  `CHAT_MODEL_FALLBACKS` — e **lembra qual funcionou** (o próximo job já começa por ele). Qualquer
  outra falha é falha DAQUELA chamada e sobe como está: trocar de modelo ali só gastaria cota com o
  mesmo erro. O resumo grava o modelo que **respondeu**, não o que estava configurado.
- **A leitura do JSON é tolerante** (`parseSummaryJson`): com `json_object` o `JSON.parse` direto
  bastaria, mas o fallback existe justo pra rodar num modelo que ninguém aqui testou, e modelo
  gosta de cercar o JSON com ```` ```json ```` ou uma frase. Pegar o objeto mais externo não é
  inventar conteúdo — o que o modelo não escreveu continua faltando, e o VO recusa igual.
- **Retry só no que é transitório**: 429, 5xx e falha de conexão. 4xx (chave inválida, request
  ruim) não — retentar só atrasa a falha que o usuário precisa ver. Backoff exponencial 5s → 40s.
- **O mapper é puro e NUNCA inventa conteúdo** (`summary-mapper.ts`): aceita as duas formas que um
  modelo de fato devolve (array de verdade ou uma string com um item por linha), tira o bullet que
  ele insiste em colocar, e deixa vazio o que não veio — pro VO recusar e o pipeline reportar falha,
  em vez de gravar um nada plausível.

## Erros de domínio

Use-cases, VOs e entidades lançam erros **tipados** do `shared` (base `DomainError`, com
`code`/`value`/`extras` + `throwError`/`create`). O domínio **não conhece HTTP** — quem traduz
tipo → status é o `DomainExceptionFilter` (global, em `apps/backend/src/shared`), por `instanceof`:

| Erro (shared)       | HTTP | Quando                                                                       |
| ------------------- | ---- | ---------------------------------------------------------------------------- |
| `ValidationError`   | 400  | entrada/regra de formato; **único acumulável** via `Validator.combineErrors` |
| `UnauthorizedError` | 401  | credencial inválida / não autenticado                                        |
| `AccessDeniedError` | 403  | autenticado, sem permissão                                                   |
| `NotFoundError`     | 404  | recurso inexistente                                                          |
| `ConflictError`     | 409  | estado duplicado/conflitante                                                 |

Use-case/domínio **nunca** lança erro interno/500. Códigos ficam em `Errors` (constantes no
`shared`); body de erro `{ statusCode, errors: [{ code }] }`.

- **PROIBIDO em controller**: `throw new BadRequestException(...)` e afins do `@nestjs/common`. O
  `DomainExceptionFilter` trata `HttpException` nativa como caso especial e devolve o corpo dela
  direto — **não** o formato `{ errors: [{ code }] }` que o front sabe ler, então a mensagem certa
  aparece no Network tab e o usuário vê o fallback genérico. Use
  `ValidationError.throwError(Errors.XXX)` / `NotFoundError.throwError(...)`, ou `requireFields`
  pra presença de campo.
- **TODO campo de entrada tem limite máximo no VO/entidade** — as colunas do Prisma são TEXT sem
  limite, então sem isso um request forjado grava uma string gigante e ainda infla todo log no
  caminho.
- **Erro de "grande demais" NUNCA carrega o valor**: `Validator.maxLength` passa só
  `{ max, length }`. Devolver o payload gigante é exatamente o abuso que o limite existe pra barrar.
  Mesma coisa pra **segredo**: `StrongPassword` não ecoa a senha recusada.
- **Recurso de terceiro responde 404, não 403**: gravação, transcrição, resumo e notificação são
  privados, então confirmar que um id existe já vazaria algo. (Diferente de um recurso público, onde
  esconder seria teatro.)

## Contextos

- **auth** — identidade/credencial. `User` (`email`, `password`, `name` display-only, `active`) e
  `AuthSession`. JWT access 15m + refresh 7d **stateful** (rotação + detecção de reuso: refresh
  autêntico mas não-atual → apaga a família). VOs: `Email`, `StrongPassword`, `PasswordHash`,
  `DisplayName`. `LoginUser` responde o **mesmo erro genérico** pra e-mail inexistente, senha errada
  e conta desativada. `DeleteUser` **APAGA a linha** e derruba **todas as sessões** — uma conta que
  deixou de existir não pode continuar logada em outro dispositivo até o refresh expirar.
  **Desativar (`active=false`) não é rota**: é `UPDATE users SET active=false` rodado à mão, como
  promover a admin. O que o produto oferece ao usuário é **exclusão**, não conta desativada com os
  dados guardados atrás (ver "Exclusão de conta (LGPD)"). **Cadastro é aberto** e toda conta nasce
  comum: registrar **não loga**, o usuário cai no login com a conta criada, então existe um caminho
  só pra virar sessão.
- **recording** — o áudio e o estágio do pipeline. `Recording` (AggregateRoot) + VOs `AudioFile` e
  `RecordingTitle`. `AudioFile` é onde moram os limites que fazem um arquivo ser processável:
  formato aceito pelo modelo (mp3, m4a/mp4, wav, ogg, flac, webm — **com os aliases**, porque
  navegador chama o mesmo container de nomes diferentes) e os **tetos de tamanho/duração**. Duração
  **zero é o navegador falhando na metadata**, não áudio curto — por isso é recusada. `source` (`record`/`upload`) é só o que o usuário fez; o pipeline não ramifica.
  Renomear e **trocar o tipo** são as únicas coisas editáveis depois do upload — o resto é o que
  foi de fato gravado. Renomear tem uma exceção que não é edição do usuário: `RecordingTitle.PLACEHOLDER` ("Áudio sem título") é a marca de que **ninguém nomeou** a
  gravação, e o fim do pipeline oferece a headline do resumo pra ela (`adoptSuggestedTitle`). Título
  que a pessoa digitou nenhum modelo pisa em cima. O placeholder mora no VO, não no front, porque é
  regra e não label. `GetRecordingForProcessingQuery` é a
  leitura do SISTEMA (sem dono, porque um job de fila não tem chamador autenticado) e é um use case
  **separado** de propósito: um `ownerId?` opcional está a um argumento esquecido de virar leitura
  sem guarda numa rota HTTP.

### Tipos de áudio (templates de resumo)

- **`RecordingKind`** (`meeting`, `class`, `medical`, `interview`, `note`, `other`) é união +
  `toRecordingKind` **fail-closed**, como `UserRole` e `RecordingSource` — não é classe porque não
  carrega regra além de "seja um destes". Coluna `kind` com default `'other'`, então **toda linha
  que já existia continua produzindo exatamente o resumo de antes**.
- **O PROMPT de cada tipo mora no adapter do worker** (`summary-prompts.ts`), não no `summary/core`:
  prompt é infraestrutura, igual ao id do modelo e à política de retry. O `kind` atravessa a porta
  como **string opaca** — o contexto `summary` não interpreta.
- **O FORMATO do JSON é o mesmo pra todos os tipos** (headline/overview/topics/action_items); o que
  muda são as INSTRUÇÕES do que colocar em cada campo. Deixar as seções polimórficas custaria uma
  variante no `Summary`, no DTO, no PDF e na tela — por um ganho que o usuário não vê. O que muda a
  qualidade da resposta é a instrução.
- **`changeKind` é editável depois do upload** e vale só da PRÓXIMA execução em diante (a que está
  rodando já leu o tipo com que começou). A tela diz isso e oferece o botão de reprocessar, que já
  existe — o domínio recusar a edição só faria a pessoa ter que pedir de novo depois.
- Rota própria (`PATCH /recording/:id/kind`), não um campo do renomear: são dois comandos.

### Limites de upload por papel (TRAVADO)

- **Os tetos NÃO são constante** — dependem de quem está subindo. `AudioFile.ALLOWANCES` tem
  `standard` (**25 MB / 30 min**, o teto da própria API de transcrição) e `extended`
  (**1 GB, sem teto de duração**). Duração **zero** continua recusada nos dois: é metadata quebrada.
- **`AudioAllowance` é conceito de `recording`, não de `auth`.** O contexto do áudio não sabe o que é
  role; quem lê a role e escolhe a allowance é a camada de app (`apps/backend/src/auth/upload-allowance.ts`),
  que é exatamente o que impede os dois contextos de se importarem.
- **A allowance viaja AO LADO do `ownerId`, nunca no corpo** (`facade.uploadRecording(ownerId,
allowance, input)`). Cliente que pudesse nomear o próprio teto nomearia o maior.
- **O teto é regra de ADMISSÃO, não invariante da linha.** `AudioFile` só confere os limites quando
  recebe `admissionLimits`; um repositório reconstituindo uma linha não passa nenhum. Sem isso, apertar
  a allowance amanhã tornaria o arquivo de 900 MB de ontem impossível de carregar.
- **`AudioFile.limitsFor()` é fail-closed**: allowance ausente ou desconhecida = a apertada.
- **O upload usa interceptor próprio** (`AudioUploadInterceptor`), não o `FileInterceptor` do Nest:
  o `FileInterceptor` fixa as opções do multer na decoração e não consegue dizer "25 MB pra esse,
  1 GB pra aquele". Rodar o multer por request também é o que faz o excedente ser abortado NO MEIO
  do stream (conta comum não escreve 1 GB no disco pra só então ouvir não) e devolver
  `AUDIO_TOO_LARGE` no envelope de domínio, em vez do 413 do Nest que o front não sabe ler.
- **`GET /upload/allowance`** devolve os tetos do chamador. O front busca em vez de importar
  constante — a UI precisa dizer o número certo pra ESSA conta.
- **Virar admin é `UPDATE users SET role='admin'`**, rodado à mão por quem é dono do banco. Não existe
  tela, rota nem convite: promover é raro e deliberado, e não tem por que ser um botão. `toUserRole`
  é fail-closed — qualquer coisa que não seja exatamente `'admin'` lê como usuário comum, então um
  typo no UPDATE nunca dá privilégio.

- **transcription** — o texto que o modelo ouviu. `Transcription` + VOs `TranscriptText` e
  `TranscriptSegment` (o trecho com o momento em que foi dito — o `verbose_json` já devolvia isso na
  MESMA resposta do texto, e a tela usa pra pular o player pra linha clicada). **Trecho torto é
  DESCARTADO pela entidade, não reprova a transcrição** (mesma regra do bullet vazio no resumo):
  o texto é o registro, os trechos são um índice pra dentro dele. **Resposta
  vazia NÃO é transcrição** (`EMPTY_TRANSCRIPT`): silêncio, arquivo ilegível ou chamada falha têm
  que virar gravação FALHA que o usuário entende, nunca resumo de nada. A porta
  `SpeechToTextProvider` recebe **caminho absoluto** — o domínio nunca resolve onde fica a pasta de
  uploads.
- **summary** — o que o LLM escreveu + o PDF. `Summary` + VOs `SummaryHeadline`/`SummaryOverview`/
  `SummaryBullet` (tetos diferentes porque dizem coisas diferentes: um título é uma linha, um
  overview são parágrafos, um bullet é uma frase). Máximo de **12 bullets** por lista — mais que
  isso o modelo está transcrevendo, não resumindo. Bullet **vazio é descartado**, não reprovado:
  reprovar o áudio inteiro por uma linha em branco no fim da lista seria absurdo. O **conteúdo é
  congelado na criação** (não existe `edit`); a única coisa que muda depois é o `pdfUrl`.
  **Perguntar sobre o áudio mora aqui** (`AskAboutTranscript` + porta `TranscriptQuestionAnswerer`):
  "o que o LLM escreveu sobre essa gravação" é exatamente este contexto — a diferença pro resumo é
  que ninguém pediu antes, então **nada é gravado**. Roda DENTRO do request (segundos, com a pessoa
  esperando), ao contrário dos dois passos do pipeline, e o adapter da Groq mora no `apps/backend`,
  com a lista de fallback duplicada de propósito (driven adapter mora no app que consome a porta).
- **task** — o que ficou pra fazer. `Task` + VO `TaskText` (mesmo teto do `SummaryBullet`, porque a
  tarefa É um bullet promovido: se os dois discordassem, o pipeline aceitaria um resumo e depois
  falharia ao materializar os próprios itens dele). **MATERIALIZADA, não derivada** — e essa é a
  decisão inteira: tarefa lida do resumo na hora não teria onde lembrar que foi marcada, e
  reprocessar o áudio desmarcaria tudo em silêncio. A idempotência vem do banco
  (`@@unique([recordingId, text])` + `createMany({ skipDuplicates: true })`), igual à da notificação.
  `SyncRecordingTasks` **reconcilia** em vez de reescrever: insere o que é novo e apaga o que o
  modelo parou de dizer **só enquanto pendente** — o que a pessoa já marcou é registro de algo que
  ela FEZ, e nenhuma leitura posterior do áudio apaga isso. O contexto não sabe o título da gravação
  (quem junta é a camada de app, ids pra lá, linhas pra cá — a mesma forma da busca).
  **O minuto em que a tarefa foi combinada NÃO é mostrado**, pelo mesmo motivo do timestamp no PDF:
  `action_items` são paráfrases, e casar cada uma com um segmento seria adivinhar um momento com
  cara de certeza.
- **sharing** — quem pode ver um resumo **sem ter conta**. `ShareLink` + VOs `ShareToken`,
  `ShareScope` e `ShareWindow`. Três coisas são **invariante, não configuração**: o link abre **UMA**
  gravação, **sempre expira** e pode ser **revogado** a qualquer momento — e `isUsable()` é o único
  lugar onde as três são decididas, pra nenhum chamador checar duas e esquecer a terceira.
  - **Não existe link eterno** (`ShareWindow` = 24h/7d/30d, fail-closed pra a MAIS CURTA): o
    resultado padrão de esquecer um link tem que ser ele parar de funcionar. Não é campo de data
    livre porque um campo de data convida "31/12/2099".
  - **O escopo é opt-in explícito**: o resumo sempre vai; transcrição e áudio só se marcados. Cada
    palavra que alguém falou e a voz da pessoa não são a mesma coisa que "o resumo que eu escrevi".
  - **`ShareToken` são dois uuid v4 sem hífen** (64 hex, ~244 bits do mesmo CSPRNG dos ids). Dois e
    não um porque um uuid na URL parece id interno, e isso é **credencial**.
  - **Revogar guarda a linha** (só apagar a GRAVAÇÃO apaga os links dela): o dono precisa poder ver
    que o link existiu, foi aberto N vezes e foi cortado. Compartilhar de novo é link NOVO.
  - **Conta aberturas, nunca quem abriu** — sem ip, sem user agent, sem identidade. O dono precisa
    saber que está sendo usado pra decidir cortar; virar rastreador de quem recebeu seria coletar
    dado pessoal que ninguém consentiu.
  - **Expirado, revogado e inexistente respondem DIFERENTE** de propósito: só quem já tem um token
    válido chega a ver "expirou"/"revogado", e saber qual é evita concluir que o app quebrou. Token
    que não existe responde sempre a mesma coisa.
  - O `PublicShareController` fica **FORA do `AuthMiddleware`** (é por classe), como o stream de
    áudio e o SSE. A resposta pública é um **payload próprio**, não os DTOs das telas privadas: sem
    dono, sem id de usuário, sem id de gravação, sem nome de modelo.
- **notification** — caixa de entrada (sininho + tela `/notifications`). `Notification.for(input)`
  é um factory com `switch` sobre uma **união discriminada**, então nenhum caller inventa campo nem
  esquece o motivo de uma falha, e a copy fica numa decisão só em vez de espalhada por dois apps. O
  texto é gravado **já renderizado** — a notificação é o registro do que foi dito na época.
  Tipos: `welcome` (cadastro), `recording_ready` e `recording_failed` (fim do pipeline, o segundo
  **carregando o motivo**). **Idempotência vem do banco**: `@@unique([userId, type, referenceId])` +
  `createMany({ skipDuplicates: true })`, então job reprocessado não duplica; evento sem referência
  (`welcome`) pode repetir de propósito (no Postgres dois NULL nunca colidem).

## Rotas HTTP

**Nomes de rota em INGLÊS** (kebab-case):

- `auth/{register,login,refresh}`
- `user/{me,change-password,logout}` (`GET /user/me` devolve a identidade; `PATCH /user/me` edita o
  nome; **`DELETE /user/me` apaga a conta e TUDO do usuário** — ver "Exclusão de conta (LGPD)")
- `upload/audios` (POST — só o próprio usuário autenticado; devolve `{ url, mimeType, sizeBytes }`)
- `recording` (`POST /`, `GET /`, `GET /search?q=` [título + transcrição + resumo], `GET /:id`,
  `PATCH /:id` [renomear], `PATCH /:id/kind` [tipo do áudio], `DELETE /:id`,
  `POST /:id/retry`, `GET /:id/audio` [download inteiro], `GET /:id/audio/link` [devolve o link
  assinado do streaming]) e `recording/stream/:id` (GET, **Range**, autenticado por token de
  capacidade na query string — ver "Áudio: streaming por Range")
- `transcription/recording/:id` (GET)
- `summary/recording/:id` (GET), `summary/recording/:id/pdf` (GET, download) e
  `summary/recording/:id/ask` (POST — pergunta sobre o áudio, respondida na hora)
- `share` (`POST /recording/:recordingId` [cria o link], `GET /` [`?recordingId=`, os links do dono],
  `DELETE /:id` [revoga]) e `share/public/:token` (GET, **sem login** — o token é a autorização
  inteira) + `share/public/:token/audio` (GET, **Range**, só se o link incluir o áudio)
- `task` (`GET /` [`?status=pending|done|all`, `?limit=`; devolve `{ pendingCount, items }`, cada item
  com a tarefa e o título da gravação de onde saiu], `PATCH /:id` [`{ done }` — marca e desmarca])
- `notification` (`GET /` [`?limit=`, devolve `{ unreadCount, items }`], `POST /read-all`,
  `POST /:id/read`, `DELETE /:id`, `DELETE /`, `GET /stream` [**SSE**, ver abaixo — é a **única**
  rota autenticada por token na query string, porque `EventSource` não manda header])

**Anti-IDOR na borda**: o `AuthMiddleware` (aplicado **por classe** de controller via
`forRoutes(XController)`, nunca por path-string) valida o token e resolve o id autenticado;
controllers usam **sempre** esse id (via `@authenticatedUser`), nunca id vindo do corpo/rota.

## Uploads (armazenamento local, sem nuvem)

- Arquivos ficam em **`apps/backend/uploads/{audios,summaries}`**. A pasta é gitignored e, no
  compose, é um **volume nomeado** — recriar o container não pode apagar o áudio de ninguém.
- **O worker enxerga a MESMA pasta** (o volume é montado nos dois): ele lê o áudio dali e escreve o
  PDF de volta. Daí `UPLOADS_DIR` ser variável de ambiente e não constante — os dois processos veem
  o mesmo diretório em caminhos absolutos diferentes.
- **A pasta NÃO é servida estaticamente.** Áudio e resumo são privados, e um mount estático
  entregaria todo arquivo a quem descobrisse a URL. Eles saem por **rota autenticada**
  (`/recording/stream/:id`, `/summary/recording/:id/pdf`). Pro áudio isso virou **streaming por
  Range** com token de capacidade (ver "Áudio: streaming por Range"); só o WebM gravado no navegador
  ainda baixa inteiro como blob, porque o container não é buscável.
  ⚠️ No caminho do blob, `URL.revokeObjectURL` no teardown não é opcional: sem ele cada visita à
  tela vaza outra cópia do arquivo na memória.
- **`resolveUploadPath` recusa caminho que escape da raiz de uploads.** O caminho chega no **CORPO**
  do request (o cliente sobe o arquivo, recebe o caminho e depois posta na criação da gravação), então
  sem essa checagem um `/uploads/../../etc/passwd` forjado seria lido e servido. Mora na camada de
  app, não no domínio — o domínio sabe que o áudio tem um caminho, não onde fica o disco.
- **Mime do navegador vem com parâmetro** (`audio/webm;codecs=opus`) e o `MediaRecorder` sempre
  manda assim. `normalizeMimeType` tira os parâmetros uma vez, na borda.
- O nome do arquivo salvo é **um uuid**, nunca o nome que o cliente mandou: isso deixaria o request
  escolher onde o arquivo cai e o que sobrescreve.

### Áudio: streaming por Range (TRAVADO)

- **O `<audio>` não manda header**, e a pasta de uploads não é pública — então tocar por URL exige
  credencial NA URL. Não é o access token: é um **token de capacidade** (`audio-access-token.ts`)
  assinado com o mesmo `JWT_SECRET`, que vale **2h**, cita **UMA** gravação e traz `purpose`. Um
  token de capacidade que servisse como access token seria um buraco; o `purpose` é o que fecha.
- **O dono é reconferido contra a gravação** mesmo com o token citando o id: capacidade não
  substitui a regra que responde `RECORDING_NOT_FOUND` pro áudio dos outros.
- **`RecordingStreamController` fica FORA do `AuthMiddleware`** (que é por classe e lê header),
  exatamente como o `NotificationStreamController`. Autenticação por **guard**.
- **WebM gravado no navegador continua baixando inteiro** (`GET /:id/audio`, header): o container do
  `MediaRecorder` não tem duração no header nem índice de busca, então NENHUM player consegue pular
  nele por byte range — precisa do arquivo na mão. Range ali não compraria nada e custaria a barra
  de progresso. Todo o resto (mp3, m4a, wav, ogg, flac) toca por streaming.
- **416 é resposta de verdade** (`Content-Range: bytes */size`): player que pede range inválido
  precisa ouvir isso, não um 200 com o arquivo todo.
- No nginx o bloco do stream tem `proxy_buffering off` — com buffering o Nginx tenta ler a resposta
  inteira do upstream, que é exatamente o oposto de "me manda 300 KB perto do minuto 40".

## Banco de dados

- Prisma em **`packages/database`**: `prisma/schema.prisma` + client gerado em `generated/`
  (gitignored). Backend e worker fazem `import { PrismaClient } from 'database'`.
- **Models/tabelas**: `User`(users), `AuthSession`(auth_sessions), `Recording`(recordings),
  `Transcription`(transcriptions; `recording_id` **único**), `Summary`(summaries; `recording_id`
  **único**; `topics`/`action_items` são `String[]` — são os bullets do próprio resumo, sempre lidos
  e escritos com ele e nunca consultados sozinhos), `Task`(tasks; `recording_id`+`text` **único**),
  `Notification`(notifications; `@@unique([userId, type, referenceId])`). FKs entre contextos são **lógicas** (sem relation Prisma
  cruzando contexto). Colunas snake_case via `@map`.
- **MIGRATIONS (TRAVADO) — nada de `db push`.** O schema evolui por migration versionada em
  `packages/database/prisma/migrations/`, commitada junto com a mudança do `schema.prisma`.
  - **Mudou o schema?** `npm run db:migrate -- --name <descricao>` (= `prisma migrate dev`).
  - **Subir o que falta** (boot de dev, deploy): `npm run db:deploy` (= `prisma migrate deploy`) —
    só replica migrations já commitadas, nunca cria nem edita uma. É o que o `npm run dev` roda e o
    que o Dockerfile do backend executa antes de servir tráfego.
  - `0_init` foi gerada com `prisma migrate diff --from-empty` e **aplicada de verdade** contra um
    Postgres 16.

## Worker e fila

- O upload **enfileira** via porta `RecordingProcessingQueue` (produtor BullMQ no backend, fila
  `recording-processing`). O **worker** consome e roda `processRecording`. Os literais da fila
  precisam bater entre produtor e consumidor.
- **A ordem importa no `UploadRecording`**: o job só é enfileirado DEPOIS de a linha existir, senão
  um worker rápido pega um id que o banco nunca ouviu falar.
- `concurrency` vem de `WORKER_CONCURRENCY` (default 2): cada job segura um arquivo aberto e espera
  duas chamadas de modelo, e o rate limit é por chave de API, não por processo.
- **Todo `catch` que marca algo como falho PRECISA logar o erro** antes de gravar o status — um
  `catch` vazio não lança, então nem o `Worker.on('failed')` do BullMQ percebe: o job "completa" e a
  causa real fica invisível.

## Notificação ao vivo (SSE) — sem polling

**Não existe polling no front.** O backend **empurra** um aviso e o front só reage:

- **Redis pub/sub** é o transporte (`notifications-{userId}`, um canal por destinatário — nenhum
  filtro no cliente e zero chance de vazar a atividade de um pro outro). Redis e não um emitter em
  memória porque **quem publica é o worker**, um processo diferente de quem segura a conexão do
  usuário. O literal do canal precisa bater entre `apps/backend/src/notification/live-updates.ts` e
  `apps/worker/src/notification/live-updates.ts`. Publicar exige **conexão própria**: uma conexão em
  modo `subscribe` recusa comando normal.
- **O payload não tem significado** (`data: refresh`). O cliente relê `/notification`. Mandar o
  conteúdo duplicaria o read model em dois transportes.
- **SSE e não WebSocket**: o tráfego só vai num sentido e o `EventSource` **reconecta sozinho**.
- **Autenticação**: `EventSource` não manda header customizado, então o access token vai na **query
  string** — contrapartida aceita (é o MESMO token de 15min que já circula, direto pro nosso
  backend). Feito por **guard** (`StreamAuthGuard`) e não dentro do handler, porque guard roda antes
  e devolve **401 de verdade**; um handler `@Sse` **não pode ser async** (o Nest não faz `await` no
  retorno dele).
- **`NotificationStreamController` fica FORA do `AuthMiddleware`** (que é por classe e baseado em
  header) — daí ser um controller separado do `NotificationController`.
- **Não vaza conexão**: cada stream abre a sua conexão Redis e o teardown do `Observable` a fecha
  quando o cliente desconecta.
- Front: `useNotificationStream` montado **uma vez** no `(private)/layout.tsx`, invalidando a cada
  ping `['notifications']` **e `['recordings']`**. Toda notificação deste app é sobre uma gravação
  que mudou de estado — sem invalidar a lista, o usuário via "resumo pronto" no sininho enquanto a
  tela ao lado ainda dizia "transcrevendo" até um F5, que é exatamente a espera que o push existe
  pra remover. O token vive numa variável de módulo que um hook não consegue observar, então
  `setAccessToken` avisa os interessados via `onAccessTokenChange` e o stream se reabre sozinho
  quando o token gira. **Nada de retry manual**: fechar o `EventSource` é o que quebraria a
  reconexão nativa.

## apps/web (Next.js SPA)

**Stack travada**: Next.js (App Router) + **Tailwind** + **TanStack Query** + **Axios** +
**react-hook-form**. **SEM zod** no front (validação de negócio já está no domínio; no front só
validação de UI simples).

- **A paleta vive em `globals.css` como CSS vars** e é mapeada no `tailwind.config.ts` — componentes
  dizem `bg-panel`/`text-muted`, **nunca** cor crua do Tailwind (`slate-*`, `red-*`). Cor que vem de
  **DADO** usa `style={{}}` (o Tailwind não gera classe dinâmica).
- **TODO componente é uma PASTA com `index.tsx`** — `components/button/index.tsx`, nunca
  `components/button.tsx`. Isso é o que deixa cada componente carregar o que é dele:
  `<componente>/hooks/` e `<componente>/data/`.
- **Visual ≠ lógica**: o `index.tsx`/`page.tsx` é só JSX; states, effects, handlers e chamadas moram
  num hook. **Onde o hook fica diz de quem ele é**: hook de UMA tela → `<rota>/hooks/`; hook de UM
  componente → `<componente>/hooks/`; o que várias telas compartilham fica em `src/hooks/`. **Duas
  exceções**: chamada isolada de hook de terceiro sem state próprio ao lado, e função pura de
  formatação.
- **`hooks/`, `data/` e `types/` sempre com nome descritivo** — **nunca** um `index.ts` dentro
  delas. Só o **componente** tem `index.tsx`.
- **Dado fixo SEMPRE em `data/`** — nunca solto no topo de um `.tsx`. O nível segue **quem usa**
  (`data/` do componente, da rota, ou `src/data/` global). **Tipo união que enumera um dado mora
  JUNTO do dado** (`ButtonVariant` com `BUTTON_VARIANT_CLASSES`, `InboxFilter` com `FILTERS`).
  Escalar de ajuste local (`BADGE_CAP = 99`) pode ficar inline junto de quem usa.
- **Dado estático → `data/`; lógica (parse, cálculo, formatação) → `lib/`.**
- **`page.tsx` É a tela** — ele mesmo tem o JSX e chama o hook da rota. `<rota>/components/` guarda
  só os **pedaços**.
- **JSX de wrapper repetido entre `page.tsx` do MESMO route group sobe pro `layout.tsx` do grupo**
  — foi o caso do card centralizado do `(public)`. ⚠️ A guarda de `Loading fullScreen` fica **fora**
  desse wrapper: ela reivindica a viewport inteira e o `max-w-md` do card a espremeria.
- **Caixa centralizada precisa de `min-w-0`; rótulo de botão quebra abaixo de `sm`** — a largura
  mínima automática de um item de flex/grid é o min-content dele, então um filho que não quebra
  estica a caixa além da viewport, e item que transborda **deixa de ser centralizado**.
- **Não existe `AppShell`**: `Sidebar` e `Header` são compostos direto no `(private)/layout.tsx`
  (que também abre o SSE). Um componente que só embrulha outros dois não ganha nada por existir.
- **A navegação é COLUNA no desktop e BARRA INFERIOR no mobile** — `Sidebar` (`hidden lg:flex`) e
  `BottomNav` (`lg:hidden`), dois componentes, não um responsivo. Já foi gaveta e não devia: uma
  gaveta compra espaço pra menu longo cobrando um toque por viagem, e este app tem TRÊS telas — só
  colocava o app inteiro atrás de um hambúrguer. O que os dois precisam concordar (a lista de telas)
  é compartilhado como DADO (`sidebar/data/nav-items.ts`), não como componente. A barra leva
  `pb-[env(safe-area-inset-bottom)]` e o `main` leva `pb-24 lg:pb-6`, senão ela cobre o fim da página.
- **Route groups por acesso**: `(public)` (login/register), `(private)` e `(shared)` (a página de um
  link compartilhado, `/s/:token`). Guard no `layout.tsx` do grupo, nunca por página — e o
  `(shared)` **não tem guard nenhum**, de propósito: o token na URL é a autorização, e quem confere
  é o backend. Ele é um grupo separado do `(public)` porque aquele redireciona quem já está logado e
  espreme tudo num card estreito, e um resumo compartilhado é um DOCUMENTO.
- **Ícones são do `lucide-react`** — antes eram SVG inline num mapa `ICONS`, o que parava de pagar
  assim que ação virou ícone em três telas. Ação só com ícone SEMPRE passa pelo `IconButton`, que
  carrega o rótulo como `aria-label` E como tooltip (a mesma string, então não divergem). O tooltip é
  CSS num irmão, não `title=`: `title` demora ~1s, não aceita a paleta e nunca aparece pra quem
  navega por teclado.
- **Tooltip perto da borda direita abre pra ESQUERDA** (`tipSide="left"`). Não é estética: um tooltip
  centralizado é posicionado em absolute, e passando da borda ele ALARGA o documento — a página
  inteira ganha rolagem horizontal no celular.
- **Reusar os tipos dos `@ctx/adapters`** via `import type`. Não redeclarar contratos. O
  `AudioFile.MAX_SIZE_BYTES` usado pra avisar antes do upload vem do **próprio VO** reexportado —
  duplicar o número seria uma UI que promete o que o domínio recusa.
- **DTO diz `Date`, mas por JSON chega STRING**: `lib/format.ts` reembrulha (`new Date(valor)`)
  antes de formatar. Chamar `.toLocaleDateString()` direto num campo vindo da API quebra a tela.
- **Auth do SPA**: `accessToken` **em memória** (nunca localStorage); refresh no cookie httpOnly;
  axios com `withCredentials`; interceptor de 401 chama `/auth/refresh` (**dedup do refresh em
  voo** — sem isso cinco requests simultâneos rotacionam o token cinco vezes e a detecção de reuso
  derruba a sessão inteira) e repete; silent refresh no boot.
- **A tela lembra onde você parou** (posição por gravação no `localStorage`, por navegador — é
  conveniência, não fato sobre a gravação) e o `?t=` da busca ganha dela. Chegar ao fim esquece a
  posição. A transcrição **acompanha** o áudio e para de seguir por 6s quando a pessoa rola com a
  mão — sem isso, reler uma linha vira briga com o player, e o player sempre ganha.
- **Gravar segura a tela acesa** (`navigator.wakeLock`): no celular a tela apagando suspende a
  página, e página suspensa não alimenta o `MediaRecorder` — que é exatamente o caso de deixar o
  telefone na mesa numa reunião de 40 minutos. Best-effort (nem todo navegador tem) e retomado a
  cada `visibilitychange`, porque o lock morre quando a aba esconde e o navegador não devolve.
- **O player é NOSSO** (`audio-player/`), com o `<audio>` sem `controls`. O nativo é pintado pelo
  Chromium como uma barra branca — a única superfície do app que ignorava a paleta, no topo de toda
  tela de detalhe. Ter os controles também é o que dá pular 15s e velocidade de reprodução, que é o
  que se quer de uma hora de reunião. O `<audio>` continua sendo a fonte da verdade de tempo e
  estado; o hook só espelha. Os controles **quebram linha** (`flex-wrap`) porque a 390px os chips de
  velocidade saíam da tela.
- **A duração do áudio é medida no NAVEGADOR** (`lib/audio-duration.ts`): o servidor teria que
  decodificar o arquivo pra saber, o que significa embarcar ffmpeg pra preencher uma coluna. O
  vaivém com `Infinity` não é paranoia — um WebM do `MediaRecorder` não carrega duração no header, e
  o navegador só resolve depois de um seek pro fim. Áudio **gravado aqui** nem passa por isso: a
  duração vem do relógio, porque estávamos presentes o tempo todo.

## Testes

- Têm testes: **`core`**, **`shared`**, **`apps/worker`** e **`apps/web`**. Os testes cobrem **invariantes de
  VOs/entidades** (`AudioFile` recusa 25 MB+, `Recording` não pula etapa, `TranscriptText` recusa
  vazio) além dos use-cases.
- Use-cases testados com **fakes das portas em memória** em `test/in-memory/` (cada fake
  `export default`; `index.ts` reexporta com nome). Testes importam de `'../src'`.
- O fake da notificação **replica o índice único** de (userId, type, referenceId): um fake sem ele
  deixaria passar um teste que o banco de verdade recusaria.
- No worker os testes cobrem o **mapper** (o modelo devolvendo lixo), os **motivos de falha** e o
  **`processRecording`** ponta a ponta com dublês — o que se testa ali é a ORDEM e a
  resumibilidade, não os adapters.
- **No `apps/web` (jsdom + Testing Library) o alvo é CONTRATO de componente, não pixel.** O app ficou
  sem teste até um `Field` que não era `forwardRef` engolir calado o ref do react-hook-form: o
  `check-types` passava, o `build` passava, e ninguém conseguia logar. React só avisa do ref
  descartado em desenvolvimento, então é exatamente a classe de bug que precisa de teste.
- Jest + ts-jest; `moduleNameMapper` resolve `shared`/`@ctx/*` pro source.

## Dev e verificação

- `npm run dev` = `db:up` (Postgres + Redis no docker) → `db:deploy` (aplica as migrations) →
  `turbo run dev`.
- **Stack inteiro containerizado** (`docker-compose.yml` na raiz + um `Dockerfile` por app, build
  context = raiz do repo). Armadilhas herdadas do projeto de referência, já resolvidas aqui e que
  voltam se alguém mexer:
  - **Todo Dockerfile PRECISA de `RUN npm ci`.** O `.dockerignore` exclui `node_modules`, então sem
    isso a imagem não tem dependência nenhuma e o build morre com **exit 127**.
  - **`.dockerignore`: padrão sem `**/` só casa na RAIZ.** Os `**/.env` são obrigatórios, senão
    `apps/backend/.env` entra na imagem com o JWT_SECRET e a chave da Groq.
  - **`uploads` é volume nomeado**, montado no backend **e no worker**, e a pasta precisa existir e
    pertencer ao `node` na imagem (o volume herda dono do que a imagem tem naquele caminho; um
    volume `root` derruba o app no boot com `EACCES`).
  - **O schema é aplicado no BOOT do backend** (`prisma migrate deploy && npm start`). Se falhar, o
    container **não sobe** — melhor que servir com o schema errado. Só o backend migra.
- **Healthcheck pros dois deployables**: o backend tem `GET /health`, que **toca o banco** (up não é
  a mesma coisa que funcionando — um backend sem Postgres responde 500 pra tudo enquanto o docker o
  reporta rodando); o worker não tem porta, então mantém um **heartbeat** em `/tmp` e o healthcheck
  lê a idade do arquivo (prova que o processo vive E que o event loop gira). Os dois usam um
  `healthcheck.js` em arquivo, não um one-liner no compose: aspas de shell dentro de YAML é
  armadilha que ninguém devia depurar de madrugada.
- **`UploadsJanitor`** varre a raiz de uploads e apaga arquivo que nenhuma linha aponta — eles
  existem porque o upload são DOIS requests de propósito, e quem fecha a aba no meio deixa um arquivo
  órfão. Conservador nessa ordem: só o que tem mais de **24h**, só o que não está no banco, e **toda
  remoção logada**. Errar aqui é apagar áudio de alguém, então ele prefere deixar lixo pra trás.
- **Reverse proxy: `deploy/nginx.conf`** — `client_max_body_size` (o default de 1 MB dá 413 em
  qualquer áudio), bloco próprio pro SSE com `proxy_buffering off` (com buffering o sininho parece
  travado) e `X-Accel-Buffering: no` no próprio handler como cinto e suspensório.
  ⚠️ Em `listen 80` sem TLS o **login não persiste**: o cookie de refresh é `secure` e o navegador
  não guarda cookie `secure` em HTTP.
- **Antes de declarar pronto**:
  ```bash
  npx turbo run check-types test build
  ```

## O que já foi validado de verdade

Rodado contra um **Postgres 16 e um Redis reais** (não mock), com o backend e o worker de pé:

- `prisma migrate deploy` aplicando a `0_init` num banco zerado (7 tabelas).
- Cadastro, login (cookie de refresh **httpOnly**), `/user/me`, 401 sem token, 409 em e-mail
  duplicado, 400 em senha fraca, e o **mesmo 401 genérico** pra senha errada.
- `UserRegistered` → notificação de boas-vindas na caixa de entrada.
- Upload de áudio, recusa de arquivo não-áudio, recusa de **path traversal** no `audioUrl`, recusa
  de duração zero.
- **Anti-IDOR**: outro usuário lendo a gravação, o áudio e o PDF alheios → 404 em todos.
- Download do áudio pela rota autenticada, **byte a byte igual** ao enviado.
- Worker **fail-closed** sem `GROQ_API_KEY`.
- Falha da chamada de IA virando **gravação `failed` com motivo em português** + notificação, e o
  **retry NÃO duplicando** a linha da caixa de entrada (idempotência do índice único).
- Caminho feliz com os dois passos de rede dublados: transcrição e resumo gravados, **PDF real
  gerado pelo pdfkit** (1 página, PDF 1.3), baixado pela rota com
  `Content-Disposition` nomeado pelo título.
- **SSE**: 401 sem token, `data: refresh` chegando no stream a partir de um publish no Redis.
- Exclusão em cascata: resumo, transcrição, gravação **e os arquivos em disco**.

⚠️ **O que NÃO foi validado**: as duas chamadas reais à Groq (`api.groq.com` está fora do allowlist
de rede do ambiente onde isso foi construído) e o `docker compose up` (não havia daemon do Docker).
O código do cliente Groq é o mesmo padrão já validado em produção no Brainy-Career, e o pipeline foi
exercitado ponta a ponta com as duas chamadas dubladas — mas a primeira execução com a chave de
verdade ainda é a primeira execução.

## Commits

`tipo(escopo): assunto`, escopo = caminho do pacote/app (ex.: `feat(packages/recording/core)`),
mensagem em português, corpo enxuto, **um commit por escopo**, **sem rodapé de co-autoria**,
direto na `main`. Ver `.claude/skills/commit/SKILL.md`.
