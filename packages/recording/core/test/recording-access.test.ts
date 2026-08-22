import { Errors } from 'shared'
import {
  DeleteRecording,
  GetRecordingQuery,
  ListMyRecordingsQuery,
  RenameRecording,
  RetryRecording,
  UploadRecording,
} from '../src'
import { RecordingProcessingQueueInMemory, RecordingRepositoryInMemory } from './in-memory'

const INPUT = {
  ownerId: 'owner-1',
  title: 'Consulta médica',
  source: 'record' as const,
  audioUrl: '/uploads/audios/abc.webm',
  mimeType: 'audio/webm',
  sizeBytes: 500_000,
  durationSeconds: 90,
}

async function setup() {
  const repository = new RecordingRepositoryInMemory()
  const queue = new RecordingProcessingQueueInMemory()
  await new UploadRecording(repository, queue).execute(INPUT)
  const [recording] = await repository.listByOwnerQuery('owner-1', 10)
  return { repository, queue, recordingId: recording.id }
}

test('a stranger reading someone else s recording gets RECORDING_NOT_FOUND, not 403', async () => {
  const { repository, recordingId } = await setup()

  await expect(
    new GetRecordingQuery(repository).execute({ recordingId, ownerId: 'intruder' }),
  ).rejects.toMatchObject({ code: Errors.RECORDING_NOT_FOUND })
})

test('the library only ever lists the caller s own audios', async () => {
  const { repository } = await setup()
  await new UploadRecording(repository).execute({ ...INPUT, ownerId: 'owner-2' })

  const mine = await new ListMyRecordingsQuery(repository).execute({ ownerId: 'owner-1' })

  expect(mine).toHaveLength(1)
  expect(mine[0].ownerId).toBe('owner-1')
})

test('the limit is clamped, and garbage falls back instead of poisoning the query', async () => {
  const { repository } = await setup()
  const useCase = new ListMyRecordingsQuery(repository)

  await expect(useCase.execute({ ownerId: 'owner-1', limit: Number.NaN })).resolves.toHaveLength(1)
  await expect(useCase.execute({ ownerId: 'owner-1', limit: 0 })).resolves.toHaveLength(1)
})

test('rename and delete are refused for a stranger', async () => {
  const { repository, recordingId } = await setup()

  await expect(
    new RenameRecording(repository).execute({ recordingId, ownerId: 'intruder', title: 'meu agora' }),
  ).rejects.toMatchObject({ code: Errors.RECORDING_NOT_FOUND })
  await expect(
    new DeleteRecording(repository).execute({ recordingId, ownerId: 'intruder' }),
  ).rejects.toMatchObject({ code: Errors.RECORDING_NOT_FOUND })
  expect(repository.size).toBe(1)
})

test('retry re-parks the SAME audio, and refuses anything that did not fail', async () => {
  const { repository, queue, recordingId } = await setup()
  const useCase = new RetryRecording(repository, queue)

  await expect(useCase.execute({ recordingId, ownerId: 'owner-1' })).rejects.toMatchObject({
    code: Errors.RECORDING_NOT_FAILED,
  })

  const recording = await repository.findById(recordingId)
  recording!.fail('deu ruim')
  await repository.update(recording!)

  await useCase.execute({ recordingId, ownerId: 'owner-1' })

  expect(queue.enqueued).toEqual([recordingId, recordingId])
  expect((await repository.findById(recordingId))!.status).toBe('pending')
})
