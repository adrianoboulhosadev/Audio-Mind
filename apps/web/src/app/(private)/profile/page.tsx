'use client'

import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
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
    deleteAccount,
    deleting,
    acknowledged,
    setAcknowledged,
    confirming,
    openConfirm,
    closeConfirm,
  } = useProfile()

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

      {/* Direito à eliminação (LGPD, Lei 13.709/2018, art. 18, VI): o que a tela
          promete é o que o backend faz — some tudo, não é conta desativada com
          os dados guardados atrás. Por isso o texto LISTA o que vai embora, e o
          botão só libera depois que a pessoa marca que entendeu. */}
      <section className="rounded-2xl border border-bad/30 bg-panel p-5">
        <h2 className="text-sm font-semibold text-bad">Excluir minha conta e meus dados</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Ao excluir a conta, apagamos <strong className="text-ink2">todos</strong> os seus dados dos
          nossos servidores, de forma permanente e imediata:
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-muted">
          <li>seus áudios (os gravados aqui e os enviados por você);</li>
          <li>as transcrições, os resumos e os PDFs gerados a partir deles;</li>
          <li>as tarefas tiradas desses resumos, feitas ou pendentes;</li>
          <li>seus avisos da caixa de entrada;</li>
          <li>seu cadastro — nome, e-mail e senha — e todas as sessões abertas.</li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Não fica cópia, não dá para desfazer e não temos como recuperar nada depois. É o seu
          direito de eliminação dos dados pessoais (LGPD, Lei nº 13.709/2018, art. 18, VI). Se quiser
          guardar algum resumo, baixe o PDF antes.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-ink2">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-bad"
          />
          <span>
            Estou ciente de que todos os meus dados serão apagados junto com a conta e de que essa
            ação é definitiva.
          </span>
        </label>

        <Button
          variant="danger"
          onClick={openConfirm}
          disabled={!acknowledged || deleting}
          className="mt-4"
        >
          Excluir conta e dados
        </Button>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Excluir sua conta e todos os seus dados?"
        description="Seus áudios, transcrições, resumos, PDFs, tarefas e avisos serão apagados junto com o cadastro. É definitivo — não temos como recuperar depois."
        confirmLabel={deleting ? 'Excluindo…' : 'Excluir tudo'}
        onConfirm={deleteAccount}
        onCancel={closeConfirm}
      />
    </div>
  )
}
