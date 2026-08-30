# ROADMAP — a fila combinada com o dono

> **Nada aqui está travado.** Este arquivo é a fila de trabalho; as decisões JÁ TOMADAS (e que não se
> discutem sem motivo) estão no `CLAUDE.md`. Quando um item sai daqui, é porque a decisão dele virou
> regra — e o lugar dela passa a ser o guia.

## A fila está VAZIA

Os 6 itens aprovados foram entregues. O que cada um virou, e onde a decisão dele mora agora:

| # | Item                              | O que ficou de pé                                                                                              | Onde está documentado                |
| - | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1 | Tela de Tarefas                   | Contexto `task`. Tarefa **materializada** (não derivada), única em (gravação, texto), reconciliada a cada run    | `CLAUDE.md` → contexto `task`        |
| 2 | Tipos de áudio                    | `RecordingKind` fail-closed + prompts por tipo no worker, **com o mesmo formato de JSON**                        | `CLAUDE.md` → "Tipos de áudio"       |
| 3 | Compartilhar por link             | Contexto `sharing`. Uma gravação, validade obrigatória, revogável, escopo opt-in. Página pública `/s/:token`     | `CLAUDE.md` → contexto `sharing`     |
| 4 | Marcadores e anotações            | Contexto `annotation`. Âncora é o **tempo**, então sobrevive ao reprocessamento. Marcar não exige escrever       | `CLAUDE.md` → contexto `annotation`  |
| 5 | Tela de admin                     | `/admin` atrás de guard de papel. Promover virou botão; **o primeiro admin continua sendo `UPDATE` na mão**      | `CLAUDE.md` → "Administração"        |
| 6 | Share target + pausar a gravação  | POST no service worker + 303; cronômetro **descontando o tempo parado** (tem teste)                              | `CLAUDE.md` → apps/web               |

Três decisões que estavam em aberto na fila e foram fechadas assim:

- **Tarefa materializada, não derivada** — lida do resumo na hora, ela não teria onde lembrar que foi
  marcada, e reprocessar desmarcaria tudo em silêncio.
- **Link com validade obrigatória e escopo opt-in** — o resultado padrão de esquecer um link tem que
  ser ele parar de funcionar; e transcrição/áudio não vão junto sem alguém marcar.
- **Desativar conta virou rota de ADMIN sobre outra pessoa**, separada da exclusão (LGPD), que
  continua sendo só do próprio dono.

---

## O que foi decidido NÃO fazer (e por quê)

- **Rate limit no login, CI e fatiar áudio em blocos** — o dono tirou do escopo de propósito.
- **Dashboard de métricas** ("horas gravadas", "tempo economizado"): enche o olho e não serve pra
  nada num app pessoal — os áudios já estão listados na tela inicial. (O `/admin` mostra número, mas
  pra operar a instalação: disco, fila e falhas.)
- **Baixar de URL do YouTube**: precisa de yt-dlp no container, quebra toda semana e tem uma zona
  jurídica que o projeto não quer.
- **Workspaces/times com permissão por recurso**: é outro projeto inteiro. O compartilhamento por
  link entrega a maior parte do valor com 5% do trabalho.
- **Timestamps no PDF ao lado de cada tópico**: os `topics` são PARÁFRASES, não citações — casar cada
  um com um segmento é adivinhação, e um minuto de aparência confiável ao lado de um texto que não
  foi dito ali é pior que não ter minuto nenhum. **Mesmo motivo** pelo qual a tela de Tarefas **não**
  mostra o minuto em que a tarefa foi combinada.
- **Contar QUEM abriu um link compartilhado**: o dono vê quantas vezes, e só. Virar rastreador de
  quem recebeu seria coletar dado pessoal que ninguém consentiu.

## Em aberto (decisão de produto, não de implementação)

- **Apêndice com a transcrição cronometrada no PDF.** Resolveria de forma honesta o que os timestamps
  por tópico não resolvem, mas transforma o PDF de "o resumo" num calhamaço de 10-15 páginas.
- **O primeiro admin.** Continua sendo `UPDATE users SET role='admin'` na mão, de propósito. Se algum
  dia isso incomodar, a saída é um comando de setup — nunca uma tela.

## Como trabalhar um item novo

Vale tudo que está no `CLAUDE.md` (modelagem rica, CQRS, portas, adapters no app, commit por escopo,
direto na `main`). Antes de declarar pronto:

```bash
npx turbo run build      # o check-types do web depende dos tipos que o next build gera
npx turbo run check-types test
```
