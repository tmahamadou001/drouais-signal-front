/**
 * Les mentions « @Prénom Nom » d'un message interne.
 *
 * Trois fonctions pures, parce que c'est là que ça se trompe : où est la mention
 * en cours de saisie, comment l'insérer, et lesquelles sont encore dans le texte
 * au moment d'envoyer. Le composant ne fait que brancher le clavier dessus.
 */

export interface MentionQuery {
  /** Index du « @ » dans le texte. */
  start: number
  /** Ce qui a été tapé après lui. */
  query: string
}

export interface Mentionable {
  id: string
  name: string
}

/**
 * La mention en cours de saisie à cette position, ou `null`.
 *
 * Un « @ » ne ouvre une mention que s'il est en début de texte ou précédé d'un
 * espace : « jean@mairie.fr » est une adresse, pas une citation. La saisie
 * s'arrête à la fin de la ligne, et à deux mots — un nom complet, pas une phrase.
 */
export function detectMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(before[at - 1])) return null

  const query = before.slice(at + 1)
  if (query.includes('\n')) return null
  if (query.trim().split(/\s+/).filter(Boolean).length > 2) return null
  // Un second espace en fin de saisie clôt la mention : on est repassé au texte.
  if (/\s\s$/.test(query)) return null

  return { start: at, query }
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Les candidats dont le nom commence, ou contient un mot qui commence, par la saisie. */
export function filterMentionable<T extends Mentionable>(candidates: T[], query: string, limit = 6): T[] {
  const needle = normalize(query.trim())
  if (!needle) return candidates.slice(0, limit)

  return candidates
    .filter((candidate) => normalize(candidate.name).split(/\s+/).some((word) => word.startsWith(needle)) || normalize(candidate.name).startsWith(needle))
    .slice(0, limit)
}

/** Remplace la saisie en cours par la mention complète, et rend le texte et la nouvelle position du curseur. */
export function applyMention(
  text: string,
  caret: number,
  match: MentionQuery,
  name: string
): { text: string; caret: number } {
  const mention = `@${name} `
  const next = text.slice(0, match.start) + mention + text.slice(caret)
  return { text: next, caret: match.start + mention.length }
}

/** Ceux dont « @Nom » figure encore dans le texte : on a pu effacer la mention après l'avoir choisie. */
export function mentionedIn(text: string, picked: Mentionable[]): string[] {
  const ids: string[] = []
  for (const person of picked) {
    if (text.includes(`@${person.name}`) && !ids.includes(person.id)) ids.push(person.id)
  }
  return ids
}

export interface Segment {
  text: string
  mention: boolean
}

/** Découpe un message pour surligner les mentions des membres connus. */
export function segmentsOf(text: string, names: string[]): Segment[] {
  const known = names.filter(Boolean).sort((a, b) => b.length - a.length)
  if (known.length === 0) return [{ text, mention: false }]

  const escaped = known.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')

  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, mention: part.startsWith('@') && known.some((name) => part === `@${name}`) }))
}
