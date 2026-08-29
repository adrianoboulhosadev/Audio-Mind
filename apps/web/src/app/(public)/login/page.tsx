'use client'

import Link from 'next/link'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { useLogin } from './hooks/use-login'

export default function LoginPage() {
  const { form, submit, failure, submitting } = useLogin()
  const { register, formState } = form

  return (
    <>
      <h1 className="text-2xl font-semibold text-ink">Audio Mind</h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Entre para ver seus áudios, transcrições e resumos.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          error={formState.errors.email?.message}
          {...register('email', { required: 'Informe seu e-mail.' })}
        />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={formState.errors.password?.message}
          {...register('password', { required: 'Informe sua senha.' })}
        />

        {failure ? <p className="text-sm text-bad">{failure}</p> : null}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </>
  )
}
