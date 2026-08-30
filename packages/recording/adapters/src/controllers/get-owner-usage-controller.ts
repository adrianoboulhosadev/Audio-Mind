import { GetOwnerUsageQuery, OwnerUsageDTO, RecordingQueryRepository } from '@recording/core'

export default class GetOwnerUsageController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(ownerIds: string[]): Promise<OwnerUsageDTO[]> {
    return new GetOwnerUsageQuery(this.queryRepository).execute(ownerIds)
  }
}
