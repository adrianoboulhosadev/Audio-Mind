'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import type { LoginUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { errorMessage } from '@/lib/api'

export function useLogin() {
  const { login } = useAuth()
  const router = useRouter()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<LoginUserInput>({ defaultValues: { email: '', password: '' } })

  const submit = form.handleSubmit(async (input) => {
    setFailure(null)
    try {
      await login(input)
      router.replace('/recordings')
    } catch (error) {
      setFailure(errorMessage(error))
    }
  })

  return { form, submit, failure, submitting: form.formState.isSubmitting }
}
