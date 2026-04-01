<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/AppIcon.vue'
import { CATEGORY_CONFIG } from '@/types'

const { apiFetch } = useApi()

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

const selectedPeriod = ref('30d')
const selectedCategory = ref('all')
const selectedStatus = ref('all')
const viewMode = ref<'heatmap' | 'markers'>('heatmap')

const points = ref<HeatmapPoint[]>([])
const stats = ref<HeatmapStats>({
  total_points: 0,
  hotspots: [],
  by_category: {},
  by_status: {}
})

const loading = ref(false)
const mapContainer = ref<HTMLDivElement | null>(null)
let map: any = null
let heatLayer: any = null
let markersLayer: any = null

const periodOptions = [
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
  { value: 'all', label: 'Toute la période' }
]

const categoryOptions = [
  { value: 'all', label: 'Toutes' },
  { value: 'voirie', label: '🚧 Voirie' },
  { value: 'eclairage', label: '💡 Éclairage' },
  { value: 'dechets', label: '🗑️ Déchets' },
  { value: 'autre', label: '📋 Autre' }
]

const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'pris_en_charge', label: 'Pris en charge' },
  { value: 'resolu', label: 'Résolu' }
]

const selectedPeriodLabel = computed(() => 
  periodOptions.find(o => o.value === selectedPeriod.value)?.label || ''
)

const selectedCategoryLabel = computed(() => 
  categoryOptions.find(o => o.value === selectedCategory.value)?.label || ''
)

const topHotspot = computed(() => stats.value.hotspots[0] || null)

const dominantCategory = computed(() => {
  const categories = stats.value.by_category
  let maxCat = 'autre'
  let maxCount = 0
  for (const [cat, count] of Object.entries(categories)) {
    if (count > maxCount) {
      maxCount = count
      maxCat = cat
    }
  }
  return maxCat
})

const pendingOldCount = computed(() => {
  return stats.value.by_status['en_attente'] || 0
})

async function fetchHeatmapData() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      period: selectedPeriod.value,
      category: selectedCategory.value,
      status: selectedStatus.value
    })

    const data = await apiFetch<{ points: HeatmapPoint[]; stats: HeatmapStats }>(
      `/api/admin/heatmap?${params}`,
      {
        cache: { maxAge: 5_000 } // Cache 5 secondes
      }
    )

    points.value = data.points
    stats.value = data.stats

    updateMap()
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
    center: [48.7322, 1.3664],
    zoom: 13,
    zoomControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

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

    if (!heatLayer) {
      await import('leaflet.heat')
    }

    const heatData = points.value.map(p => [p.lat, p.lng, p.weight])

    if (heatLayer) {
      heatLayer.setLatLngs(heatData)
    } else {
      heatLayer = (L as any).heatLayer(heatData, {
        radius: 50,
        blur: 35,
        maxZoom: 17,
        max: 3,
        gradient: {
          0.0: '#1A56A0',
          0.3: '#1D9E75',
          0.5: '#EF9F27',
          0.8: '#E24B4A',
          1.0: '#A32D2D'
        }
      })
      heatLayer.addTo(map)
    }
  } else {
    if (heatLayer) {
      map.removeLayer(heatLayer)
      heatLayer = null
    }

    if (markersLayer) {
      map.removeLayer(markersLayer)
    }

    markersLayer = L.layerGroup()

    points.value.forEach(p => {
      const emoji = CATEGORY_CONFIG[p.dominant_category as keyof typeof CATEGORY_CONFIG]?.emoji || '📍'
      
      const icon = L.divIcon({
        html: `<div style="background:#1A56A0;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)"><span style="font-size:16px">${emoji}</span></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      const marker = L.marker([p.lat, p.lng], { icon })
      marker.bindPopup(`
        <div class="text-sm">
          <div class="font-semibold mb-1">${p.address_approx || 'Zone'}</div>
          <div class="text-gray-600">${p.signal_count} signalement${p.signal_count > 1 ? 's' : ''}</div>
          <div class="text-xs text-gray-500 mt-1">Catégorie : ${CATEGORY_CONFIG[p.dominant_category as keyof typeof CATEGORY_CONFIG]?.label || 'Autre'}</div>
        </div>
      `)
      markersLayer.addLayer(marker)
    })

    markersLayer.addTo(map)
  }
}

function zoomToHotspot(hotspot: Hotspot) {
  if (!map) return
  map.setView([hotspot.lat, hotspot.lng], 16)
  
  const L = (window as any).L
  L.popup()
    .setLatLng([hotspot.lat, hotspot.lng])
    .setContent(`
      <div class="text-sm">
        <div class="font-semibold mb-1">${hotspot.address_approx || 'Zone'}</div>
        <div class="text-gray-600">${hotspot.count} signalement${hotspot.count > 1 ? 's' : ''}</div>
      </div>
    `)
    .openOn(map)
}

async function exportPDF() {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const mapEl = mapContainer.value
    if (!mapEl) return

    const canvas = await html2canvas(mapEl, {
      useCORS: true,
      allowTaint: true
    })

    const pdf = new jsPDF('landscape', 'mm', 'a4')

    pdf.setFontSize(16)
    pdf.text('OnSignale — Rapport Carte de Chaleur', 14, 15)
    
    pdf.setFontSize(10)
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22)
    pdf.text(`Période : ${selectedPeriodLabel.value} | Catégorie : ${selectedCategoryLabel.value}`, 14, 28)

    const imgData = canvas.toDataURL('image/jpeg', 0.85)
    pdf.addImage(imgData, 'JPEG', 14, 35, 268, 120)

    pdf.setFontSize(12)
    pdf.text('Statistiques', 14, 165)
    
    pdf.setFontSize(10)
    let yPos = 172
    pdf.text(`Total de signalements : ${stats.value.total_points}`, 14, yPos)
    
    yPos += 10
    pdf.text('Par catégorie :', 14, yPos)
    yPos += 6
    for (const [cat, count] of Object.entries(stats.value.by_category)) {
      const label = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label || cat
      pdf.text(`  • ${label} : ${count}`, 14, yPos)
      yPos += 5
    }

    yPos += 5
    pdf.text('Top 5 zones problématiques :', 14, yPos)
    yPos += 6
    stats.value.hotspots.forEach((h, i) => {
      pdf.text(`${i + 1}. ${h.address_approx || 'Zone inconnue'} — ${h.count} signalements`, 14, yPos)
      yPos += 5
    })

    const date = new Date().toISOString().split('T')[0]
    pdf.save(`drouais-heatmap-${date}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF:', err)
  }
}

watch([selectedPeriod, selectedCategory, selectedStatus], () => {
  fetchHeatmapData()
})

watch(viewMode, () => {
  updateMap()
})

onMounted(() => {
  initMap()
})
</script>

<template>
  <div class="p-6">
    <!-- En-tête -->
    <div class="mb-6">
      <h1 class="text-2xl font-display font-bold text-gray-800">Carte de chaleur</h1>
      <p class="text-sm text-gray-500 mt-1">Zones problématiques — signalements concentrés</p>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <select
        v-model="selectedPeriod"
        class="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option v-for="opt in periodOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select
        v-model="selectedCategory"
        class="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select
        v-model="selectedStatus"
        class="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <button
        @click="exportPDF"
        class="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors"
      >
        <AppIcon name="Download" :size="16" />
        Exporter PDF
      </button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-gray-800">{{ stats.total_points }}</div>
        <div class="text-xs text-gray-500 mt-1">Total signalements</div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-sm font-semibold text-gray-800 truncate">
          {{ topHotspot?.address_approx || 'Aucune' }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Zone la plus active</div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-sm font-semibold text-gray-800">
          {{ CATEGORY_CONFIG[dominantCategory as keyof typeof CATEGORY_CONFIG]?.label || 'Autre' }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Catégorie dominante</div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-orange-600">{{ pendingOldCount }}</div>
        <div class="text-xs text-gray-500 mt-1">En attente</div>
      </div>
    </div>

    <!-- Toggle view mode -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-800">Visualisation</h2>
      <div class="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            @click="viewMode = 'heatmap'"
            :class="[
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'heatmap'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            🔥 Heatmap
          </button>
          <button
            @click="viewMode = 'markers'"
            :class="[
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'markers'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            📍 Markers
          </button>
      </div>
    </div>

    <!-- Carte -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div class="relative">
        <!-- Loading overlay -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-white/80 flex items-center justify-center z-20"
        >
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p class="text-sm text-gray-600">Mise à jour...</p>
          </div>
        </div>

        <div
          id="heatmap-container"
          ref="mapContainer"
          class="w-full h-[480px]"
        ></div>
      </div>

      <!-- Légende -->
      <div class="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div class="flex items-center justify-center gap-4 text-xs">
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-[#1A56A0]"></span>
            Peu actif
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-[#1D9E75]"></span>
            Modéré
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-[#EF9F27]"></span>
            Actif
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-[#E24B4A]"></span>
            Critique
          </span>
        </div>
      </div>
    </div>

    <!-- Top 5 zones -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Top 5 zones problématiques</h2>
      
      <div v-if="stats.hotspots.length === 0" class="text-center py-8 text-gray-500">
        Aucune zone problématique détectée
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(hotspot, index) in stats.hotspots"
          :key="index"
          class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
            #{{ index + 1 }}
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-800 truncate">
              {{ hotspot.address_approx || 'Zone inconnue' }}
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {{ hotspot.count }} signalement{{ hotspot.count > 1 ? 's' : '' }}
              </span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                {{ CATEGORY_CONFIG[hotspot.dominant_category as keyof typeof CATEGORY_CONFIG]?.emoji }}
                {{ CATEGORY_CONFIG[hotspot.dominant_category as keyof typeof CATEGORY_CONFIG]?.label }}
              </span>
            </div>
          </div>

          <button
            @click="zoomToHotspot(hotspot)"
            class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Voir sur la carte
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
