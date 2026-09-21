import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectField } from '@/components/select-field'

/**
 * The contract this file exists for.
 *
 * The dropdown stopped being a `<select>` when it became Radix's listbox, and
 * the value stopped arriving as a change event to be read off
 * `event.target.value` — it arrives as a STRING. Three screens pass the picked
 * value straight into a command (the kind of an audio, the window of a share
 * link), so a component that silently handed back the wrong thing would mean a
 * dropdown that looks like it works and saves nothing.
 *
 * Driven by keyboard on purpose: it is the behaviour a native `<select>` gave
 * for free and the one a hand-built listbox loses first.
 */
const OPTIONS = [
  { value: 'meeting', label: 'Reunião' },
  { value: 'class', label: 'Aula' },
]

function Harness({ onPick }: { onPick: (value: string) => void }) {
  const [value, setValue] = useState('meeting')

  return (
    <SelectField
      label="Tipo de áudio"
      options={OPTIONS}
      value={value}
      onValueChange={(picked) => {
        setValue(picked)
        onPick(picked)
      }}
    />
  )
}

test('the trigger shows the label of the current value, not the value', () => {
  render(<Harness onPick={jest.fn()} />)

  expect(screen.getByRole('combobox', { name: 'Tipo de áudio' })).toHaveTextContent('Reunião')
})

test('picking an option reports the option VALUE as a string', async () => {
  const onPick = jest.fn()
  render(<Harness onPick={onPick} />)

  await userEvent.click(screen.getByRole('combobox', { name: 'Tipo de áudio' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Aula' }))

  expect(onPick).toHaveBeenCalledWith('class')
  expect(screen.getByRole('combobox', { name: 'Tipo de áudio' })).toHaveTextContent('Aula')
})
