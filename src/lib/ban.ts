/**
 * Base Adresse Nationale — la recherche d'adresse du back-office.
 *
 * API publique, sans clé, et interrogée directement plutôt que relayée par
 * notre serveur : rien de ce qui y transite n'est propre à une commune ni
 * privé, et un relais n'ajouterait qu'un saut. Le pendant mobile
 * (`mobile/src/lib/ban.ts`) fait le chemin inverse — coordonnées vers adresse —
 * pour la même raison et avec la même source, ce qui est ce qui garantit que
 * les deux clients ne se contredisent jamais sur l'endroit d'un signalement.
 */

const BASE = 'https://api-adresse.data.gouv.fr'
const TIMEOUT_MS = 5000

export interface AddressSuggestion {
  label: string
  lat: number
  lng: number
  /** Le code INSEE que la BAN attribue — le même que celui du routage serveur. */
  inseeCode: string | null
}

interface BanFeature {
  properties: { label?: string; citycode?: string }
  geometry: { coordinates: [number, number] }
}

/**
 * Cherche une adresse, en priorisant les environs d'un point.
 *
 * `lat`/`lng` ne restreignent pas le résultat, ils le trient : « rue de la
 * Gare » existe dans toutes les communes de France, et l'agent cherche la
 * sienne.
 */
export async function searchAddress(
  query: string,
  near?: { lat: number; lng: number }
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return []

  const url = new URL('/search/', BASE)
  url.searchParams.set('q', query.trim())
  url.searchParams.set('limit', '5')
  if (near) {
    url.searchParams.set('lat', String(near.lat))
    url.searchParams.set('lon', String(near.lng))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return []

    const payload = (await response.json()) as { features?: BanFeature[] }

    return (payload.features ?? []).map((feature) => ({
      label: feature.properties.label ?? '',
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      inseeCode: feature.properties.citycode ?? null,
    }))
  } catch {
    // Une recherche d'adresse qui échoue ne doit rien bloquer : l'agent place
    // son épingle à la main, ce qui reste le geste de référence.
    return []
  } finally {
    clearTimeout(timeout)
  }
}
