import { create } from 'zustand'
import type { DateKey } from '@/types'
import { getLocalToday } from '@/utils/dates'

interface UiState {
  selectedDate: DateKey
  addTaskModalOpen: boolean
  addTaskDefaults: {
    type?: 'challenge' | 'single'
    startDate?: DateKey
  }

  setSelectedDate: (date: DateKey) => void
  goToToday: (timeZone?: string) => void
  openAddTaskModal: (defaults?: UiState['addTaskDefaults']) => void
  closeAddTaskModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedDate: getLocalToday(),
  addTaskModalOpen: false,
  addTaskDefaults: {},

  setSelectedDate: (date) => set({ selectedDate: date }),
  goToToday: (timeZone) => set({ selectedDate: getLocalToday(timeZone) }),
  openAddTaskModal: (defaults = {}) =>
    set({ addTaskModalOpen: true, addTaskDefaults: defaults }),
  closeAddTaskModal: () => set({ addTaskModalOpen: false, addTaskDefaults: {} }),
}))
