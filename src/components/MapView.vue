<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import '@/assets/map.css'
import { useApi } from '@/composables/useApi'

interface MapMarker {
  id: string
  lat: number
  lng: number
  status: 'en_attente' | 'pris_en_charge' | 'resolu'
  category: 'voirie' | 'eclairage' | 'dechets' | 'autre'
  title: string
  vote_count: number
}

interface ReportDetail extends MapMarker {
  description: string | null
  photo_url: string | null
  address_approx: string | null
  created_at: string
}

const props = withDefaults(defineProps<{
  interactive?: boolean
  center?: [number, number]
  zoom?: number
  selectedPosition?: { lat: number; lng: number; category?: string } | null
  showAllMarkers?: boolean
}>(), {
  interactive: false,
  center: () => [48.7365, 1.3668],
  zoom: 13,
  selectedPosition: null,
  showAllMarkers: false,
})

const emit = defineEmits<{
  (e: 'map-click', payload: { lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLDivElement>()
const markersLoading = ref(false)
const totalMarkers = ref(0)

const { apiFetch } = useApi()

let map: any = null
let clusterGroup: any = null
let selectedMarker: any = null
let currentOpenMarker: any = null
let isLoadingPopup = false

const STATUS_COLORS = {
  en_attente: '#888780',
  pris_en_charge: '#EF9F27',
  resolu: '#1D9E75'
}

const CATEGORY_EMOJIS: Record<string, string> = {
  voirie: '🚧',
  eclairage: '💡',
  dechets: '🗑️',
  autre: '❓'
}

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] || '📍'
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    voirie: 'Voirie',
    eclairage: 'Éclairage',
    dechets: 'Déchets',
    autre: 'Autre'
  }
  return labels[category] || category
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    pris_en_charge: 'Pris en charge',
    resolu: 'Résolu'
  }
  return labels[status] || status
}

function getMarkerIcon(status: string, category: string): any {
  const L = (window as any).L
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#888780'
  const emoji = getCategoryEmoji(category)

  return L.divIcon({
    html: `
      <div class="custom-marker" style="background:${color}">
        <span style="font-size:14px">${emoji}</span>
      </div>
    `,
    className: 'custom-marker-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  })
}

function createSelectedIcon(category?: string): any {
  const L = (window as any).L
  
  if (category) {
    const emoji = getCategoryEmoji(category)
    return L.divIcon({
      html: `
        <div class="custom-marker" style="background:#1A56A0">
          <span style="font-size:14px">${emoji}</span>
        </div>
      `,
      className: 'custom-marker-wrapper',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    })
  }
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px; height: 32px;
      background: #1A56A0;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(26,86,160,0.5);
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

async function initMap() {
  if (!mapContainer.value) return

  const L = await import('leaflet')
  ;(window as any).L = L.default || L

  await import('leaflet.markercluster')

  map = L.map(mapContainer.value, {
    center: props.center,
    zoom: props.zoom,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const LeafletWithCluster = (window as any).L
  clusterGroup = LeafletWithCluster.markerClusterGroup({
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount()
      const size = count < 10 ? 'small' :
                   count < 50 ? 'medium' : 'large'
      return L.divIcon({
        html: `<div class="cluster-icon cluster-${size}">
                 <span>${count}</span>
               </div>`,
        className: 'custom-cluster',
        iconSize: L.point(40, 40)
      })
    }
  })

  clusterGroup.addTo(map)

  if (props.interactive) {
    map.on('click', (e: any) => {
      emit('map-click', { lat: e.latlng.lat, lng: e.latlng.lng })
    })
  }

  if (props.showAllMarkers) {
    await loadMarkers()
  }
  
  updateSelectedMarker()
}

async function loadMarkers() {
  markersLoading.value = true

  try {
    const {markers} = await apiFetch<{markers: MapMarker[]}>('/api/map/markers', {
      cache: { maxAge: 5_000 } // Cache 5 secondes
    })
    
    if (!markers) {
      console.error('Failed to load markers: no data returned')
      return
    }
    
    const L = (window as any).L

    markers.forEach((marker: MapMarker) => {
      const leafletMarker = L.marker(
        [marker.lat, marker.lng],
        { icon: getMarkerIcon(marker.status, marker.category) }
      )

      leafletMarker.bindTooltip(
        `<div class="marker-tooltip">
          <span class="marker-cat">${getCategoryLabel(marker.category)}</span>
          <span class="marker-title">${marker.title}</span>
          ${marker.vote_count > 0
            ? `<span class="marker-votes">▲ ${marker.vote_count}</span>` 
            : ''}
        </div>`,
        { permanent: false, direction: 'top', offset: [0, -10], maxWidth: 200 }
      )

      leafletMarker.on('click', () => {
        if (isLoadingPopup) return
        openDetailPopup(marker.id, leafletMarker)
      })

      clusterGroup.addLayer(leafletMarker)
    })

    totalMarkers.value = markers.length

  } catch (err) {
    console.error('Failed to load markers:', err)
  } finally {
    markersLoading.value = false
  }
}

async function openDetailPopup(reportId: string, marker: any) {
  if (isLoadingPopup) return
  
  isLoadingPopup = true
  
  if (currentOpenMarker === marker && marker.isPopupOpen()) {
    isLoadingPopup = false
    return
  }
  
  currentOpenMarker = marker
  
  marker.unbindPopup()
  marker.bindPopup(
    `<div class="popup-loading">
       <div class="popup-spinner"></div>
       Chargement...
     </div>`,
    { maxWidth: 280 }
  ).openPopup()

  try {
    const {report: ReportDetail} = await apiFetch<{report: ReportDetail}>(`/api/reports/${reportId}`)

    const popupContent = `
      <div class="report-popup">

        ${ReportDetail.photo_url ? `
          <div class="popup-photo">
            <img
              src="${ReportDetail.photo_url}"
              alt="${ReportDetail.title}"
              loading="lazy"
              style="width:100%;height:120px;
                     object-fit:cover;border-radius:6px"
            />
          </div>
        ` : ''}

        <div class="popup-body">
          <div class="popup-meta">
            <span class="popup-cat">
              ${getCategoryEmoji(ReportDetail.category)}
              ${getCategoryLabel(ReportDetail.category)}
            </span>
            <span class="popup-status status-${ReportDetail.status}">
              ${getStatusLabel(ReportDetail.status)}
            </span>
          </div>

          <div class="popup-title">${ReportDetail.title}</div>

          ${ReportDetail.description ? `
            <div class="popup-desc">${ReportDetail.description}</div>
          ` : ''}

          ${ReportDetail.address_approx ? `
            <div class="popup-address">
              📍 ${ReportDetail.address_approx}
            </div>
          ` : ''}

          <div class="popup-footer">
            ${ReportDetail.vote_count > 0
              ? `<span>▲ ${ReportDetail.vote_count} vote${ReportDetail.vote_count > 1 ? 's' : ''}</span>` 
              : ''}
            <a
              href="/signalement/${ReportDetail.id}"
              class="popup-link"
            >
              Voir le détail →
            </a>
          </div>
        </div>

      </div>
    `

    marker.setPopupContent(popupContent)

  } catch {
    marker.setPopupContent(
      '<div class="popup-error">Impossible de charger les détails</div>'
    )
  } finally {
    isLoadingPopup = false
  }
}

function updateSelectedMarker() {
  if (!map) return
  const L = (window as any).L

  if (selectedMarker) {
    map.removeLayer(selectedMarker)
    selectedMarker = null
  }

  if (props.selectedPosition) {
    const report = props.selectedPosition as any
    const icon = createSelectedIcon(report.category)
    selectedMarker = L.marker(
      [props.selectedPosition.lat, props.selectedPosition.lng],
      { icon }
    ).addTo(map)

    map.setView([props.selectedPosition.lat, props.selectedPosition.lng], 16)
  }
}

onMounted(initMap)

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="w-full h-full rounded-ds-lg overflow-hidden"
    style="min-height: 300px;"
  />
</template>

