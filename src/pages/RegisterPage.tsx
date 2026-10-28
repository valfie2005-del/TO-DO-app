import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, error, clearError, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: FormValues) => {
    clearError()
    try {
      const result = await signUp(values.email, values.password)
      if (result.needsConfirmation) {
        setNeedsConfirmation(true)
      } else {
        navigate('/today', { replace: true })
      }
    } catch {
      // error in store
    }
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[rgba(76,201,255,0.12)] bg-[#0B1020] p-6 text-center">
          <h2 className="text-xl font-semibold text-[#E8ECF8]">Check your email</h2>
          <p className="mt-2 text-[#8B95B3]">
            We sent a confirmation link. Open it to activate your account, then sign in.
          </p>
          <Link to="/login" className="mt-6 inline-block text-[#4CC9FF] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] bg-clip-text text-transparent">
            40 Days
          </h1>
          <p className="mt-2 text-[#8B95B3]">Create your account</p>
        </div>

        <div className="rounded-2xl border border-[rgba(76,201,255,0.12)] bg-[#0B1020]/backdrop-blur-[14px] p-6 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.password?.message}
                hint="Min 8 chars, upper, lower, number"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-[#8B95B3] hover:text-[#E8ECF8]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Input
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting || isLoading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8B95B3]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#4CC9FF] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
