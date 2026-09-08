/**
 * Reading the model's prose for presentation — the same tolerant spirit as
 * `splitBulletLabel`: what the model was ASKED for is one thing, what it sends
 * is another, and the document has to be readable either way.
 */

/** Past this, a single paragraph stops being a paragraph and becomes a wall.
 * Roughly ten lines of an A4 text column. */
const WALL_OF_TEXT = 700

/** Where a broken-up chunk is allowed to end. Below this it would cut a
 * paragraph that was merely long-ish. */
const CHUNK_TARGET = 420

/**
 * The overview as paragraphs.
 *
 * The prompt asks for blank lines between them, and when they are there this is
 * just a split. But a model does not reliably put line breaks inside a JSON
 * string, and the first version of the instruction came back as ONE 250-word
 * block — justified across a full text column, which is the least readable
 * shape prose can take. So a chunk that is too long is broken at SENTENCE
 * boundaries.
 *
 * It only ever inserts breaks: no word is changed, dropped or reordered, and a
 * text that already has paragraphs passes through untouched. Every summary
 * written before the instruction existed is stored as one block, and this is
 * what makes those readable without reprocessing anything.
 */
export function splitIntoParagraphs(text: string): string[] {
  const given = text
    .split(/\n{2,}|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return given.flatMap((paragraph) =>
    paragraph.length > WALL_OF_TEXT ? breakAtSentences(paragraph) : [paragraph],
  )
}

function breakAtSentences(paragraph: string): string[] {
  // Keeps the punctuation with the sentence it ends; an abbreviation ("Dr.")
  // can fool it, and the cost of that is a paragraph break one sentence early.
  const sentences = paragraph.split(/(?<=[.!?…])\s+/).filter(Boolean)
  if (sentences.length < 2) return [paragraph]

  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    current = current ? `${current} ${sentence}` : sentence
    if (current.length >= CHUNK_TARGET) {
      chunks.push(current)
      current = ''
    }
  }
  // A short tail joins the previous chunk instead of standing alone as a
  // one-line paragraph.
  if (current) {
    if (chunks.length > 0 && current.length < CHUNK_TARGET / 2) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${current}`
    } else {
      chunks.push(current)
    }
  }

  return chunks
}
