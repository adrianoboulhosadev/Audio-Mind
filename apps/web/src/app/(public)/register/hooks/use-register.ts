'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { RegisterUserInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { errorMessage } from '@/lib/api'

interface RegisterForm extends RegisterUserInput {
  confirmPassword: string
}

export function useRegister() {
  const { register: createAccount } = useAuth()
  const router = useRouter()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<RegisterForm>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const submit = form.handleSubmit(async ({ confirmPassword: _ignored, ...input }) => {
    setFailure(null)
    try {
      await createAccount(input)
      // Signing up already opened the session, so this goes straight to the
      // library — the empty state there is what says "grave ou envie um áudio".
      toast.success('Conta criada! Bem-vindo ao Audio Mind.')
      router.replace('/recordings')
    } catch (error) {
      setFailure(errorMessage(error))
    }
  })

  return { form, submit, failure, submitting: form.formState.isSubmitting }
}
