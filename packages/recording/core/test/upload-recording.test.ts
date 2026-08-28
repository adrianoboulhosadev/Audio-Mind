import { Errors } from 'shared'
import { RecordingUploaded, UploadRecording } from '../src'
import {
  EventPublisherInMemory,
  RecordingProcessingQueueInMemory,
  RecordingRepositoryInMemory,
} from './in-memory'

const INPUT = {
  ownerId: 'owner-1',
  title: 'Daily do time',
  source: 'upload' as const,
  audioUrl: '/uploads/audios/abc.mp3',
  mimeType: 'audio/mpeg',
  sizeBytes: 3_000_000,
  durationSeconds: 420,
}

function setup() {
  const repository = new RecordingRepositoryInMemory()
  const queue = new RecordingProcessingQueueInMemory()
  const publisher = new EventPublisherInMemory()
  return { repository, queue, publisher, useCase: new UploadRecording(repository, queue, publisher) }
}

test('persists the recording as pending and parks the processing job', async () => {
  const { repository, queue, useCase } = setup()

  await useCase.execute(INPUT)

  const [recording] = await repository.listByOwnerQuery('owner-1', 10)
  expect(recording.status).toBe('pending')
  expect(recording.title).toBe('Daily do time')
  expect(queue.enqueued).toEqual([recording.id])
})

test('publishes RecordingUploaded', async () => {
  const { publisher, useCase } = setup()

  await useCase.execute(INPUT)

  expect(publisher.published[0]).toBeInstanceOf(RecordingUploaded)
})

test('an unsupported format never reaches the queue', async () => {
  const { queue, repository, useCase } = setup()

  await expect(useCase.execute({ ...INPUT, mimeType: 'text/plain' })).rejects.toMatchObject({
    code: Errors.UNSUPPORTED_AUDIO_FORMAT,
  })
  expect(queue.enqueued).toHaveLength(0)
  expect(repository.size).toBe(0)
})

test('works without the queue port (the port is optional, like everywhere else)', async () => {
  const repository = new RecordingRepositoryInMemory()
  await new UploadRecording(repository).execute(INPUT)
  expect(repository.size).toBe(1)
})

// --- allowance -----------------------------------------------------------------

const OVER_STANDARD = {
  ...INPUT,
  sizeBytes: 200 * 1024 * 1024,
  durationSeconds: 3 * 60 * 60,
}

test('an omitted allowance is the TIGHT one — forgetting it can only narrow', async () => {
  const { useCase } = setup()
  await expect(useCase.execute(OVER_STANDARD)).rejects.toMatchObject({
    code: Errors.AUDIO_TOO_LARGE,
  })
})

test('the standard allowance refuses what the extended one accepts', async () => {
  const standard = setup()
  await expect(standard.useCase.execute({ ...OVER_STANDARD, allowance: 'standard' })).rejects.toMatchObject(
    { code: Errors.AUDIO_TOO_LARGE },
  )

  const extended = setup()
  await extended.useCase.execute({ ...OVER_STANDARD, allowance: 'extended' })
  expect(extended.repository.size).toBe(1)
  expect(extended.queue.enqueued).toHaveLength(1)
})

test('the size error reports the CALLER ceiling, not a global constant', async () => {
  const { useCase } = setup()
  await expect(
    useCase.execute({ ...INPUT, sizeBytes: 2 * 1024 * 1024 * 1024, allowance: 'extended' }),
  ).rejects.toMatchObject({
    code: Errors.AUDIO_TOO_LARGE,
    extras: expect.objectContaining({ max: 1024 * 1024 * 1024 }),
  })
})
