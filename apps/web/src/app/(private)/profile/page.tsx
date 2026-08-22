'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { formatDateTime } from '@/lib/format'
import { useProfile } from './hooks/use-profile'

export default function ProfilePage() {
  const {
    user,
    name,
    setName,
    saveName,
    savingName,
    passwordForm,
    changePassword,
    deactivate,
    deactivating,
  } = useProfile()
  const [confirming, setConfirming] = useState(false)

  if (!user) return <Loading />

  const { register, formState, getValues } = passwordForm

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Conta</h2>
        <p className="mt-1 text-xs text-muted">{user.email}</p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Field
              label="Nome"
              placeholder="Como quer ser chamado"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button variant="ghost" onClick={saveName} disabled={savingName}>
            Salvar
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Trocar senha</h2>

        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-4">
          <Field
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            error={formState.errors.oldPassword?.message}
            {...register('oldPassword', { required: 'Informe a senha atual.' })}
          />
          <Field
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres, com uma maiúscula, um número e um símbolo."
            error={formState.errors.newPassword?.message}
            {...register('newPassword', { required: 'Escolha a nova senha.' })}
          />
          <Field
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            error={formState.errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: (value) => value === getValues('newPassword') || 'As senhas não conferem.',
            })}
          />
          <Button type="submit" disabled={formState.isSubmitting} className="self-start">
            Trocar senha
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-bad/30 bg-panel p-5">
        <h2 className="text-sm font-semibold text-bad">Desativar conta</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Você deixa de conseguir entrar e todas as sessões abertas caem na hora. Seus áudios
          continuam no servidor — exclua os que quiser antes.
        </p>
        <Button variant="danger" onClick={() => setConfirming(true)} className="mt-4">
          Desativar
        </Button>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Desativar sua conta?"
        description="Você vai ser desconectado de todos os dispositivos e não vai mais conseguir entrar."
        confirmLabel={deactivating ? 'Desativando…' : 'Desativar'}
        onConfirm={deactivate}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
