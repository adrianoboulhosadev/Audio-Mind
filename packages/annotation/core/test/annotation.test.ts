import { Annotation, AnnotationNote, AnnotationTime } from '../src'

const OWNER = 'c1f1d2f3-6f4a-4e0a-9f0b-91f1a8a5c001'
const RECORDING = 'c1f1d2f3-6f4a-4e0a-9f0b-91f1a8a5c002'

function build(props: Record<string, unknown> = {}): Annotation {
  return new Annotation({ ownerId: OWNER, recordingId: RECORDING, atSeconds: 42, ...props })
}

describe('AnnotationTime', () => {
  it('arredonda pra baixo — o segundo é inteiro', () => {
    expect(new AnnotationTime(42.9).value).toBe(42)
  })

  it('aceita o começo do áudio', () => {
    expect(new AnnotationTime(0).value).toBe(0)
  })

  it('recusa negativo, texto e absurdo', () => {
    expect(() => new AnnotationTime(-1)).toThrow()
    expect(() => new AnnotationTime(Number('abc'))).toThrow()
    expect(() => new AnnotationTime(AnnotationTime.MAX_SECONDS + 1)).toThrow()
  })
})

describe('AnnotationNote', () => {
  it('nota ausente ou em branco é marcador puro, não erro', () => {
    expect(AnnotationNote.from(undefined)).toBeNull()
    expect(AnnotationNote.from('   ')).toBeNull()
  })

  it('recusa nota longa demais', () => {
    expect(() => new AnnotationNote('a'.repeat(AnnotationNote.MAX_LENGTH + 1))).toThrow()
  })
})

describe('Annotation', () => {
  it('marcador sem nota é válido', () => {
    const mark = build()
    expect(mark.hasNote).toBe(false)
    expect(mark.at.value).toBe(42)
  })

  it('escrever depois transforma o marcador em anotação', () => {
    const mark = build()
    mark.editNote('Aqui ele fala do orçamento')

    expect(mark.hasNote).toBe(true)
    expect(mark.note!.value).toBe('Aqui ele fala do orçamento')
  })

  it('apagar o texto NÃO apaga o marcador — a pessoa ainda pediu pra lembrar do momento', () => {
    const mark = build({ note: 'algo' })
    mark.editNote('')

    expect(mark.hasNote).toBe(false)
    expect(mark.at.value).toBe(42)
  })

  it('exige dono e gravação', () => {
    expect(() => new Annotation({ recordingId: RECORDING, atSeconds: 1 })).toThrow()
    expect(() => new Annotation({ ownerId: OWNER, atSeconds: 1 })).toThrow()
  })
})
