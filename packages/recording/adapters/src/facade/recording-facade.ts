import {
  RecordingDTO,
  RecordingProcessingQueue,
  RecordingQueryRepository,
  RecordingRepository,
} from '@recording/core'
import { EventPublisher } from 'shared'
import {
  AdvanceRecordingController,
  DeleteRecordingController,
  GetRecordingController,
  GetRecordingForProcessingController,
  ListMyRecordingsController,
  RenameRecordingController,
  RetryRecordingController,
  UploadRecordingController,
} from '../controllers'
import { RenameRecordingInput, UploadRecordingInput } from '../@types'

/**
 * Single entry point the apps call — the NestJS backend for everything the user
 * does, and the BullMQ worker for the pipeline transitions. Optional ports in
 * the constructor; each method builds its controller. Neither app ever sees a
 * use case or @recording/core.
 */
export default class RecordingFacade {
  constructor(
    private readonly repository?: RecordingRepository,
    private readonly queryRepository?: RecordingQueryRepository,
    private readonly queue?: RecordingProcessingQueue,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async uploadRecording(ownerId: string, input: UploadRecordingInput): Promise<void> {
    await new UploadRecordingController(this.repository!, this.queue, this.eventPublisher).execute(
      ownerId,
      input,
    )
  }

  async listMyRecordings(ownerId: string, limit?: number): Promise<RecordingDTO[]> {
    return new ListMyRecordingsController(this.queryRepository!).execute(ownerId, limit)
  }

  async getRecording(recordingId: string, ownerId: string): Promise<RecordingDTO> {
    return new GetRecordingController(this.queryRepository!).execute(recordingId, ownerId)
  }

  async renameRecording(
    recordingId: string,
    ownerId: string,
    input: RenameRecordingInput,
  ): Promise<void> {
    await new RenameRecordingController(this.repository!).execute(recordingId, ownerId, input)
  }

  async deleteRecording(recordingId: string, ownerId: string): Promise<void> {
    await new DeleteRecordingController(this.repository!).execute(recordingId, ownerId)
  }

  async retryRecording(recordingId: string, ownerId: string): Promise<void> {
    await new RetryRecordingController(this.repository!, this.queue).execute(recordingId, ownerId)
  }

  // --- the worker's side: no authenticated owner behind a queue job ------------

  async getRecordingForProcessing(recordingId: string): Promise<RecordingDTO> {
    return new GetRecordingForProcessingController(this.queryRepository!).execute(recordingId)
  }

  async startTranscription(recordingId: string): Promise<void> {
    await this.advance().startTranscription(recordingId)
  }

  async startSummarization(recordingId: string): Promise<void> {
    await this.advance().startSummarization(recordingId)
  }

  async completeRecording(recordingId: string): Promise<void> {
    await this.advance().complete(recordingId)
  }

  async failRecording(recordingId: string, reason: string): Promise<void> {
    await this.advance().fail(recordingId, reason)
  }

  private advance(): AdvanceRecordingController {
    return new AdvanceRecordingController(this.repository!, this.eventPublisher)
  }
}
