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
  const [deleting, setDeleting] = useState(false)
  // The two steps the erasure asks for, in order: the person states they
  // understand what goes away, and only then confirms it.
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirming, setConfirming] = useState(false)

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

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      // Erases the audios, the transcripts, the summaries, the PDFs, the inbox
      // and the account itself — and revokes every session on the way out, so
      // there is nothing left to log out of. The front just drops its own state.
      await api.delete('/user/me')
      await logout()
      router.replace('/login')
    } catch (error) {
      toast.error(errorMessage(error))
      setDeleting(false)
      setConfirming(false)
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
    deleteAccount,
    deleting,
    acknowledged,
    setAcknowledged,
    confirming,
    openConfirm: () => setConfirming(true),
    closeConfirm: () => setConfirming(false),
  }
}
