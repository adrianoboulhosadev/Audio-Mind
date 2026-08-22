import { Errors } from 'shared'
import { DeleteTranscription, GetTranscriptionQuery, TranscribeRecording } from '../src'
import { SpeechToTextProviderInMemory, TranscriptionRepositoryInMemory } from './in-memory'

const INPUT = {
  recordingId: 'rec-1',
  audioPath: '/repo/apps/backend/uploads/audios/abc.mp3',
  mimeType: 'audio/mpeg',
}

test('stores what the provider heard, along with the model that answered', async () => {
  const repository = new TranscriptionRepositoryInMemory()
  const provider = new SpeechToTextProviderInMemory()

  await new TranscribeRecording(repository, provider).execute(INPUT)

  const stored = await new GetTranscriptionQuery(repository).execute('rec-1')
  expect(stored.text).toBe('Bom dia, vamos começar a reunião.')
  expect(stored.language).toBe('pt')
  expect(stored.model).toBe('whisper-large-v3')
  expect(stored.wordCount).toBe(6)
  expect(provider.calls[0]).toMatchObject({ audioPath: INPUT.audioPath, mimeType: 'audio/mpeg' })
})

test('a silent audio throws EMPTY_TRANSCRIPT instead of storing nothing', async () => {
  const repository = new TranscriptionRepositoryInMemory()
  const provider = new SpeechToTextProviderInMemory({ text: '   ' })

  await expect(new TranscribeRecording(repository, provider).execute(INPUT)).rejects.toMatchObject({
    code: Errors.EMPTY_TRANSCRIPT,
  })
  expect(repository.size).toBe(0)
})

test('re-running REPLACES the transcript instead of piling up a second one', async () => {
  const repository = new TranscriptionRepositoryInMemory()

  await new TranscribeRecording(repository, new SpeechToTextProviderInMemory()).execute(INPUT)
  await new TranscribeRecording(
    repository,
    new SpeechToTextProviderInMemory({ text: 'Segunda tentativa.' }),
  ).execute(INPUT)

  expect(repository.size).toBe(1)
  expect((await new GetTranscriptionQuery(repository).execute('rec-1')).text).toBe('Segunda tentativa.')
})

test('reading a transcript that does not exist answers TRANSCRIPTION_NOT_FOUND', async () => {
  const repository = new TranscriptionRepositoryInMemory()
  await expect(new GetTranscriptionQuery(repository).execute('rec-9')).rejects.toMatchObject({
    code: Errors.TRANSCRIPTION_NOT_FOUND,
  })
})

test('deleting is idempotent — a recording that failed early simply has none', async () => {
  const repository = new TranscriptionRepositoryInMemory()
  await expect(new DeleteTranscription(repository).execute('rec-1')).resolves.toBeUndefined()
})
