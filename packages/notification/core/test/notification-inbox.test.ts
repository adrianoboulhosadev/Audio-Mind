import { Errors } from 'shared'
import {
  DeleteAllNotifications,
  DeleteNotification,
  ListMyNotificationsQuery,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  SendNotifications,
} from '../src'
import { NotificationRepositoryInMemory } from './in-memory'

const READY = {
  type: 'recording_ready' as const,
  userId: 'user-1',
  referenceId: 'rec-1',
  recordingId: 'rec-1',
  title: 'Daily do time',
}

test('re-delivering the same event does NOT duplicate the inbox line', async () => {
  const repository = new NotificationRepositoryInMemory()
  const useCase = new SendNotifications(repository)

  await useCase.execute({ items: [READY] })
  await useCase.execute({ items: [READY] })

  expect(repository.size).toBe(1)
})

test('the badge counts the whole inbox, not just the returned slice', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      READY,
      { ...READY, referenceId: 'rec-2', recordingId: 'rec-2' },
      { ...READY, referenceId: 'rec-3', recordingId: 'rec-3' },
    ],
  })

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: 'user-1', limit: 1 })

  expect(feed.items).toHaveLength(1)
  expect(feed.unreadCount).toBe(3)
})

test('the inbox only ever shows the caller s own lines', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [READY, { ...READY, userId: 'user-2' }],
  })

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: 'user-2' })
  expect(feed.items).toHaveLength(1)
})

test('reading and deleting someone else s notification answers NOTIFICATION_NOT_FOUND', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({ items: [READY] })
  const [line] = await repository.listByUserQuery('user-1', 10)

  await expect(
    new MarkNotificationAsRead(repository).execute({ notificationId: line.id, userId: 'intruder' }),
  ).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
  await expect(
    new DeleteNotification(repository).execute({ notificationId: line.id, userId: 'intruder' }),
  ).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
  expect(repository.size).toBe(1)
})

test('mark-all and delete-all are scoped to one user', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [READY, { ...READY, userId: 'user-2' }],
  })

  await new MarkAllNotificationsAsRead(repository).execute({ userId: 'user-1' })
  expect(await repository.countUnreadQuery('user-1')).toBe(0)
  expect(await repository.countUnreadQuery('user-2')).toBe(1)

  await new DeleteAllNotifications(repository).execute({ userId: 'user-1' })
  expect(repository.size).toBe(1)
})
