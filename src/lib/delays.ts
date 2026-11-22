/**
 * Un délai en heures, dit comme on le lit.
 *
 * Partagé par la page Performance et ses panneaux : « 156 h » ne se compare à
 * rien, « 6 j 12 h » se compare à un lundi. Au-delà de 24 h l'unité de lecture
 * devient le jour.
 */

/** Le nombre et son unité, pour les grands chiffres (34 px / 15 px). */
export function splitDelay(hours: number | null | undefined): { value: string; unit: string } {
  if (hours === null || hours === undefined) return { value: '—', unit: '' }
  if (hours < 24) return { value: String(Math.round(hours)), unit: 'h' }

  const days = Math.floor(hours / 24)
  const rest = Math.round(hours % 24)

  // « 7 j 00 h » se lit deux fois plus lentement que « 7 j » pour dire la même chose.
  if (rest === 0) return { value: `${days} j`, unit: '' }

  return { value: `${days} j ${String(rest).padStart(2, '0')}`, unit: 'h' }
}

/** Le même délai sur une ligne, pour une table ou un export. */
export function formatDelay(hours: number | null | undefined): string {
  const { value, unit } = splitDelay(hours)
  return unit ? `${value} ${unit}` : value
}
