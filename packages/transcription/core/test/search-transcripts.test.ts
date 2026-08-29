import { SearchTranscriptsQuery, TranscribeRecording } from '../src'
import { SpeechToTextProviderInMemory, TranscriptionRepositoryInMemory } from './in-memory'

async function setup() {
  const repository = new TranscriptionRepositoryInMemory()
  const speechToText = new SpeechToTextProviderInMemory({
    text: 'Falamos sobre o contrato de aluguel.',
  })
  await new TranscribeRecording(repository, speechToText).execute({
    recordingId: 'rec-1',
    audioPath: '/uploads/audios/a.mp3',
    mimeType: 'audio/mpeg',
  })
  return { repository, useCase: new SearchTranscriptsQuery(repository) }
}

test('answers which recordings were TALKING about the term', async () => {
  const { useCase } = await setup()

  const found = await useCase.execute({ term: 'contrato', recordingIds: ['rec-1'] })

  expect(found).toEqual(['rec-1'])
})

test('only searches the recordings it was handed — ownership lives elsewhere', async () => {
  const { useCase } = await setup()

  expect(await useCase.execute({ term: 'contrato', recordingIds: ['rec-9'] })).toEqual([])
  expect(await useCase.execute({ term: 'contrato', recordingIds: [] })).toEqual([])
})

test('a term too short to mean anything is not a search', async () => {
  const { useCase } = await setup()

  expect(await useCase.execute({ term: 'c', recordingIds: ['rec-1'] })).toEqual([])
})
