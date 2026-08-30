import { Task, TaskText } from '../src'

const OWNER = '9f1d2f36-6f4a-4e0a-9f0b-91f1a8a5c001'
const RECORDING = '9f1d2f36-6f4a-4e0a-9f0b-91f1a8a5c002'

function makeTask(text = 'Mandar a proposta pro cliente'): Task {
  return new Task({ ownerId: OWNER, recordingId: RECORDING, text })
}

describe('Task', () => {
  it('exige dono e gravação', () => {
    expect(() => new Task({ recordingId: RECORDING, text: 'x' })).toThrow()
    expect(() => new Task({ ownerId: OWNER, text: 'x' })).toThrow()
  })

  it('recusa texto vazio e texto longo demais', () => {
    expect(() => makeTask('   ')).toThrow()
    expect(() => makeTask('a'.repeat(TaskText.MAX_LENGTH + 1))).toThrow()
  })

  it('normaliza o espaçamento do texto', () => {
    expect(makeTask('  Mandar   a   proposta ').text.value).toBe('Mandar a proposta')
  })

  it('nasce pendente', () => {
    expect(makeTask().isDone).toBe(false)
  })

  it('guarda a PRIMEIRA marcação — dois cliques não reescrevem quando foi feito', () => {
    const task = makeTask()
    task.markAsDone()
    const first = task.doneAt
    task.markAsDone()

    expect(task.isDone).toBe(true)
    expect(task.doneAt).toBe(first)
  })

  it('desmarcar volta pra pendente', () => {
    const task = makeTask()
    task.markAsDone()
    task.reopen()

    expect(task.isDone).toBe(false)
    expect(task.doneAt).toBeNull()
  })
})
