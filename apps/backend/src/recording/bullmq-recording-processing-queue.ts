import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { RecordingProcessingQueue } from '@recording/adapters'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

/** The queue/job name literals MUST match the consumer in apps/worker. */
export const RECORDING_PROCESSING_QUEUE = 'recording-processing'
export const RECORDING_PROCESSING_JOB = 'process'

/**
 * BullMQ producer for the pipeline. Transcribing and summarizing take seconds
 * to minutes, so doing them inside the HTTP request would hold the connection
 * open and lose everything if it dropped — the upload parks a job instead and
 * answers immediately.
 *
 * A STABLE jobId per recording de-duplicates a double-click on retry. BullMQ
 * rejects a custom id containing ':' (its own key separator), hence '-'.
 */
@Injectable()
export class BullMqRecordingProcessingQueue implements RecordingProcessingQueue, OnModuleDestroy {
  private readonly connection: IORedis
  private readonly queue: Queue

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.queue = new Queue(RECORDING_PROCESSING_QUEUE, { connection: this.connection })
  }

  async enqueue(recordingId: string): Promise<void> {
    await this.queue.add(
      RECORDING_PROCESSING_JOB,
      { recordingId },
      // removeOnComplete keeps Redis from growing forever; the failed ones are
      // kept for a while because they are how a stuck pipeline gets diagnosed.
      {
        jobId: `process-${recordingId}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    )
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
    await this.connection.quit()
  }
}
