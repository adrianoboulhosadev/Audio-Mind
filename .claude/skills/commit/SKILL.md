---
name: commit
description: Cria commits no padrão do Audio-Mind — Conventional Commits com o escopo = bounded context/pacote afetado (ex.: feat(packages/recording/core), feat(packages/summary/adapters), fix(apps/worker)). Sempre em português, com corpo detalhado porém enxuto. Use sempre que for commitar mudanças neste monorepo.
---

# Padrão de commit — Audio-Mind

## Formato
```
<tipo>(<escopo>): <assunto curto em português>

- <ponto 1: o que foi feito, com detalhe enxuto>
- <ponto 2>
```

- **tipo**: `feat` (novo comportamento), `fix` (correção de bug), `refactor` (sem mudar comportamento), `test` (só testes), `chore` (config/build/deps), `docs`, `perf`, `style`.
- **escopo**: o **caminho do bounded context / pacote / app** afetado, exatamente como na árvore do repo:
  - `packages/shared`
  - `packages/database`
  - `packages/<contexto>/core` — ex.: `packages/auth/core`, `packages/recording/core`, `packages/transcription/core`, `packages/summary/core`, `packages/notification/core`
  - `packages/<contexto>/adapters` — ex.: `packages/recording/adapters`, `packages/summary/adapters`
  - `apps/backend`, `apps/worker`, `apps/web`, `apps/database`
- **assunto**: curto, em **português**, no imperativo/presente, sem ponto final. (ex.: `adiciona use case de upload de audio`, `corrige transcricao de arquivo m4a`).

## Regras

1. **Sempre em português** — assunto e corpo.
2. **Um commit por bounded context / pacote.** Se a mudança tocou `core` E `adapters` E `backend`, são **3 commits separados** (um por escopo), não um commit gigante. Faça o stage seletivo por caminho (`git add packages/recording/core`, depois commitar; e assim por diante).
3. **Corpo detalhado porém enxuto**: bullets curtos explicando O QUE mudou e por quê quando não for óbvio. Citar nomes reais (use-cases, portas, VOs, entidades, arquivos). Nada de encher linguiça; 1–5 bullets costuma bastar.
4. Sem escopo só quando a mudança é genuinamente cross-repo (ex.: `chore: ajusta turbo.json`). Prefira sempre ter escopo.
5. Não commitar `dist/`, `generated/`, `.env`, `node_modules`, `apps/backend/uploads/` (já no .gitignore).
6. Commitar **só** quando o dono pedir.
7. **NUNCA** adicionar rodapé de atribuição/co-autoria (nada de `Co-authored-by`, `Generated with Claude Code` ou similar). A mensagem termina no último bullet do corpo.
8. Commits vão direto na **`main`** — este projeto não usa branch de feature.

## Exemplos

```
feat(packages/recording/core): entidade Recording com maquina de status

- Recording.startTranscription/startSummarization/markAsReady validam a transicao
- AudioFile rejeita mime nao suportado, arquivo > 25 MB e duracao > 30 min
- evento RecordingReady registrado na propria transicao
```

```
feat(apps/worker): pipeline de transcricao e resumo via Groq

- consome a fila "recording-processing" e roda transcribe -> summarize -> pdf
- GroqSpeechToText usa whisper-large-v3; GroqSummaryGenerator usa o modelo de chat
- createGroqClient com keepAlive:false (socket morto da borda da Groq)
```

```
fix(apps/backend): corrige reconstituicao do Recording no repositorio Prisma
- lia durationSeconds como string -> passa a ler o Int direto da coluna
```

## Fluxo
1. `git status` + `git diff` para ver o que mudou e agrupar por escopo.
2. Para cada escopo: `git add <caminho>` → `git commit -m "..."` (use o formato acima).
3. Repita até o working tree estar limpo. Confirme com `git status`.
