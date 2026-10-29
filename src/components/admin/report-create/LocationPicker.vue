<script setup lang="ts">
/**
 * Où est le problème.
 *
 * Une carte dédiée plutôt qu'un mode ajouté à `MapView.vue` : celui-ci fait
 * déjà 483 lignes, charge tous les marqueurs de la commune et ouvre des
 * fiches au clic — exactement ce qu'il ne faut pas ici, où un clic doit poser
 * une épingle.
 *
 * Deux gestes, parce que l'agent ne sait pas toujours la même chose : il tape
 * l'adresse qu'on lui a dictée au téléphone, ou il place l'épingle là où il
 * sait que c'est, quand l'endroit n'a pas d'adresse — un chemin, un parc, un
 * carrefour.
 *
 * Le libellé d'adresse affiché ici n'est qu'une aide à viser : c'est le serveur
 * qui, à l'enregistrement, redemande l'adresse à la BAN pour les coordonnées
 * finales et impose la sienne. Deux sources d'adresse pour une même ligne
 * finiraient par se contredire.
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AppIcon from '@/components/AppIcon.vue'
import { searchAddress, type AddressSuggestion } from '@/lib/ban'
import { usePinAddress } from '@/composables/usePinAddress'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps<{ position: { lat: number; lng: number } | null }>()
const emit = defineEmits<{
  (e: 'update:position', value: { lat: number; lng: number }): void
  /**
   * Le point est hors de la commune.
   *
   * Remonté au formulaire pour qu'il retire le bouton d'enregistrement : dire
   * « ce sera refusé » puis laisser cliquer, c'est faire faire à l'agent un
   * aller-retour dont on connaît déjà l'issue.
   */
  (e: 'update:outside', value: boolean): void
}>()

const tenantStore = useTenantStore()
const { address, resolving, outsideCommune, resolve } = usePinAddress()

const container = ref<HTMLElement | null>(null)
const query = ref('')
const suggestions = ref<AddressSuggestion[]>([])
const searching = ref(false)

let map: L.Map | null = null
let marker: L.Marker | null = null
let debounce: ReturnType<typeof setTimeout> | null = null

const pin = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#1A56A0;
    transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function place(lat: number, lng: number) {
  if (!map) return

  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng], { icon: pin, draggable: true }).addTo(map)
    // Déplaçable : corriger de trois mètres ne doit pas demander de viser à
    // nouveau au clic.
    marker.on('dragend', () => {
      const { lat: dragLat, lng: dragLng } = marker!.getLatLng()
      emit('update:position', { lat: dragLat, lng: dragLng })
    })
  }

  emit('update:position', { lat, lng })
  resolve(lat, lng)
}

onMounted(() => {
  if (!container.value) return

  const center = props.position ?? tenantStore.mapCenter

  map = L.map(container.value, { attributionControl: false }).setView(
    [center.lat, center.lng],
    props.position ? 18 : tenantStore.mapCenter.zoom
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  map.on('click', (event: L.LeafletMouseEvent) => place(event.latlng.lat, event.latlng.lng))

  if (props.position) place(props.position.lat, props.position.lng)
})

onUnmounted(() => {
  if (debounce) clearTimeout(debounce)
  map?.remove()
  map = null
})

watch(query, (value) => {
  if (debounce) clearTimeout(debounce)

  if (value.trim().length < 3) {
    suggestions.value = []
    return
  }

  // Une frappe ne déclenche pas une requête : 300 ms après la dernière, une
  // seule. La BAN est un service public gratuit, on n'en fait pas un robinet.
  debounce = setTimeout(async () => {
    searching.value = true
    suggestions.value = await searchAddress(value, tenantStore.mapCenter)
    searching.value = false
  }, 300)
})

watch(outsideCommune, (value) => emit('update:outside', value))

function choose(suggestion: AddressSuggestion) {
  query.value = suggestion.label
  suggestions.value = []
  map?.setView([suggestion.lat, suggestion.lng], 18)
  place(suggestion.lat, suggestion.lng)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="relative">
      <div class="flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-white px-3">
        <AppIcon :name="searching ? 'Loader' : 'Search'" :size="15"
          :class="['text-muted', searching ? 'animate-spin' : '']" />
        <input
          v-model="query"
          type="text"
          placeholder="Rechercher une adresse…"
          class="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
        />
      </div>

      <ul
        v-if="suggestions.length > 0"
        class="absolute inset-x-0 top-[42px] z-[1000] overflow-hidden rounded-[10px] border border-line bg-white shadow-ds-md"
      >
        <li v-for="suggestion in suggestions" :key="suggestion.label">
          <button
            type="button"
            class="w-full px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-canvas"
            @click="choose(suggestion)"
          >
            {{ suggestion.label }}
          </button>
        </li>
      </ul>
    </div>

    <div ref="container" class="h-[260px] w-full overflow-hidden rounded-[10px] border border-line" />

    <!-- L'adresse du point, pas une consigne : une fois l'épingle posée, ce
         que l'agent veut lire c'est la rue sur laquelle il vient de cliquer. -->
    <p v-if="!position" class="text-[11px] leading-[1.5] text-muted">
      Cliquez sur la carte pour placer le signalement, ou cherchez une adresse.
    </p>

    <div
      v-else-if="outsideCommune"
      class="flex items-start gap-2 rounded-[10px] bg-status-danger-bg px-3 py-2.5"
    >
      <AppIcon name="TriangleAlert" :size="14" :stroke-width="2" class="mt-px flex-none text-status-danger" />
      <p class="text-[11px] leading-[1.5] text-status-danger">
        <span class="font-semibold">Ce point est à {{ address?.communeName }}.</span>
        Il est hors du territoire de votre commune : l’enregistrement sera refusé.
      </p>
    </div>

    <div v-else class="flex items-start gap-2">
      <AppIcon
        :name="resolving ? 'Loader' : 'MapPin'"
        :size="14"
        :stroke-width="1.75"
        :class="['mt-px flex-none text-muted', resolving ? 'animate-spin' : '']"
      />
      <p class="min-w-0 text-[11px] leading-[1.5] text-muted">
        <template v-if="resolving">Recherche de l’adresse…</template>
        <template v-else-if="address?.addressLabel">
          <span class="font-medium text-ink">{{ address.addressLabel }}</span>
          — faites glisser l’épingle pour ajuster.
        </template>
        <template v-else-if="address">
          {{ address.communeName }} — aucune adresse précise à cet endroit.
        </template>
        <template v-else>Épingle posée. Faites-la glisser pour ajuster.</template>
      </p>
    </div>
  </div>
</template>
