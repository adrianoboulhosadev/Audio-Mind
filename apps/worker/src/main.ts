import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from 'database'
import { RecordingFacade } from '@recording/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TaskFacade } from '@task/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { createSpeechToText, createSummaryGenerator, GroqConfig } from './extraction'
import { startHeartbeat } from './heartbeat'
import { PdfKitSummaryRenderer } from './pdf/pdfkit-summary-renderer'
import { LiveUpdates } from './notification/live-updates'
import { PipelineEventPublisher } from './notification/pipeline-event-publisher'
import { PrismaNotificationRepository } from './persistence/prisma-notification-repository'
import { PrismaRecordingRepository } from './persistence/prisma-recording-repository'
import { PrismaSummaryRepository } from './persistence/prisma-summary-repository'
import { PrismaTaskRepository } from './persistence/prisma-task-repository'
import { PrismaTranscriptionRepository } from './persistence/prisma-transcription-repository'
import { processRecording } from './pipeline/process-recording'

// Queue name: MUST match the producer in apps/backend.
const RECORDING_PROCESSING_QUEUE = 'recording-processing'

interface ProcessRecordingJob {
  recordingId: string
}

function main(): void {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const prisma = new PrismaClient()

  // The Groq factories throw when the key is missing (fail-closed): the worker
  // does not start half-able to process, it does not start at all — a worker
  // that boots without AI would just mark every audio as failed.
  const groqConfig: GroqConfig = {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL ?? 'whisper-large-v3',
    characterLimit: Number(process.env.TRANSCRIPT_CHAR_LIMIT ?? 24_000),
  }

  const liveUpdates = new LiveUpdates(redisUrl)
  const events = new PipelineEventPublisher(new PrismaNotificationRepository(prisma), liveUpdates)

  // Apps reach the use cases through each context's adapters facade — never
  // @*/core. Optional ports: each facade gets only what this app uses.
  const recordingRepository = new PrismaRecordingRepository(prisma)
  const recordings = new RecordingFacade(
    recordingRepository,
    recordingRepository,
    undefined,
    events,
  )
  const transcriptionRepository = new PrismaTranscriptionRepository(prisma)
  const transcriptions = new TranscriptionFacade(
    transcriptionRepository,
    transcriptionRepository,
    createSpeechToText(groqConfig),
  )
  const summaryRepository = new PrismaSummaryRepository(prisma)
  const summaries = new SummaryFacade(
    summaryRepository,
    summaryRepository,
    createSummaryGenerator(groqConfig),
    new PdfKitSummaryRenderer(),
  )

  // Write side only: the pipeline materializes the action items, and reading
  // them back belongs to the screen (the backend).
  const tasks = new TaskFacade(new PrismaTaskRepository(prisma))

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

  const worker = new Worker<ProcessRecordingJob>(
    RECORDING_PROCESSING_QUEUE,
    async (job) => {
      await processRecording(job.data.recordingId, {
        recordings,
        transcriptions,
        summaries,
        tasks,
        summaryLanguage: process.env.SUMMARY_LANGUAGE ?? 'pt',
      })
    },
    {
      connection,
      // One audio at a time by default: each job holds a file open and waits on
      // two model calls, and the rate limit is per API key, not per process.
      concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
    },
  )

  // processRecording already turns a failure into a FAILED recording plus an
  // inbox line, so reaching here means the failure handling itself broke —
  // which is exactly the thing that must be loud.
  worker.on('failed', (job, error) => {
    console.error(`[worker] job failed for recording ${job?.data?.recordingId}:`, error)
  })

  worker.on('completed', (job) => {
    console.log(`[worker] processed recording ${job.data.recordingId}`)
  })

  // What docker's healthcheck looks at: a queue consumer has no port to answer
  // on (see heartbeat.ts).
  startHeartbeat()

  console.log(`[worker] up — consuming "${RECORDING_PROCESSING_QUEUE}"`)
}

main()
