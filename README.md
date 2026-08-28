# Audio-Mind

Grave um áudio (ou envie um arquivo) e receba, alguns minutos depois, a
**transcrição**, um **resumo** escrito por um LLM e um **PDF** pra baixar.

Serve pra reunião que ninguém anotou, aula, consulta médica, entrevista — tudo
que você ouviu uma vez e não quer ouvir de novo pra lembrar o que foi dito.

## Como funciona

1. Você **grava no navegador** ou **envia um arquivo** (até 25 MB / 30 min; contas admin sobem até 1 GB,
   sem limite de duração).
2. O backend guarda o áudio e **enfileira** o processamento — a resposta é
   imediata, você pode fechar a página.
3. O **worker** transcreve o áudio (Whisper, na Groq), manda a transcrição pro
   LLM resumir e desenha o PDF.
4. Quando termina, chega um **aviso na sua caixa de entrada** (push de verdade,
   sem ficar recarregando a página) com o resumo pronto e o PDF pra baixar.
5. Se algo der errado, a gravação fica marcada como **falhou, com o motivo em
   português** — e tem um botão de tentar de novo, que reaproveita o mesmo áudio.

O resumo sai em português e tem quatro partes: um título, o resumo em prosa, os
pontos principais e os próximos passos (só o que ficou combinado de fazer).

## Stack

- **Monorepo** Turborepo + npm workspaces, TypeScript.
- **Arquitetura hexagonal por bounded context**, com modelagem rica (entidades
  com invariantes + value objects) e eventos de domínio.
- **Backend**: NestJS + Prisma (Postgres) + BullMQ (Redis).
- **Worker**: consumidor BullMQ que fala com a Groq (Whisper + LLM) e gera o PDF.
- **Web**: Next.js (App Router) + Tailwind + TanStack Query + Axios.

Contextos: `auth`, `recording`, `transcription`, `summary`, `notification`.

## Rodando

Precisa de Node 18+ e Docker (pro Postgres e o Redis).

```bash
cp .env.example .env                       # senha do Postgres
cp apps/backend/.env.example apps/backend/.env
cp apps/worker/.env.example  apps/worker/.env   # <- ponha sua GROQ_API_KEY aqui
cp apps/web/.env.example     apps/web/.env

npm install
npm run dev        # sobe Postgres + Redis, aplica as migrations e roda tudo
```

- web: http://localhost:3000
- api: http://localhost:5000

**A chave da Groq é obrigatória pro worker**: sem ela ele se recusa a iniciar
(fail-closed) em vez de aceitar áudios e marcar todos como falhos. A MESMA chave
serve pros dois passos (transcrever e resumir) — pegue em
https://console.groq.com.

Pra rodar o stack inteiro em container (simular produção):

```bash
docker compose up --build
```

## Verificando antes de dizer que está pronto

```bash
npx turbo run check-types test build
```

Para as convenções, decisões travadas e o porquê de cada uma, veja o
[CLAUDE.md](./CLAUDE.md).
