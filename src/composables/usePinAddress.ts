import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useTenantStore } from '@/stores/tenant'

/**
 * L'adresse du point où l'épingle est posée.
 *
 * Sans elle, l'agent place un marqueur sur une carte et ne sait pas sur quelle
 * rue il vient de le poser : il ne découvre l'adresse qu'après enregistrement,
 * une fois le serveur l'avoir résolue. Sur une carte de commune à ce niveau de
 * zoom, deux rues parallèles se ressemblent beaucoup.
 *
 * **Elle passe par `GET /api/tenants/resolve`, et c'est le point important.**
 * C'est exactement la fonction que le serveur appellera à l'enregistrement pour
 * décider de l'adresse stockée *et* du territoire. Interroger la BAN
 * directement d'ici aurait donné un libellé de forme voisine, construit
 * autrement — donc un écran qui annonce une adresse et une base qui en
 * enregistre une autre. Une seule source, une seule réponse.
 */

export interface PinAddress {
  addressLabel: string | null
  communeName: string
  /** `null` quand la commune n'est pas cliente. */
  tenantSlug: string | null
}

/** ~11 m sous nos latitudes : en deçà, l'adresse ne change pas. */
const SAME_SPOT = 1e-4
/** Le temps qu'on laisse à la main de l'agent avant d'interroger le serveur. */
const SETTLE_MS = 600

export function usePinAddress() {
  const { apiFetch } = useApi()
  const tenantStore = useTenantStore()

  const address = ref<PinAddress | null>(null)
  const resolving = ref(false)

  let debounce: ReturnType<typeof setTimeout> | null = null
  let last: { lat: number; lng: number } | null = null

  /**
   * Le point est-il hors de la commune de l'agent ?
   *
   * Le serveur refusera l'enregistrement (422 `outside_territory`) : autant le
   * dire pendant qu'on vise. Ce n'est **pas** un double de la règle — la
   * décision reste entière côté serveur, qui compare des codes INSEE. Ici on ne
   * fait que relayer ce que la même fonction vient de répondre.
   */
  const outsideCommune = computed(
    () => address.value !== null && address.value.tenantSlug !== tenantStore.slug
  )

  function resolve(lat: number, lng: number): void {
    const moved =
      !last || Math.abs(last.lat - lat) > SAME_SPOT || Math.abs(last.lng - lng) > SAME_SPOT

    if (!moved) return

    // La résolution est limitée à vingt appels par minute et par utilisateur :
    // un appel par frame de glissement épuiserait le quota en trois secondes,
    // et l'adresse cesserait de s'afficher sans que rien ne l'explique.
    if (debounce) clearTimeout(debounce)

    debounce = setTimeout(async () => {
      last = { lat, lng }
      resolving.value = true

      try {
        const result = await apiFetch<{
          address_label: string | null
          commune_name: string
          tenant: { slug: string } | null
        }>(`/api/tenants/resolve?lat=${lat}&lng=${lng}`)

        address.value = {
          addressLabel: result.address_label,
          communeName: result.commune_name,
          tenantSlug: result.tenant?.slug ?? null,
        }
      } catch {
        // Géocodeurs muets : on n'affiche rien plutôt qu'une adresse fausse.
        // L'enregistrement échouera proprement s'ils le sont encore.
        address.value = null
      } finally {
        resolving.value = false
      }
    }, SETTLE_MS)
  }

  function reset(): void {
    if (debounce) clearTimeout(debounce)
    address.value = null
    last = null
  }

  return { address, resolving, outsideCommune, resolve, reset }
}
