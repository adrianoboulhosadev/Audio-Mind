import { RecordingProcessingQueue } from '../../src'

/** Records what was parked for processing, so a test can assert the job was
 * enqueued (and that it happened only after the row existed). */
export default class RecordingProcessingQueueInMemory implements RecordingProcessingQueue {
  readonly enqueued: string[] = []

  async enqueue(recordingId: string): Promise<void> {
    this.enqueued.push(recordingId)
  }
}
