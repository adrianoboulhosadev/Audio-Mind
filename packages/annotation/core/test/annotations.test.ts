import {
  AddAnnotation,
  DeleteAnnotation,
  EditAnnotationNote,
  ListRecordingAnnotationsQuery,
} from '../src'
import { AnnotationRepositoryInMemory } from './in-memory'

const OWNER = 'c1f1d2f3-6f4a-4e0a-9f0b-91f1a8a5c001'
const OTHER = 'c1f1d2f3-6f4a-4e0a-9f0b-91f1a8a5c003'
const RECORDING = 'c1f1d2f3-6f4a-4e0a-9f0b-91f1a8a5c002'

function setup() {
  const repository = new AnnotationRepositoryInMemory()
  return {
    repository,
    add: (atSeconds: number, note?: string) =>
      new AddAnnotation(repository).execute({ ownerId: OWNER, recordingId: RECORDING, atSeconds, note }),
    list: () => new ListRecordingAnnotationsQuery(repository).execute(RECORDING),
  }
}

describe('AddAnnotation', () => {
  it('a lista de uma gravação vem na ordem do ÁUDIO, não da criação', async () => {
    const { add, list } = setup()
    await add(300)
    await add(12)
    await add(120)

    expect((await list()).map((mark) => mark.atSeconds)).toEqual([12, 120, 300])
  })

  it('dois marcadores no mesmo segundo são permitidos — são dois pensamentos', async () => {
    const { add, repository } = setup()
    await add(42, 'primeiro')
    await add(42, 'segundo')

    expect(repository.size).toBe(2)
  })
})

describe('EditAnnotationNote', () => {
  it('marcador de outro dono responde como inexistente', async () => {
    const { add, list, repository } = setup()
    await add(42)
    const [mark] = await list()

    await expect(
      new EditAnnotationNote(repository).execute({
        annotationId: mark.id,
        ownerId: OTHER,
        note: 'invadindo',
      }),
    ).rejects.toThrow()
  })

  it('escrever depois é permitido — o texto é da pessoa, não de um modelo', async () => {
    const { add, list, repository } = setup()
    await add(42)
    const [mark] = await list()

    await new EditAnnotationNote(repository).execute({
      annotationId: mark.id,
      ownerId: OWNER,
      note: 'o ponto importante',
    })

    expect((await list())[0].note).toBe('o ponto importante')
  })
})

describe('DeleteAnnotation', () => {
  it('marcador de outro dono responde como inexistente', async () => {
    const { add, list, repository } = setup()
    await add(42)
    const [mark] = await list()

    await expect(
      new DeleteAnnotation(repository).execute({ annotationId: mark.id, ownerId: OTHER }),
    ).rejects.toThrow()
    expect(repository.size).toBe(1)
  })
})
