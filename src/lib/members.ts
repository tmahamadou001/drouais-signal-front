/**
 * Comment nommer un membre de l'équipe : son nom, sinon son adresse e-mail, sinon rien du tout.
 *
 * Un membre jamais nommé s'affichait « Sans nom » — et trois « Sans nom » dans un menu ne se distinguent
 * pas. Le serveur ne rend l'adresse que pour ceux-là (voir `memberDirectory.ts`).
 */
export function memberLabel(
  member: { name: string | null; email?: string | null } | null | undefined,
  fallback = 'Sans nom'
): string {
  return member?.name?.trim() || member?.email?.trim() || fallback
}

/** Ce qu'on cherche dans un annuaire : le nom et l'adresse, sans accents ni casse. */
export function memberSearchText(member: { name: string | null; email?: string | null }): string {
  return `${member.name ?? ''} ${member.email ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
