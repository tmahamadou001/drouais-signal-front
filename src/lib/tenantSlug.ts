/**
 * L'adresse d'une commune (`<slug>.onsignale.fr`), côté écran.
 *
 * Miroir de `server/src/lib/tenantSlug.ts`, qui seul fait autorité : ici on ne
 * fait que dire à l'agent, avant l'envoi, ce que le serveur refusera.
 */
export const SLUG_MIN = 3
export const SLUG_MAX = 40

const FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const RESERVED = new Set([
  'www', 'api', 'admin', 'app', 'mail', 'send', 'smtp', 'ftp', 'status',
  'blog', 'docs', 'help', 'support', 'static', 'assets', 'cdn', 'dev',
  'staging', 'test', 'demo-api', 'localhost', 'onsignale',
])

export type SlugProblem = 'length' | 'format' | 'reserved'

export const SLUG_PROBLEMS: Record<SlugProblem, string> = {
  length: `Entre ${SLUG_MIN} et ${SLUG_MAX} caractères.`,
  format: 'Minuscules, chiffres et tirets uniquement, sans tiret au début ni à la fin.',
  reserved: 'Cette adresse est réservée par la plateforme.',
}

export function slugProblem(raw: string): SlugProblem | null {
  const slug = raw.trim().toLowerCase()
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return 'length'
  if (!FORMAT.test(slug)) return 'format'
  if (RESERVED.has(slug)) return 'reserved'
  return null
}

/**
 * L'adresse qu'on proposerait : le slug sans le code INSEE que la création
 * automatique y ajoute (`villemeux-sur-eure-28415` → `villemeux-sur-eure`).
 * Rend le slug tel quel quand il n'a pas ce suffixe — `la-loupe` n'a rien à perdre.
 */
export function suggestSlug(slug: string): string {
  return slug.replace(/-\d{5}$/, '')
}
