import { Errors } from 'shared'
import { Notification } from '../src'

test('renders the copy in the domain, already finished, and links to the recording', () => {
  const notification = Notification.for({
    type: 'recording_ready',
    userId: 'user-1',
    referenceId: 'rec-1',
    recordingId: 'rec-1',
    title: 'Daily do time',
  })

  expect(notification.title).toBe('Resumo pronto')
  expect(notification.body).toContain('Daily do time')
  expect(notification.link).toBe('/recordings/rec-1')
  expect(notification.isRead).toBe(false)
})

test('a failure carries the REASON — a bare "deu erro" only makes the user retry blindly', () => {
  const notification = Notification.for({
    type: 'recording_failed',
    userId: 'user-1',
    referenceId: 'rec-1',
    recordingId: 'rec-1',
    title: 'Consulta',
    reason: 'O áudio não tem fala audível.',
  })

  expect(notification.body).toContain('O áudio não tem fala audível.')
})

test('markAsRead is idempotent and keeps the first timestamp', () => {
  const notification = Notification.for({ type: 'welcome', userId: 'user-1' })

  notification.markAsRead()
  const first = notification.readAt
  notification.markAsRead()

  expect(notification.readAt).toBe(first)
})

test('a notification without a recipient cannot exist', () => {
  expect(() => new Notification({ type: 'welcome', title: 'x', body: 'y' })).toThrow(
    expect.objectContaining({ code: Errors.REQUIRED_FIELD }),
  )
})
