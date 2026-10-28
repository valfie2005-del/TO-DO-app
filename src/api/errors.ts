/**
 * Centralized API error handling.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(err: unknown, fallback = 'Something went wrong'): ApiError {
  if (err instanceof ApiError) return err

  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message: string; code?: string; status?: number; details?: string }
    // Supabase often puts useful info in message
    const msg = e.message || e.details || fallback
    return new ApiError(msg, e.code, e.status)
  }

  if (err instanceof Error) {
    return new ApiError(err.message || fallback)
  }

  return new ApiError(fallback)
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return e?.code === '23505' || (e?.message?.includes('duplicate') ?? false)
}
