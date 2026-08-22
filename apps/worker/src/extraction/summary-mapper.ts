import { GeneratedSummary } from '@summary/adapters'

/** The shape the prompt asks the model to return. Everything is optional here
 * because a model CAN return anything — turning that into a valid summary (or a
 * clean failure) is exactly this file's job. */
export interface LlmSummaryRecord {
  headline?: unknown
  overview?: unknown
  topics?: unknown
  action_items?: unknown
}

/**
 * Maps the model's JSON onto the port's shape.
 *
 * PURE and separate from the client on purpose: this is the part that has to
 * cope with a model that returns a string where a list was asked for, a `null`
 * bullet, or twenty items — and it is the only part worth unit-testing without
 * a network. What it must NOT do is invent content: an answer with no overview
 * stays empty, so the SummaryOverview value object refuses it and the pipeline
 * reports a failure instead of storing a plausible-looking nothing.
 */
export function toGeneratedSummary(record: LlmSummaryRecord, model: string): GeneratedSummary {
  return {
    headline: asText(record.headline),
    overview: asText(record.overview),
    topics: asList(record.topics),
    actionItems: asList(record.action_items),
    model,
  }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Accepts the two shapes a model actually produces: a real array, or a single
 * string with the items on separate lines (which happens when it decides to be
 * helpful). Anything else becomes an empty list — the entity then decides
 * whether a summary without bullets is acceptable (it is: the prose is the
 * product, the bullets are a bonus).
 */
function asList(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n')
      : []

  return items
    .map((item) => asText(item).replace(/^[-*\d.\s]+/, '').trim())
    .filter((item) => item.length > 0)
}
