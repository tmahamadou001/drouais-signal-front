<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useReportStore } from '@/stores/report'
import { useApi } from '@/composables/useApi'
import { useTenantStore } from '@/stores/tenant'
import { useTenantCategories } from '@/composables/useTenantCategories'
import DuplicateWarning from '@/components/DuplicateWarning.vue'

const tenantStore = useTenantStore()
const { getCategoryIcon, getCategoryLabel } = useTenantCategories()
const cityName = computed(() => tenantStore.config?.city_name ?? tenantStore.name)

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const isOutOfBounds = computed(() => {
  if (lat.value === null || lng.value === null) return false
  const centerLat = tenantStore.config?.map_lat
  const centerLng = tenantStore.config?.map_lng
  const radius = tenantStore.config?.map_radius_km ?? 15
  if (!centerLat || !centerLng) return false
  return haversineKm(centerLat, centerLng, lat.value, lng.value) > radius
})

const props = defineProps<{
  isAnonymous?: boolean
  anonymousEmail?: string
}>()

const emit = defineEmits<{
  submitted: [id: string, anonymousToken?: string]
  back: []
}>()

const store = useReportStore()
const { apiFetch, invalidateCachePattern } = useApi()

// États de géolocalisation
type GpsState = 'consent' | 'loading' | 'located' | 'manual'
const gpsState = ref<GpsState>('consent')

type GpsError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED'
  | null

// Position et adresse
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const accuracy = ref<number | null>(null)
const addressApprox = ref('')
const gpsError = ref<GpsError>(null)

const geocodeCache = new Map<string, string>()

// Recherche d'adresse
const searchQuery = ref('')
const searchResults = ref<any[]>([])
let searchTimeout: ReturnType<typeof setTimeout>

let searchAbortController: AbortController | null = null

// Carte Leaflet
let map: any = null
let marker: any = null
const mapContainer = ref<HTMLDivElement | null>(null)

// Soumission
const submitting = ref(false)
const error = ref<string | null>(null)

// Vérification des doublons
const checkingDuplicates = ref(false)
const duplicates = ref<any[]>([])
const showDuplicateWarning = ref(false)
const duplicateCheckDone = ref(false)

// Démarrer le GPS après consentement
async function startGPS() {
  gpsState.value = 'loading'
  gpsError.value = null

  if (!navigator.geolocation) {
    gpsState.value = 'manual'
    gpsError.value = 'NOT_SUPPORTED'
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      lat.value = position.coords.latitude
      lng.value = position.coords.longitude
      accuracy.value = position.coords.accuracy
      gpsState.value = 'located'
      reverseGeocode(lat.value, lng.value)
    },
    (err) => {
      console.error('Erreur GPS:', err.code, err.message)
      gpsState.value = 'manual'

      switch (err.code) {
        case 1: // PERMISSION_DENIED
          gpsError.value = 'PERMISSION_DENIED'
          break
        case 2: // POSITION_UNAVAILABLE
          gpsError.value = 'POSITION_UNAVAILABLE'
          break
        case 3: // TIMEOUT
          gpsError.value = 'TIMEOUT'
          break
        default:
          gpsError.value = 'POSITION_UNAVAILABLE'
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  )
}

// Passer en mode manuel
function goToManual() {
  gpsState.value = 'manual'
  gpsError.value = null
}

// Reprise automatique GPS quand l'utilisateur revient
function handleVisibilityChange() {
  if (
    document.visibilityState === 'visible' &&
    gpsError.value === 'PERMISSION_DENIED'
  ) {
    startGPS()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearTimeout(searchTimeout)
  searchAbortController?.abort()
  geocodeCache.clear()
})

function formatAddressResult(address: any): string {
  const parts = [
    address.house_number && address.road 
      ? `${address.house_number} ${address.road}` 
      : address.road,
    address.postcode,
    address.city || address.town || address.village,
  ].filter(Boolean)

  return parts.join(', ')
}

async function reverseGeocode(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
  
  if (geocodeCache.has(cacheKey)) {
    addressApprox.value = geocodeCache.get(cacheKey)!
    return
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', latitude.toString())
    url.searchParams.set('lon', longitude.toString())
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'OnSignale/1.0',
      },
    })

    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    if (!data.address) {
      addressApprox.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      return
    }

    const formattedAddress = formatAddressResult(data.address)
    
    const trimmedAddress = formattedAddress.length > 80 
      ? formattedAddress.substring(0, 77) + '...' 
      : formattedAddress

    geocodeCache.set(cacheKey, trimmedAddress)
    addressApprox.value = trimmedAddress

  } catch (err) {
    console.error('Erreur reverse geocoding:', err)
    addressApprox.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  }
}

const searchAddress = (query: string) => {
  if (query.length < 3) {
    searchResults.value = []
    return
  }

  clearTimeout(searchTimeout)
  searchAbortController?.abort()
  
  searchTimeout = setTimeout(async () => {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      
      url.searchParams.set('q', query)
      url.searchParams.set('format', 'json')
      url.searchParams.set('limit', '5')
      url.searchParams.set('countrycodes', 'fr')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('zoom', '18')

      searchAbortController = new AbortController()
      const timeoutId = setTimeout(() => searchAbortController?.abort(), 5000)

      const res = await fetch(url.toString(), {
        signal: searchAbortController.signal,
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'OnSignale/1.0',
        },
      })

      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const results = await res.json()

      searchResults.value = results.map((r: any) => ({
        ...r,
        displayName: formatAddressResult(r.address),
      }))

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Recherche annulée')
        return
      }
      console.error('Erreur recherche adresse:', err)
      searchResults.value = []
    }
  }, 500)
}

function selectAddress(result: any) {
  lat.value = parseFloat(result.lat)
  lng.value = parseFloat(result.lon)
  addressApprox.value = result.displayName || result.display_name
  searchResults.value = []
  searchQuery.value = result.displayName || result.display_name
  gpsState.value = 'located'
}

// Initialiser la carte Leaflet
async function initMap(latitude: number, longitude: number) {
  if (!mapContainer.value) return

  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  if (map) {
    map.remove()
  }

  map = L.map(mapContainer.value, {
    center: [latitude, longitude],
    zoom: 17,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  }).addTo(map)

  // Marker draggable
  marker = L.marker([latitude, longitude], {
    draggable: true,
    icon: L.divIcon({
      className: 'custom-marker',
      html: '<div style="font-size: 32px;">📍</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
  }).addTo(map)

  marker.on('dragend', (event: any) => {
    const position = event.target.getLatLng()
    lat.value = position.lat
    lng.value = position.lng
    duplicateCheckDone.value = false
    reverseGeocode(position.lat, position.lng)
    if (!isOutOfBounds.value) checkForDuplicates()
  })
}

// Watcher pour initialiser la carte quand l'état passe à 'located'
watch(gpsState, (newState) => {
  if (newState === 'located' && lat.value !== null && lng.value !== null) {
    nextTick(() => {
      initMap(lat.value!, lng.value!)
      checkForDuplicates()
    })
  }
})

// Watcher pour réinitialiser duplicateCheckDone quand on change de mode manuel
watch(gpsState, (newState) => {
  if (newState === 'manual') {
    duplicateCheckDone.value = false
  }
})

// Vérifier les doublons
async function checkForDuplicates() {
  if (!lat.value || !lng.value || !store.category) return

  checkingDuplicates.value = true
  duplicates.value = []
  showDuplicateWarning.value = false

  try {
    const result = await apiFetch<{ duplicates_found: boolean; reports: any[] }>(
      '/api/reports/check-duplicate',
      {
        method: 'POST',
        body: {
          lat: lat.value,
          lng: lng.value,
          category: store.category,
        },
      }
    )

    if (result.duplicates_found && result.reports.length > 0) {
      duplicates.value = result.reports
      showDuplicateWarning.value = true
    }

    duplicateCheckDone.value = true
  } catch (err: any) {
    console.error('Erreur vérification doublons:', err)
  } finally {
    checkingDuplicates.value = false
  }
}

function handleContinueAnyway() {
  showDuplicateWarning.value = false
}

function handleVoted(reportId: string) {
  console.log('Vote enregistré pour:', reportId)
}

// Soumission du signalement
async function handleSubmit() {
  if (!lat.value || !lng.value || !store.category || !store.title?.trim() || !store.photoFile) {
    return
  }

  submitting.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('title', store.title?.trim())
    formData.append('category', store.category)
    formData.append('lat', lat.value.toString())
    formData.append('lng', lng.value.toString())

    if (store.description?.trim()) {
      formData.append('description', store.description.trim())
    }
    if (addressApprox.value?.trim()) {
      formData.append('address_approx', addressApprox.value.trim())
    }
    if (store.photoFile) {
      formData.append('photo', store.photoFile)
    }
    if (store.aiResult) {
      formData.append('ai_assisted', 'true')
    }
    if (props.isAnonymous && props.anonymousEmail) {
      formData.append('anonymous_email', props.anonymousEmail)
    }

    let apiKey: string | undefined
    if (props.isAnonymous) {
      apiKey = tenantStore.config?.api_key
    }

    const response = await apiFetch<{ id: string; anonymous_token?: string }>('/api/reports', {
      method: 'POST',
      body: formData,
      isFormData: true,
      apiKey,
    })

    invalidateCachePattern(/^\/api\/map\/markers/)
    invalidateCachePattern(/^\/api\/reports/)

    emit('submitted', response.id, response.anonymous_token)
  } catch (err: any) {
    error.value = err.message || 'Une erreur est survenue lors de l\'envoi.'
  } finally {
    submitting.value = false
  }
}

const canSubmit = computed(() => {
  return lat.value !== null && lng.value !== null && store.category && store.title?.trim() && !submitting.value && !isOutOfBounds.value
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-6 pt-4 pb-6">
    <div class="w-full max-w-2xl mx-auto space-y-4">
      <!-- Back Button -->
      <button
        @click="emit('back')"
        class="flex items-center gap-2 text-primary font-medium hover:underline"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour</span>
      </button>

      <!-- Summary Card -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-neutral-600 mb-3">Résumé du signalement</h3>
        <div class="flex items-start gap-4">
          <div
            v-if="store.photoPreviewUrl"
            class="w-16 h-16 rounded-ds-lg overflow-hidden flex-shrink-0 shadow-sm"
          >
            <img :src="store.photoPreviewUrl" class="w-full h-full object-cover" alt="Photo" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">{{ getCategoryIcon(store.category) }}</span>
              <span class="text-xs font-semibold text-neutral-500 uppercase">
                {{ getCategoryLabel(store.category) }}
              </span>
            </div>
            <p class="font-semibold text-dark truncate">{{ store.title }}</p>
            <p v-if="store.description" class="text-sm text-neutral-500 line-clamp-2 mt-1">
              {{ store.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- ÉTAT 0: Consentement GPS -->
      <div v-if="gpsState === 'consent'" class="space-y-6">
        <div class="bg-white rounded-ds-2xl border-2 border-neutral-200 p-8 text-center space-y-6">
          <div class="text-6xl">📍</div>
          <div class="space-y-3">
            <h2 class="text-2xl font-bold text-dark">Où se trouve ce problème ?</h2>
            <p class="text-neutral-600 leading-relaxed">
              Votre position permet aux agents de localiser et d'intervenir rapidement.
            </p>
          </div>
        </div>

        <button
          @click="startGPS"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-ds-lg font-semibold hover:bg-primary-600 active:scale-98 transition-all shadow-lg shadow-primary/20"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Utiliser ma position GPS</span>
        </button>

        <button
          @click="goToManual"
          class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-dark border-2 border-neutral-200 rounded-ds-lg font-semibold hover:border-primary hover:bg-primary-50/30 active:scale-98 transition-all"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Saisir l'adresse manuellement</span>
        </button>
      </div>

      <!-- ÉTAT 1: GPS en cours -->
      <div v-else-if="gpsState === 'loading'" class="space-y-6">
        <div class="bg-white rounded-ds-2xl border border-neutral-200 p-8 text-center space-y-6">
          <div class="flex justify-center">
            <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div class="space-y-3">
            <h2 class="text-xl font-bold text-dark">Localisation en cours...</h2>
            <p class="text-sm text-neutral-600">
              Assurez-vous que le GPS est activé sur votre téléphone
            </p>
          </div>
        </div>
        <button
          @click="goToManual"
          class="w-full text-center text-sm text-primary hover:underline"
        >
          Saisir l'adresse manuellement →
        </button>
      </div>

      <!-- ÉTAT 3: Recherche manuelle -->
      <div v-else-if="gpsState === 'manual'" class="space-y-4">
        <!-- Erreur PERMISSION_DENIED : message avec instructions -->
        <div
          v-if="gpsError === 'PERMISSION_DENIED'"
          class="p-4 bg-orange-50 border border-orange-200 rounded-ds-lg space-y-3"
        >
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0
                       2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694
                       -1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div class="flex-1">
              <p class="font-semibold text-orange-900 text-sm">
                Localisation non autorisée
              </p>
              <p class="text-sm text-orange-800 mt-1">
                Activez la localisation dans vos réglages puis
                revenez ici — la détection reprendra automatiquement.
              </p>
            </div>
          </div>

          <!-- Instructions selon la plateforme -->
          <div class="bg-white rounded-lg border border-orange-200 p-3
                      space-y-2 text-xs text-orange-900">
            <div>
              <p class="font-semibold mb-0.5">Sur iPhone :</p>
              <p class="text-orange-800">
                Réglages → Chrome (ou Safari)
                → Localisation → "Lors de l'utilisation"
              </p>
            </div>
            <div class="border-t border-orange-100 pt-2">
              <p class="font-semibold mb-0.5">Sur Android :</p>
              <p class="text-orange-800">
                Réglages → Applications → Chrome
                → Autorisations → Localisation → Activer
              </p>
            </div>
          </div>

          <!-- Bouton Réessayer -->
          <button
            @click="startGPS"
            class="w-full flex items-center justify-center gap-2
                   py-3 px-4 bg-orange-600 hover:bg-orange-700
                   text-white rounded-ds-lg text-sm font-semibold
                   transition-colors active:scale-98"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0
                       004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003
                       8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Réessayer la localisation</span>
          </button>
        </div>

        <!-- Autres erreurs GPS (non PERMISSION_DENIED) -->
        <div
          v-else-if="gpsError && gpsError !== 'PERMISSION_DENIED' as any"
          class="flex items-start gap-3 p-4 bg-orange-50
                 border border-orange-200 rounded-ds-lg"
        >
          <svg class="w-5 h-5 text-orange-600 flex-shrink-0"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0
                     2.502-1.667 1.732-3L13.732 4c-.77-1.333
                     -2.694-1.333-3.464 0L3.34 16c-.77 1.333.192
                     3 1.732 3z"/>
          </svg>
          <p class="text-sm text-orange-900">
            <span v-if="gpsError === 'TIMEOUT'">
              Délai dépassé — saisissez l'adresse manuellement
            </span>
            <span v-else-if="gpsError === 'POSITION_UNAVAILABLE'">
              Position indisponible — saisissez l'adresse manuellement
            </span>
            <span v-else>
              GPS non disponible sur cet appareil
            </span>
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-dark mb-2">Rechercher une adresse</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="searchAddress(searchQuery)"
              type="text"
              :placeholder="`Ex: 12 rue du Centre, ${cityName}`"
              class="w-full px-4 py-3 pl-11 rounded-ds-lg border-2 border-neutral-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <svg class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div v-if="searchResults.length > 0" class="bg-white rounded-ds-lg border border-neutral-200 divide-y divide-neutral-100 shadow-md">
          <button
            v-for="result in searchResults"
            :key="result.place_id"
            @click="selectAddress(result)"
            class="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
          >
            <!-- ✅ Utiliser displayName (adresse courte formatée) -->
            <p class="text-sm font-medium text-dark">{{ result.displayName || result.display_name }}</p>
          </button>
        </div>
      </div>

      <!-- ÉTAT 2: Carte avec position -->
      <div v-else-if="gpsState === 'located'" class="space-y-4">
        <div class="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-ds-lg">
          <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-green-900">📍 Position détectée</p>
            <p class="text-sm text-green-700 mt-1">{{ addressApprox || 'Adresse en cours de récupération...' }}</p>
            <p v-if="accuracy" class="text-xs text-green-600 mt-1">Précision : ~{{ Math.round(accuracy) }} mètres</p>
          </div>
        </div>

        <div ref="mapContainer" class="w-full h-96 rounded-ds-xl overflow-hidden shadow-md border border-neutral-200" />

        <!-- Vérification des doublons en cours -->
        <div v-if="checkingDuplicates" class="flex items-center gap-2 text-sm text-neutral-600 p-3 bg-neutral-50 rounded-ds-lg">
          <span class="inline-block w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
          <span>Vérification des signalements existants...</span>
        </div>

        <!-- Avertissement de doublons -->
        <DuplicateWarning
          v-if="showDuplicateWarning && duplicates.length > 0"
          :duplicates="duplicates"
          @continue="handleContinueAnyway"
          @voted="handleVoted"
        />

        <!-- Erreur hors périmètre -->
        <div
          v-if="isOutOfBounds"
          class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-ds-lg"
        >
          <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <p class="font-semibold text-red-900">Position hors périmètre</p>
            <p class="text-sm text-red-700 mt-1">
              Ce point est en dehors de la zone couverte par {{ cityName }}.
              Déplacez le marker 📍 à l'intérieur de la ville pour continuer.
            </p>
          </div>
        </div>

        <div v-else class="bg-blue-50 border border-blue-200 rounded-ds-lg p-4">
          <p class="text-sm text-blue-900">
            💡 <strong>Conseil :</strong> Déplacez le marker 📍 pour ajuster précisément la position
          </p>
        </div>

        <button
          @click="goToManual"
          class="text-center text-sm text-primary hover:underline"
        >
          Modifier l'adresse →
        </button>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-ds-lg"
      >
        <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <p class="font-semibold text-red-900">Erreur</p>
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <!-- Submit Button -->
      <div v-if="gpsState === 'located' && !showDuplicateWarning" class="space-y-2">
        <button
          @click="handleSubmit"
          :disabled="!canSubmit"
          class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-ds-lg font-semibold transition-all"
          :class="
            canSubmit
              ? 'bg-primary text-white hover:bg-primary-600 active:scale-98 shadow-lg shadow-primary/20'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          "
        >
          <svg
            v-if="submitting"
            class="w-5 h-5 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ submitting ? 'Envoi en cours...' : 'Envoyer le signalement' }}</span>
        </button>
        <p v-if="!canSubmit" class="text-xs text-center text-neutral-500">
          Définissez une position sur la carte pour continuer
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active\:scale-98:active {
  transform: scale(0.98);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>