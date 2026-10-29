<script setup lang="ts">
/**
 * La carte de chaleur, reprise de l'export Claude Design
 * (`design/admin-onsignale.screens.html`, troisième planche).
 *
 * Ce que la refonte change, au-delà de l'habillage : la carte occupe enfin la
 * hauteur disponible au lieu d'un cadre de 480 px suivi de trois écrans de
 * défilement. Les chiffres qui la commentent sont passés à sa droite, où ils
 * se lisent *pendant* qu'on la regarde — les faire défiler séparément revenait
 * à demander de mémoriser la carte avant de lire le total.
 */
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/AppIcon.vue'
import FilterSelect from '@/components/admin/FilterSelect.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import CategoryGlyph from '@/components/admin/CategoryGlyph.vue'
import { categoryGlyphMarkup } from '@/lib/categories'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useTenantStore } from '@/stores/tenant'

const { apiFetch } = useApi()
const router = useRouter()

interface HeatmapPoint {
  lat: number
  lng: number
  weight: number
  signal_count: number
  dominant_category: string
  address_approx: string | null
}

interface Hotspot {
  lat: number
  lng: number
  count: number
  dominant_category: string
  address_approx: string | null
}

interface HeatmapStats {
  total_points: number
  hotspots: Hotspot[]
  by_category: Record<string, number>
  by_status: Record<string, number>
}

const selectedPeriod = ref<string | number>('30d')
const selectedCategory = ref<string | number>('all')
const selectedStatus = ref<string | number>('all')
const viewMode = ref<'heatmap' | 'markers'>('heatmap')

const points = ref<HeatmapPoint[]>([])
const stats = ref<HeatmapStats>({ total_points: 0, hotspots: [], by_category: {}, by_status: {} })

const loading = ref(false)
const mapContainer = ref<HTMLDivElement | null>(null)
let map: any = null
let heatLayer: any = null
let markersLayer: any = null
let resizeObserver: ResizeObserver | null = null

const PERIODS = [
  { value: '7d',  label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
  { value: 'all', label: 'Toute la période' },
]

const STATUSES = [
  { value: 'all',            label: 'Tous les statuts' },
  { value: 'en_attente',     label: 'En attente' },
  { value: 'pris_en_charge', label: 'Pris en charge' },
  { value: 'resolu',         label: 'Résolu' },
]

const { categories: tenantCategories, getCategoryLabel } = useTenantCategories()
const tenantStore = useTenantStore()

const categoryOptions = computed(() => [
  { value: 'all', label: 'Toutes catégories' },
  ...tenantCategories.value.map((category) => ({ value: category.slug, label: category.label })),
])

const periodLabel = computed(() => PERIODS.find((entry) => entry.value === selectedPeriod.value)?.label ?? '')
const categoryLabel = computed(
  () => categoryOptions.value.find((entry) => entry.value === selectedCategory.value)?.label ?? ''
)

const topHotspot = computed<Hotspot | null>(() => stats.value.hotspots[0] ?? null)

/** Les catégories présentes sur la carte, la plus signalée d'abord. */
const categoryBreakdown = computed(() => {
  const total = Object.values(stats.value.by_category).reduce((sum, count) => sum + count, 0)
  return Object.entries(stats.value.by_category)
    .map(([slug, count]) => ({
      slug,
      count,
      label: getCategoryLabel(slug),
      share: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count)
})

const dominantCategory = computed(() => categoryBreakdown.value[0] ?? null)

/**
 * L'intensité d'une zone, relative à la plus active.
 *
 * Un seuil absolu ne veut rien dire : neuf signalements sur un carrefour sont
 * un point noir dans une commune de 3 000 habitants, un bruit de fond dans une
 * préfecture. La couleur dit donc « par rapport au pire endroit d'ici ».
 */
function hotspotColor(count: number): string {
  const max = topHotspot.value?.count ?? 1
  const ratio = count / max
  if (ratio >= 0.8) return 'bg-status-danger'
  if (ratio >= 0.5) return 'bg-status-progress-dot'
  if (ratio >= 0.35) return 'bg-status-success'
  return 'bg-brand-700'
}

async function fetchHeatmapData() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      period: String(selectedPeriod.value),
      category: String(selectedCategory.value),
      status: String(selectedStatus.value),
    })

    const data = await apiFetch<{ points: HeatmapPoint[]; stats: HeatmapStats }>(
      `/api/admin/heatmap?${params}`,
      { cache: { maxAge: 15_000 } }
    )

    points.value = data.points
    stats.value = data.stats

    await updateMap()
  } catch (err) {
    console.error('Erreur chargement heatmap:', err)
  } finally {
    loading.value = false
  }
}

async function initMap() {
  if (!mapContainer.value) return

  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  map = L.map(mapContainer.value, {
    center: [tenantStore.mapCenter.lat, tenantStore.mapCenter.lng],
    zoom: tenantStore.mapCenter.zoom,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // La carte vit maintenant dans un conteneur en `flex:1` : sa hauteur n'est
  // connue qu'après la mise en page, et elle rechange à chaque redimensionnement
  // de fenêtre. Sans cela, Leaflet dessine dans un canevas de hauteur nulle.
  await nextTick()
  map.invalidateSize()

  resizeObserver = new ResizeObserver(() => map?.invalidateSize())
  resizeObserver.observe(mapContainer.value)

  await fetchHeatmapData()
}

async function updateMap() {
  if (!map) return

  const L = (window as any).L

  if (viewMode.value === 'heatmap') {
    if (markersLayer) {
      map.removeLayer(markersLayer)
      markersLayer = null
    }

    if (!heatLayer) await import('leaflet.heat')

    const heatData = points.value.map((point) => [point.lat, point.lng, point.weight])

    if (heatLayer) {
      heatLayer.setLatLngs(heatData)
    } else {
      heatLayer = (L as any).heatLayer(heatData, {
        radius: 50,
        blur: 35,
        maxZoom: 17,
        max: 3,
        // Le même dégradé que la légende, dans le même ordre.
        gradient: { 0.0: '#1A56A0', 0.35: '#1D9E75', 0.6: '#EF9F27', 1.0: '#DC2626' },
      })
      heatLayer.addTo(map)
    }
    return
  }

  if (heatLayer) {
    map.removeLayer(heatLayer)
    heatLayer = null
  }
  if (markersLayer) map.removeLayer(markersLayer)

  markersLayer = L.layerGroup()

  points.value.forEach((point) => {
    const icon = L.divIcon({
      html: `<div style="background:#1A56A0;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(15,43,74,.28)">${categoryGlyphMarkup(point.dominant_category, { size: 16, label: getCategoryLabel(point.dominant_category) })}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    const marker = L.marker([point.lat, point.lng], { icon })
    marker.bindPopup(`
      <div style="font:500 13px/1.4 'Instrument Sans',system-ui">
        <div style="font-weight:600">${point.address_approx || 'Zone'}</div>
        <div style="color:#6B7280">${point.signal_count} signalement${point.signal_count > 1 ? 's' : ''}</div>
        <div style="color:#9CA3AF;font-size:12px">${getCategoryLabel(point.dominant_category)}</div>
      </div>
    `)
    markersLayer.addLayer(marker)
  })

  markersLayer.addTo(map)
}

function zoomToHotspot(hotspot: Hotspot) {
  if (!map) return
  map.setView([hotspot.lat, hotspot.lng], 16)

  const L = (window as any).L
  L.popup()
    .setLatLng([hotspot.lat, hotspot.lng])
    .setContent(`
      <div style="font:500 13px/1.4 'Instrument Sans',system-ui">
        <div style="font-weight:600">${hotspot.address_approx || 'Zone'}</div>
        <div style="color:#6B7280">${hotspot.count} signalement${hotspot.count > 1 ? 's' : ''}</div>
      </div>
    `)
    .openOn(map)
}

/** La liste des signalements, cadrée sur ce que la carte montre. */
function openFilteredList() {
  void router.push('/admin/signalements')
}

async function exportPDF() {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const mapEl = mapContainer.value
    if (!mapEl) return

    const canvas = await html2canvas(mapEl, { useCORS: true, allowTaint: true })
    const pdf = new jsPDF('landscape', 'mm', 'a4')

    pdf.setFontSize(16)
    pdf.text(`OnSignale — Carte de chaleur — ${tenantStore.name}`, 14, 15)

    pdf.setFontSize(10)
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22)
    pdf.text(`Période : ${periodLabel.value} | Catégorie : ${categoryLabel.value}`, 14, 28)

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 14, 35, 268, 120)

    pdf.setFontSize(12)
    pdf.text('Statistiques', 14, 165)

    pdf.setFontSize(10)
    let y = 172
    pdf.text(`Signalements géolocalisés : ${stats.value.total_points}`, 14, y)

    y += 10
    pdf.text('Par catégorie :', 14, y)
    y += 6
    for (const entry of categoryBreakdown.value) {
      pdf.text(`  • ${entry.label} : ${entry.count}`, 14, y)
      y += 5
    }

    y += 5
    pdf.text('Zones les plus signalées :', 14, y)
    y += 6
    stats.value.hotspots.forEach((hotspot, index) => {
      pdf.text(`${index + 1}. ${hotspot.address_approx || 'Zone inconnue'} — ${hotspot.count} signalements`, 14, y)
      y += 5
    })

    pdf.save(`carte-chaleur-${tenantStore.slug}-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF:', err)
  }
}

watch([selectedPeriod, selectedCategory, selectedStatus], () => void fetchHeatmapData())
watch(viewMode, () => void updateMap())

onMounted(() => void initMap())

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">

    <AdminPageHeader>
      <template #actions>
        <FilterSelect v-model="selectedPeriod" :options="PERIODS" icon="Calendar" menu-width="180px" />
        <FilterSelect v-model="selectedCategory" :options="categoryOptions" icon="Tag" menu-width="220px" />
        <FilterSelect v-model="selectedStatus" :options="STATUSES" icon="Activity" menu-width="170px" />
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          @click="exportPDF"
        >
          <AppIcon name="FileDown" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Exporter PDF</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 py-[22px] xl:flex-row xl:overflow-hidden">

      <!-- ─── Colonne carte ───────────────────────────────────────────────── -->
      <div class="flex min-w-0 flex-1 flex-col gap-3.5">

        <div class="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-white">
          <div class="flex h-14 flex-none items-center gap-2.5 whitespace-nowrap border-b border-line px-[18px]">
            <div class="text-[15px] font-semibold leading-none text-brand-900">Visualisation</div>
            <div class="ml-auto flex flex-none rounded-[10px] bg-status-pending-bg p-[3px]">
              <button
                class="flex h-[30px] flex-none items-center gap-[7px] rounded-lg px-3 text-xs font-semibold leading-none transition-colors"
                :class="viewMode === 'heatmap'
                  ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,43,74,.10)]'
                  : 'text-muted hover:text-ink'"
                @click="viewMode = 'heatmap'"
              >
                <AppIcon
                  name="Flame" :size="14" :stroke-width="viewMode === 'heatmap' ? 2 : 1.75"
                  :class="viewMode === 'heatmap' ? 'text-status-progress-dot' : ''"
                />
                Densité
              </button>
              <button
                class="flex h-[30px] flex-none items-center gap-[7px] rounded-lg px-3 text-xs font-semibold leading-none transition-colors"
                :class="viewMode === 'markers'
                  ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,43,74,.10)]'
                  : 'text-muted hover:text-ink'"
                @click="viewMode = 'markers'"
              >
                <AppIcon name="MapPin" :size="14" :stroke-width="viewMode === 'markers' ? 2 : 1.75" />
                Épingles
              </button>
            </div>
          </div>

          <!-- `isolate` : Leaflet monte ses calques jusqu'à `z-index: 700`, qui
               sans contexte d'empilement propre passent au-dessus des menus de
               la barre d'en-tête et les coupent en deux. -->
          <div class="relative isolate min-h-0 flex-1">
            <div ref="mapContainer" class="absolute inset-0" />

            <div
              v-if="loading"
              class="absolute inset-0 z-[500] flex items-center justify-center bg-white/70"
            >
              <div class="flex items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 py-2.5 shadow-sm">
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-brand-100 border-t-brand-700" />
                <span class="text-[13px] font-medium text-muted">Mise à jour…</span>
              </div>
            </div>

            <!-- La légende par-dessus la carte, pas sous elle : elle sert à lire
                 les couleurs qu'on a sous les yeux. -->
            <div
              class="pointer-events-none absolute bottom-3.5 left-4 z-[400] flex items-center gap-3.5 whitespace-nowrap rounded-[10px] border border-line bg-white/[0.94] px-3 py-[9px]"
            >
              <div class="flex items-center gap-1.5 text-xs font-semibold leading-none text-ink">
                <span class="h-2.5 w-2.5 rounded-full bg-brand-700" />Peu actif
              </div>
              <div class="flex items-center gap-1.5 text-xs font-semibold leading-none text-ink">
                <span class="h-2.5 w-2.5 rounded-full bg-status-success" />Modéré
              </div>
              <div class="flex items-center gap-1.5 text-xs font-semibold leading-none text-ink">
                <span class="h-2.5 w-2.5 rounded-full bg-status-progress-dot" />Actif
              </div>
              <div class="flex items-center gap-1.5 text-xs font-semibold leading-none text-ink">
                <span class="h-2.5 w-2.5 rounded-full bg-status-danger" />Critique
              </div>
            </div>
          </div>
        </div>

        <!-- Zones les plus signalées -->
        <div class="flex flex-none flex-col overflow-hidden rounded-[14px] border border-line bg-white">
          <div class="flex h-[52px] flex-none items-center gap-2.5 whitespace-nowrap border-b border-line px-[18px]">
            <div class="text-[15px] font-semibold leading-none text-brand-900">Zones les plus signalées</div>
            <button
              class="ml-auto flex-none text-xs font-semibold leading-none text-brand-700 hover:underline"
              @click="openFilteredList"
            >
              Voir toutes les zones
            </button>
          </div>

          <div
            v-if="stats.hotspots.length === 0"
            class="flex h-16 items-center justify-center text-[13px] text-muted"
          >
            Aucune zone ne ressort sur cette période.
          </div>

          <button
            v-for="(hotspot, index) in stats.hotspots"
            :key="`${hotspot.lat}-${hotspot.lng}`"
            class="flex h-16 flex-none items-center gap-3.5 border-b border-hairline px-[18px] text-left transition-colors last:border-b-0 hover:bg-canvas"
            @click="zoomToHotspot(hotspot)"
          >
            <div class="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-brand-50 text-[13px] font-bold leading-none tabular-nums text-brand-700">
              {{ index + 1 }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold leading-[1.3] text-ink">
                {{ hotspot.address_approx || 'Zone sans adresse' }}
              </div>
              <div class="truncate text-xs leading-[1.3] text-muted">{{ tenantStore.name }}</div>
            </div>

            <div class="hidden flex-none items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2.5 py-[5px] text-xs font-semibold leading-none text-ink sm:inline-flex">
              {{ getCategoryLabel(hotspot.dominant_category) }}
            </div>

            <div class="flex w-[112px] flex-none items-center justify-end gap-[7px]">
              <span class="h-2 w-2 rounded-full" :class="hotspotColor(hotspot.count)" />
              <span class="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-ink">
                {{ hotspot.count }} signalement{{ hotspot.count > 1 ? 's' : '' }}
              </span>
            </div>

            <AppIcon name="ChevronRight" :size="18" :stroke-width="1.75" class="flex-none text-faint" />
          </button>
        </div>
      </div>

      <!-- ─── Colonne chiffres ────────────────────────────────────────────── -->
      <div class="flex flex-none flex-col gap-3.5 xl:w-[316px]">

        <div class="flex flex-col gap-4 rounded-[14px] bg-brand-900 p-[18px]">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">SUR LA PÉRIODE</span>
            <AppIcon name="Flame" :size="16" :stroke-width="1.75" class="text-brand-500" />
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[40px] font-bold leading-none tracking-[-0.02em] tabular-nums text-white">
              {{ stats.total_points }}
            </span>
            <span class="text-[13px] font-medium leading-[1.3] text-brand-100">
              signalements<br>géolocalisés
            </span>
          </div>
          <div class="h-px bg-white/[0.12]" />
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <span class="whitespace-nowrap text-[13px] font-medium leading-none text-brand-100">En attente</span>
              <span class="text-[13px] font-semibold leading-none tabular-nums text-white">
                {{ stats.by_status.en_attente ?? 0 }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="whitespace-nowrap text-[13px] font-medium leading-none text-brand-100">Pris en charge</span>
              <span class="text-[13px] font-semibold leading-none tabular-nums text-white">
                {{ stats.by_status.pris_en_charge ?? 0 }}
              </span>
            </div>
            <!-- La maquette affichait ici un « rayon d'analyse » : le
                 regroupement des points se fait à la 4ᵉ décimale de degré, pas
                 sur un rayon réglable. Un chiffre inventé vaut moins qu'un
                 chiffre vrai. -->
            <div class="flex items-center justify-between gap-3">
              <span class="whitespace-nowrap text-[13px] font-medium leading-none text-brand-100">Résolus</span>
              <span class="text-[13px] font-semibold leading-none tabular-nums text-white">
                {{ stats.by_status.resolu ?? 0 }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3.5 rounded-[14px] border border-line bg-white p-[18px]">
          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">ZONE LA PLUS ACTIVE</div>
          <div class="flex items-start gap-3">
            <div class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-status-danger-bg">
              <AppIcon name="MapPin" :size="19" :stroke-width="1.75" class="text-status-danger" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-semibold leading-[1.3] text-ink">
                {{ topHotspot?.address_approx || 'Aucune zone' }}
              </div>
              <div class="truncate text-[13px] leading-[1.3] tabular-nums text-muted">
                {{ topHotspot ? `${topHotspot.count} signalements · ${tenantStore.name}` : 'sur cette période' }}
              </div>
            </div>
          </div>

          <div class="h-px bg-line" />

          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">CATÉGORIE DOMINANTE</div>
          <div class="flex items-start gap-3">
            <CategoryGlyph :category="dominantCategory?.slug ?? 'autre'" :label="dominantCategory?.label" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-semibold leading-[1.3] text-ink">
                {{ dominantCategory?.label || '—' }}
              </div>
              <div class="truncate text-[13px] leading-[1.3] tabular-nums text-muted">
                {{ dominantCategory ? `${dominantCategory.count} signalements · ${dominantCategory.share} %` : 'aucune donnée' }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4 rounded-[14px] border border-line bg-white p-[18px]">
          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">RÉPARTITION PAR CATÉGORIE</div>

          <div class="flex flex-col gap-3.5">
            <div v-for="entry in categoryBreakdown" :key="entry.slug" class="flex flex-col gap-[7px]">
              <div class="flex items-baseline justify-between gap-2.5">
                <span class="truncate text-[13px] font-medium leading-none text-ink">{{ entry.label }}</span>
                <span class="flex-none text-xs font-semibold leading-none tabular-nums text-muted">{{ entry.count }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-[3px] bg-status-pending-bg">
                <div class="h-1.5 rounded-[3px] bg-brand-700" :style="{ width: `${entry.share}%` }" />
              </div>
            </div>

            <p v-if="categoryBreakdown.length === 0" class="text-[13px] text-muted">
              Aucun signalement géolocalisé sur cette période.
            </p>
          </div>

          <button
            class="mt-auto flex h-10 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-line text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            @click="openFilteredList"
          >
            <AppIcon name="Inbox" :size="16" :stroke-width="1.75" />
            Ouvrir la liste filtrée
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
