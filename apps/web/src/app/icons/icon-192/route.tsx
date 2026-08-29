import { iconMarkResponse } from '../icon-mark'

export const dynamic = 'force-static'

export function GET() {
  return iconMarkResponse({ size: 192 })
}
