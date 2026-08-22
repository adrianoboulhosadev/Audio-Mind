/** Read by the Sidebar (the desktop column and the mobile drawer are the same
 * component), so the list of screens is one decision in one place. */
export interface NavItem {
  href: string
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/recordings', label: 'Meus áudios', icon: 'library' },
  { href: '/notifications', label: 'Notificações', icon: 'bell' },
  { href: '/profile', label: 'Perfil', icon: 'user' },
]
