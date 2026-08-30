import {
  Bell,
  Bookmark,
  FileAudio2,
  ListTodo,
  Shield,
  User,
  type LucideIcon,
} from 'lucide-react'

/**
 * The screens, in one list. Both navigations read it — the desktop column and
 * the mobile bottom bar — so adding a screen is one edit, and the two can never
 * disagree about what the app contains.
 *
 * `shortLabel` exists because the bottom bar gives each item about a thumb's
 * width: "Meus áudios" wraps there and "Áudios" does not.
 */
export interface NavItem {
  href: string
  label: string
  shortLabel: string
  Icon: LucideIcon
  /** Only rendered for an administrator. Hiding it is courtesy, not security —
   * what actually refuses a non-admin is the guard on the backend. */
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/recordings', label: 'Meus áudios', shortLabel: 'Áudios', Icon: FileAudio2 },
  { href: '/tasks', label: 'Tarefas', shortLabel: 'Tarefas', Icon: ListTodo },
  { href: '/markers', label: 'Marcadores', shortLabel: 'Marcas', Icon: Bookmark },
  { href: '/notifications', label: 'Notificações', shortLabel: 'Avisos', Icon: Bell },
  { href: '/profile', label: 'Perfil', shortLabel: 'Perfil', Icon: User },
  { href: '/admin', label: 'Admin', shortLabel: 'Admin', Icon: Shield, adminOnly: true },
]
