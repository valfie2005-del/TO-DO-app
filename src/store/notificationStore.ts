import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppNotification } from '@/types'

interface NotificationState {
  items: AppNotification[]
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  /** Track which missed events already notified: `${taskId}:${dateKey}` */
  acknowledgedMissKeys: string[]
  acknowledgeMiss: (key: string) => void
  hasAcknowledgedMiss: (key: string) => boolean
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      acknowledgedMissKeys: [],
      push: (n) => {
        const item: AppNotification = {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          read: false,
        }
        set((s) => ({ items: [item, ...s.items].slice(0, 50) }))
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(item.title, { body: item.body })
          } catch {
            /* ignore */
          }
        }
      },
      markRead: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
        })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      acknowledgeMiss: (key) =>
        set((s) =>
          s.acknowledgedMissKeys.includes(key)
            ? s
            : { acknowledgedMissKeys: [...s.acknowledgedMissKeys, key].slice(-200) }
        ),
      hasAcknowledgedMiss: (key) => get().acknowledgedMissKeys.includes(key),
    }),
    { name: '40days-notifications' }
  )
)

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}