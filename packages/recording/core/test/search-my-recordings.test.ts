import { SearchMyRecordingsQuery, UploadRecording } from '../src'
import { RecordingRepositoryInMemory } from './in-memory'

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
  await new UploadRecording(repository).execute(INPUT)
  await new UploadRecording(repository).execute({ ...INPUT, title: 'Reunião de time' })
  // Someone else's library, with a title that matches every search below.
  await new UploadRecording(repository).execute({
    ...INPUT,
    ownerId: 'owner-2',
    title: 'Consulta do vizinho',
  })
  const ids = await repository.listAllIdsByOwnerQuery('owner-1')
  return { repository, useCase: new SearchMyRecordingsQuery(repository), ids }
}

test('finds by title, inside the caller s own library', async () => {
  const { useCase } = await setup()

  const found = await useCase.execute({ ownerId: 'owner-1', term: 'consulta' })

  expect(found).toHaveLength(1)
  expect(found[0].title).toBe('Consulta médica')
})

test('never answers with someone else s recording, however well it matches', async () => {
  const { useCase } = await setup()

  const found = await useCase.execute({ ownerId: 'owner-1', term: 'vizinho' })

  expect(found).toEqual([])
})

test('an id matched by another context comes back even when the title says nothing', async () => {
  const { useCase, ids } = await setup()

  // Stands in for "the transcript of this recording mentions the word".
  const found = await useCase.execute({ ownerId: 'owner-1', term: 'exame', matchedIds: [ids[1]] })

  expect(found.map((recording) => recording.id)).toEqual([ids[1]])
})

test('an id from someone else s library is NOT a way in', async () => {
  const { repository, useCase } = await setup()
  const [strangerId] = await repository.listAllIdsByOwnerQuery('owner-2')

  const found = await useCase.execute({ ownerId: 'owner-1', term: 'x', matchedIds: [strangerId] })

  expect(found).toEqual([])
})

test('a term too short to mean anything returns nothing instead of the whole library', async () => {
  const { useCase } = await setup()

  expect(await useCase.execute({ ownerId: 'owner-1', term: 'a' })).toEqual([])
  expect(await useCase.execute({ ownerId: 'owner-1', term: '   ' })).toEqual([])
})
