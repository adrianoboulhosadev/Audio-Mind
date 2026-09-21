import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/components/checkbox'
import { Label } from '@/components/label'

/**
 * The contract this file exists for.
 *
 * The box is a BUTTON now, not `<input type="checkbox">`, and it is no longer
 * wrapped by its own `<label>` — the two are tied by `htmlFor`/`id`. That
 * wiring is invisible when it breaks: the box still draws, still toggles when
 * clicked directly, and only the text beside it goes dead. On the profile
 * screen that text is the acknowledgement that unlocks erasing an account, and
 * it is a long sentence — the part people actually aim at.
 */
function Harness() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <Checkbox
        id="acknowledge"
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
      />
      <Label htmlFor="acknowledge">Estou ciente</Label>
      <button type="button" disabled={!checked}>
        Excluir
      </button>
    </div>
  )
}

test('clicking the LABEL toggles the box', async () => {
  render(<Harness />)
  const box = screen.getByRole('checkbox', { name: 'Estou ciente' })

  expect(box).not.toBeChecked()
  await userEvent.click(screen.getByText('Estou ciente'))

  expect(box).toBeChecked()
  expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled()
})

test('the box is reachable and operable from the keyboard', async () => {
  render(<Harness />)

  await userEvent.tab()
  expect(screen.getByRole('checkbox', { name: 'Estou ciente' })).toHaveFocus()

  await userEvent.keyboard(' ')
  expect(screen.getByRole('checkbox', { name: 'Estou ciente' })).toBeChecked()
})
