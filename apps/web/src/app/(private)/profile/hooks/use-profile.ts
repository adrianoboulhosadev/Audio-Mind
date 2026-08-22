'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ChangePasswordInput } from '@auth/adapters'
import { useAuth } from '@/contexts/auth-context'
import { api, errorMessage } from '@/lib/api'

interface PasswordForm extends ChangePasswordInput {
  confirmPassword: string
}

export function useProfile() {
  const { user, refreshUser, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    if (user) setName(user.name ?? '')
  }, [user])

  const passwordForm = useForm<PasswordForm>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  })

  const saveName = async () => {
    setSavingName(true)
    try {
      await api.patch('/user/me', { name: name.trim() || null })
      await refreshUser()
      toast.success('Nome atualizado.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSavingName(false)
    }
  }

  const changePassword = passwordForm.handleSubmit(async ({ confirmPassword: _ignored, ...input }) => {
    try {
      await api.post('/user/change-password', input)
      passwordForm.reset()
      toast.success('Senha alterada.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const deactivate = async () => {
    setDeactivating(true)
    try {
      // The use case also revokes every open session, so there is nothing left
      // to log out of — the front just clears its own state and leaves.
      await api.delete('/user/deactivate')
      await logout()
      router.replace('/login')
    } catch (error) {
      toast.error(errorMessage(error))
      setDeactivating(false)
    }
  }

  return {
    user,
    name,
    setName,
    saveName,
    savingName,
    passwordForm,
    changePassword,
    deactivate,
    deactivating,
  }
}
