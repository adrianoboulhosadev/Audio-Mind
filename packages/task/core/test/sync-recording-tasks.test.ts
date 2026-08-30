import { SetTaskDone, SyncRecordingTasks, ListMyTasksQuery } from '../src'
import { TaskRepositoryInMemory } from './in-memory'

const OWNER = '9f1d2f36-6f4a-4e0a-9f0b-91f1a8a5c001'
const RECORDING = '9f1d2f36-6f4a-4e0a-9f0b-91f1a8a5c002'

function setup() {
  const repository = new TaskRepositoryInMemory()
  return {
    repository,
    sync: (texts: string[]) =>
      new SyncRecordingTasks(repository).execute({ recordingId: RECORDING, ownerId: OWNER, texts }),
    list: (filter?: 'pending' | 'done' | 'all') =>
      new ListMyTasksQuery(repository).execute({ ownerId: OWNER, filter }),
  }
}

describe('SyncRecordingTasks', () => {
  it('materializa os action items do resumo', async () => {
    const { sync, list } = setup()
    await sync(['Mandar a proposta', 'Marcar a reunião'])

    const feed = await list()
    expect(feed.pendingCount).toBe(2)
    expect(feed.items.map((item) => item.text)).toEqual(
      expect.arrayContaining(['Mandar a proposta', 'Marcar a reunião']),
    )
  })

  it('descarta item vazio e colapsa repetido', async () => {
    const { sync, repository } = setup()
    await sync(['Mandar a proposta', '  ', 'Mandar   a proposta'])

    expect(repository.size).toBe(1)
  })

  it('reprocessar NÃO duplica a lista', async () => {
    const { sync, repository } = setup()
    await sync(['Mandar a proposta', 'Marcar a reunião'])
    await sync(['Mandar a proposta', 'Marcar a reunião'])

    expect(repository.size).toBe(2)
  })

  it('reprocessar PRESERVA o que já foi marcado como feito', async () => {
    const { sync, repository, list } = setup()
    await sync(['Mandar a proposta'])
    const [task] = (await list()).items
    await new SetTaskDone(repository).execute({ taskId: task.id, ownerId: OWNER, done: true })

    await sync(['Mandar a proposta'])

    const done = await list('done')
    expect(done.items).toHaveLength(1)
    expect(done.items[0].id).toBe(task.id)
  })

  it('some com o que o modelo parou de dizer — mas só se ainda estiver pendente', async () => {
    const { sync, repository, list } = setup()
    await sync(['Some depois', 'Fica feito'])
    const feito = (await list()).items.find((item) => item.text === 'Fica feito')!
    await new SetTaskDone(repository).execute({ taskId: feito.id, ownerId: OWNER, done: true })

    await sync(['Outra coisa'])

    const all = await list('all')
    expect(all.items.map((item) => item.text).sort()).toEqual(['Fica feito', 'Outra coisa'])
  })
})

describe('SetTaskDone', () => {
  it('tarefa de outro dono responde como inexistente', async () => {
    const { sync, repository, list } = setup()
    await sync(['Mandar a proposta'])
    const [task] = (await list()).items

    await expect(
      new SetTaskDone(repository).execute({
        taskId: task.id,
        ownerId: '9f1d2f36-6f4a-4e0a-9f0b-91f1a8a5c003',
        done: true,
      }),
    ).rejects.toThrow()
  })

  it('desmarcar devolve pra lista de pendentes', async () => {
    const { sync, repository, list } = setup()
    await sync(['Mandar a proposta'])
    const [task] = (await list()).items

    await new SetTaskDone(repository).execute({ taskId: task.id, ownerId: OWNER, done: true })
    expect((await list()).pendingCount).toBe(0)

    await new SetTaskDone(repository).execute({ taskId: task.id, ownerId: OWNER, done: false })
    expect((await list()).pendingCount).toBe(1)
  })
})
