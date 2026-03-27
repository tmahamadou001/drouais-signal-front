<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Report, ReportStatus } from '@/types'
import { STATUS_CONFIG, CATEGORY_CONFIG } from '@/types'
import 'leaflet/dist/leaflet.css'

const props = withDefaults(defineProps<{
  reports?: Report[]
  interactive?: boolean
  center?: [number, number]
  zoom?: number
  selectedPosition?: { lat: number; lng: number } | null
}>(), {
  reports: () => [],
  interactive: false,
  center: () => [48.7356, 1.3653], // Dreux city center
  zoom: 14,
  selectedPosition: null,
})

const emit = defineEmits<{
  (e: 'map-click', payload: { lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLDivElement>()
let map: any = null
let markers: any[] = []
let selectedMarker: any = null

const markerColors: Record<ReportStatus, string> = {
  en_attente: '#A3A3A3',
  pris_en_charge: '#EF9F27',
  resolu: '#1D9E75',
}

function createMarkerIcon(color: string, voteCount: number = 0) {
  const L = (window as any).L
  const size = voteCount >= 5 ? 31 : 24
  const borderWidth = voteCount >= 5 ? 4 : 3
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: ${borderWidth}px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

function createSelectedIcon() {
  const L = (window as any).L
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
  ;(window as any).L = L

  map = L.map(mapContainer.value, {
    center: props.center,
    zoom: props.zoom,
    zoomControl: true,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  }).addTo(map)

  if (props.interactive) {
    map.on('click', (e: any) => {
      emit('map-click', { lat: e.latlng.lat, lng: e.latlng.lng })
    })
  }

  updateMarkers()
  updateSelectedMarker()
}

function updateMarkers() {
  if (!map) return
  const L = (window as any).L

  // Clear existing markers
  markers.forEach(m => map.removeLayer(m))
  markers = []

  props.reports.forEach(report => {
    
    const color = markerColors[report.status]
    const voteCount = report.vote_count || 0
    const icon = createMarkerIcon(color, voteCount)
    const categoryConfig = CATEGORY_CONFIG[report.category]
    const statusConfig = STATUS_CONFIG[report.status]
    const isPopular = voteCount >= 10

    const marker = L.marker([report.lat, report.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 180px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${categoryConfig.emoji} ${report.title}</div>
          <div style="font-size: 12px; color: #737373; margin-bottom: 6px;">
            ${categoryConfig.label}${report.address_approx ? ' — ' + report.address_approx : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <div style="
              display: inline-flex; align-items: center; gap: 4px;
              padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
              background: ${color}20; color: ${color};
            ">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
              ${statusConfig.label}
            </div>
            ${voteCount > 0 ? `
              <div style="
                display: inline-flex; align-items: center; gap: 3px;
                padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
                background: #EFF6FF; color: #1E40AF;
              ">
                <span>▲</span>
                <span>${voteCount}</span>
              </div>
            ` : ''}
          </div>
          ${isPopular ? `
            <div style="
              display: inline-flex; align-items: center; gap: 4px;
              padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700;
              background: #FEF3C7; color: #92400E; margin-bottom: 6px;
            ">
              👑 Prioritaire
            </div>
          ` : ''}
          <div style="margin-top: 8px;">
            <a href="/signalement/${report.id}" style="
              color: #1A56A0; font-size: 12px; font-weight: 500; text-decoration: none;
            ">Voir le détail →</a>
          </div>
        </div>
      `)

    markers.push(marker)
  })
}

function updateSelectedMarker() {
  if (!map) return
  const L = (window as any).L

  if (selectedMarker) {
    map.removeLayer(selectedMarker)
    selectedMarker = null
  }

  if (props.selectedPosition) {
    const icon = createSelectedIcon()
    selectedMarker = L.marker(
      [props.selectedPosition.lat, props.selectedPosition.lng],
      { icon }
    ).addTo(map)

    map.setView([props.selectedPosition.lat, props.selectedPosition.lng], 16)
  }
}

watch(() => props.reports, updateMarkers, { deep: true })
watch(() => props.selectedPosition, updateSelectedMarker, { deep: true })

onMounted(initMap)
</script>

<template>
  <div
    ref="mapContainer"
    class="w-full h-full rounded-ds-lg overflow-hidden"
    style="min-height: 300px;"
  />
</template>
