import { PAGES_A } from './pages-a.ts'
import { PAGES_B } from './pages-b.ts'
import { PAGES_C } from './pages-c.ts'
import { PAGES_D } from './pages-d.ts'
import { PAGES_EF } from './pages-ef.ts'

export const THEATER_PREMIUM_PAGES: Record<string, string> = {
  ...PAGES_A,
  ...PAGES_B,
  ...PAGES_C,
  ...PAGES_D,
  ...PAGES_EF,
}

export function assertPremiumComplete() {
  const missing: string[] = []
  for (let i = 1; i <= 50; i++) {
    const id = String(i).padStart(2, '0')
    if (!THEATER_PREMIUM_PAGES[id]) missing.push(id)
  }
  return missing
}
