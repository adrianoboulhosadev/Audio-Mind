import { UseCase } from 'shared'
import { AnnotationDTO } from '../model'
import { AnnotationQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary. */
  ownerId: string
  limit?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

/**
 * Every mark this person made, across the whole library — the screen that makes
 * marking worth doing at all: what brings somebody back to an audio from three
 * months ago is remembering that they marked something in it, not remembering
 * which audio it was.
 */
export default class ListMyAnnotationsQuery implements UseCase<Input, AnnotationDTO[]> {
  constructor(private readonly queryRepository: AnnotationQueryRepository) {}

  async execute({ ownerId, limit }: Input): Promise<AnnotationDTO[]> {
    // `limit` reaches here from a query string, so garbage falls back instead of
    // poisoning the arithmetic.
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.listByOwnerQuery(ownerId, size)
  }
}
