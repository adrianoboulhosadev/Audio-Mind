import {
  AudioAllowance,
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
  SearchMyRecordingsController,
  SuggestRecordingTitleController,
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

  async uploadRecording(
    ownerId: string,
    allowance: AudioAllowance,
    input: UploadRecordingInput,
  ): Promise<void> {
    await new UploadRecordingController(this.repository!, this.queue, this.eventPublisher).execute(
      ownerId,
      allowance,
      input,
    )
  }

  async listMyRecordings(ownerId: string, limit?: number): Promise<RecordingDTO[]> {
    return new ListMyRecordingsController(this.queryRepository!).execute(ownerId, limit)
  }

  /** The owner's library filtered by a term. `matchedIds` are the recordings
   * the transcript/summary contexts matched — the app layer asks them first,
   * because neither of them knows who owns anything. */
  async searchMyRecordings(
    ownerId: string,
    term: string,
    matchedIds?: string[],
    limit?: number,
  ): Promise<RecordingDTO[]> {
    return new SearchMyRecordingsController(this.queryRepository!).execute(
      ownerId,
      term,
      matchedIds,
      limit,
    )
  }

  async listMyRecordingIds(ownerId: string): Promise<string[]> {
    return this.queryRepository!.listAllIdsByOwnerQuery(ownerId)
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

  /** The pipeline offering a name for an audio nobody named. The entity
   * refuses it when the person already typed one. */
  async suggestRecordingTitle(recordingId: string, title: string): Promise<void> {
    await new SuggestRecordingTitleController(this.repository!).execute(recordingId, title)
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
