import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { Field } from '@/components/field'

/**
 * The regression this file exists for.
 *
 * Every form in this app is `<Field {...register('x')} />`. React strips `ref`
 * from the props of a plain function component, so a `Field` that is not a
 * forwardRef never hands the input to react-hook-form: typing fills the DOM, the
 * library still sees an empty field, and submitting answers "informe o campo".
 *
 * Nothing else catches it. TypeScript is happy, the build is happy, and React
 * only warns about the dropped ref in development — so a production bundle ships
 * a login screen nobody can get past.
 */
function TestForm({ onSubmit }: { onSubmit: (values: { email: string }) => void }) {
  const { register, handleSubmit, formState } = useForm<{ email: string }>({
    defaultValues: { email: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field
        label="E-mail"
        placeholder="voce@email.com"
        error={formState.errors.email?.message}
        {...register('email', { required: 'Informe seu e-mail.' })}
      />
      <button type="submit">Entrar</button>
    </form>
  )
}

test('a value typed into a Field reaches react-hook-form on submit', async () => {
  const onSubmit = jest.fn()
  render(<TestForm onSubmit={onSubmit} />)

  await userEvent.type(screen.getByPlaceholderText('voce@email.com'), 'adriano@audiomind.dev')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'adriano@audiomind.dev' }),
    expect.anything(),
  )
})

test('a filled Field does not report itself as missing', async () => {
  render(<TestForm onSubmit={jest.fn()} />)

  await userEvent.type(screen.getByPlaceholderText('voce@email.com'), 'adriano@audiomind.dev')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

  expect(screen.queryByText('Informe seu e-mail.')).not.toBeInTheDocument()
})

test('an empty Field still reports the validation message', async () => {
  render(<TestForm onSubmit={jest.fn()} />)

  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

  expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
})
