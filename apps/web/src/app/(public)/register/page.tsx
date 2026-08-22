'use client'

import Link from 'next/link'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { useRegister } from './hooks/use-register'

export default function RegisterPage() {
  const { form, submit, failure, submitting } = useRegister()
  const { register, formState, getValues } = form

  return (
    <>
      <h1 className="text-2xl font-semibold text-ink">Criar conta</h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        É de graça e leva um minuto. Depois é só gravar ou enviar um áudio.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nome (opcional)" placeholder="Como quer ser chamado" {...register('name')} />
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
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Mínimo de 8 caracteres, com uma maiúscula, um número e um símbolo."
          error={formState.errors.password?.message}
          {...register('password', { required: 'Escolha uma senha.' })}
        />
        <Field
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={formState.errors.confirmPassword?.message}
          // UI-level validation only: the password POLICY is the domain's rule
          // (StrongPassword), and the API is reachable without this form.
          {...register('confirmPassword', {
            validate: (value) => value === getValues('password') || 'As senhas não conferem.',
          })}
        />

        {failure ? <p className="text-sm text-bad">{failure}</p> : null}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
