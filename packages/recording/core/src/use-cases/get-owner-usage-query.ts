import { UseCase } from 'shared'
import { OwnerUsageDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

/**
 * How much of the library each of THESE owners is using — a SYSTEM read, asked
 * for a page of users at once so the admin screen is one query and not one per
 * row.
 */
export default class GetOwnerUsageQuery implements UseCase<string[], OwnerUsageDTO[]> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(ownerIds: string[]): Promise<OwnerUsageDTO[]> {
    const unique = [...new Set((ownerIds ?? []).filter(Boolean))]
    if (unique.length === 0) return []

    return this.queryRepository.usageByOwnersQuery(unique)
  }
}
