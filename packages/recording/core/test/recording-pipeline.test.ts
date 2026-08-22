import { Errors } from 'shared'
import {
  CompleteRecording,
  FailRecording,
  GetRecordingForProcessingQuery,
  RecordingFailed,
  RecordingReady,
  StartRecordingSummarization,
  StartRecordingTranscription,
  UploadRecording,
} from '../src'
import { EventPublisherInMemory, RecordingRepositoryInMemory } from './in-memory'

async function setup() {
  const repository = new RecordingRepositoryInMemory()
  const publisher = new EventPublisherInMemory()
  await new UploadRecording(repository).execute({
    ownerId: 'owner-1',
    title: 'Aula de história',
    source: 'upload',
    audioUrl: '/uploads/audios/abc.m4a',
    mimeType: 'audio/x-m4a',
    sizeBytes: 8_000_000,
    durationSeconds: 1500,
  })
  const [recording] = await repository.listByOwnerQuery('owner-1', 1)
  return { repository, publisher, recordingId: recording.id }
}

test('the worker walks the whole pipeline and publishes RecordingReady at the end', async () => {
  const { repository, publisher, recordingId } = await setup()

  await new StartRecordingTranscription(repository).execute(recordingId)
  await new StartRecordingSummarization(repository).execute(recordingId)
  await new CompleteRecording(repository, publisher).execute(recordingId)

  expect((await repository.findById(recordingId))!.status).toBe('ready')
  expect(publisher.published[0]).toBeInstanceOf(RecordingReady)
})

test('failing mid-pipeline stores the reason and publishes RecordingFailed', async () => {
  const { repository, publisher, recordingId } = await setup()
  await new StartRecordingTranscription(repository).execute(recordingId)

  await new FailRecording(repository, publisher).execute({
    recordingId,
    reason: 'A transcrição não retornou texto.',
  })

  const recording = await repository.findById(recordingId)
  expect(recording!.status).toBe('failed')
  expect(recording!.failureReason).toBe('A transcrição não retornou texto.')
  expect(publisher.published[0]).toBeInstanceOf(RecordingFailed)
})

test('the system read does not need an owner, but still refuses an unknown id', async () => {
  const { repository, recordingId } = await setup()
  const useCase = new GetRecordingForProcessingQuery(repository)

  await expect(useCase.execute(recordingId)).resolves.toMatchObject({ status: 'pending' })
  await expect(useCase.execute('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({
    code: Errors.RECORDING_NOT_FOUND,
  })
})
