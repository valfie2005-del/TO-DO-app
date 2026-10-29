export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          type: 'challenge' | 'single'
          start_date: string
          duration_days: number
          due_date: string | null
          reminder_time: string | null
          description: string | null
          start_time: string | null
          end_time: string | null
          grace_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          type: 'challenge' | 'single'
          start_date: string
          duration_days: number
          due_date?: string | null
          reminder_time?: string | null
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          grace_minutes?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: 'challenge' | 'single'
          start_date?: string
          duration_days?: number
          due_date?: string | null
          reminder_time?: string | null
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          grace_minutes?: number
          created_at?: string
        }
        Relationships: []
      }
      completions: {
        Row: {
          id: string
          task_id: string
          completed_on: string
          created_at: string
          completed_at: string | null
          completion_kind: 'on_time' | 'late' | null
        }
        Insert: {
          id?: string
          task_id: string
          completed_on: string
          created_at?: string
          completed_at?: string | null
          completion_kind?: 'on_time' | 'late' | null
        }
        Update: {
          id?: string
          task_id?: string
          completed_on?: string
          created_at?: string
          completed_at?: string | null
          completion_kind?: 'on_time' | 'late' | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_date_in_task_schedule: {
        Args: { p_task_id: string; p_date: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}
