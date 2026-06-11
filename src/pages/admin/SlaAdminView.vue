<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, type ChartData, type ChartOptions, registerables } from 'chart.js'
import { useApi } from '@/composables/useApi'

Chart.register(...registerables)

interface CategorySla {
  label: string
  icon: string
  sla_hours: number
  report_count: number
  resolved_count: number
  avg_resolve_hours: number | null
  sla_compliance_rate: number | null
}

interface MonthlyBucket {
  month: string
  created: number
  resolved: number
}

interface PerformanceData {
  period_days: number
  total_reports: number
  resolved_reports: number
  resolution_rate: number
  avg_time_to_ack_hours: number | null
  avg_time_to_resolve_hours: number | null
  sla_compliance_rate: number | null
  by_category: CategorySla[]
  monthly: MonthlyBucket[]
}

const { apiFetch } = useApi()
const data = ref<PerformanceData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const period = ref(30)

const barChartEl = ref<HTMLCanvasElement | null>(null)
const lineChartEl = ref<HTMLCanvasElement | null>(null)
let barChart: Chart | null = null
let lineChart: Chart | null = null

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetch<PerformanceData>(`/api/admin/performance?days=${period.value}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

function formatHours(h: number | null): string {
  if (h === null) return '—'
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}j`
}

function monthLabel(iso: string): string {
  const [year, month] = iso.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short' })
}

function slaStatus(rate: number | null): { label: string; cls: string } {
  if (rate === null) return { label: '—', cls: 'text-gray-400' }
  if (rate >= 80) return { label: 'Bon', cls: 'text-green-700 bg-green-50' }
  if (rate >= 60) return { label: 'À surveiller', cls: 'text-orange-700 bg-orange-50' }
  return { label: 'Critique', cls: 'text-red-700 bg-red-50' }
}

const monthlyLabels = computed(() => data.value?.monthly.map(m => monthLabel(m.month)) ?? [])
const categoryLabels = computed(() => data.value?.by_category.map(c => c.label) ?? [])
const categoryAvg = computed(() => data.value?.by_category.map(c => c.avg_resolve_hours ?? 0) ?? [])
const categorySla = computed(() => data.value?.by_category.map(c => c.sla_hours) ?? [])

function destroyCharts() {
  barChart?.destroy(); barChart = null
  lineChart?.destroy(); lineChart = null
}

function renderCharts() {
  destroyCharts()
  if (!data.value || !barChartEl.value || !lineChartEl.value) return

  const gridColor = 'rgba(0,0,0,0.05)'
  const textColor = '#6B7280'

  const evolutionData: ChartData<'bar'> = {
    labels: monthlyLabels.value,
    datasets: [
      { label: 'Créés', data: data.value.monthly.map(m => m.created), backgroundColor: '#3B82F6', borderRadius: 3, borderSkipped: false },
      { label: 'Résolus', data: data.value.monthly.map(m => m.resolved), backgroundColor: '#22C55E', borderRadius: 3, borderSkipped: false },
    ],
  }
  const evolutionOpts: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, font: { size: 11 } } }, tooltip: { mode: 'index' } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
    },
  }
  lineChart = new Chart(lineChartEl.value, { type: 'bar', data: evolutionData, options: evolutionOpts })

  const slaData: ChartData<'bar'> = {
    labels: categoryLabels.value,
    datasets: [
      { label: 'Délai réel (h)', data: categoryAvg.value, backgroundColor: '#F97316', borderRadius: 3, borderSkipped: false },
      { label: 'SLA configuré (h)', data: categorySla.value, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, borderSkipped: false },
    ],
  }
  const slaOpts: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, font: { size: 11 } } }, tooltip: { mode: 'index' } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
    },
  }
  barChart = new Chart(barChartEl.value, { type: 'bar', data: slaData, options: slaOpts })
}

watch(data, () => nextTick(renderCharts))
onMounted(load)
onUnmounted(destroyCharts)
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">

      <!-- Header -->
      <div class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Performance & SLA</h1>
          <p class="text-gray-600 mt-1">Indicateurs de traitement et respect des délais</p>
        </div>
        <select
          v-model="period"
          class="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @change="load"
        >
          <option :value="30">30 derniers jours</option>
          <option :value="90">3 derniers mois</option>
          <option :value="180">6 derniers mois</option>
        </select>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
        {{ error }}
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div v-for="i in 4" :key="i" class="bg-white rounded-lg shadow p-5 animate-pulse">
            <div class="h-3 w-24 bg-gray-200 rounded mb-3"></div>
            <div class="h-7 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div v-for="i in 2" :key="i" class="bg-white rounded-lg shadow p-5 animate-pulse h-48"></div>
        </div>
      </template>

      <template v-else-if="data">
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg shadow p-5">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Taux de résolution</p>
            <p class="text-3xl font-bold text-gray-900">
              {{ data.resolution_rate }}<span class="text-lg font-normal text-gray-500">%</span>
            </p>
            <p class="text-xs text-gray-400 mt-1">{{ data.resolved_reports }} / {{ data.total_reports }} signalements</p>
          </div>
          <div class="bg-white rounded-lg shadow p-5">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Délai prise en charge</p>
            <p class="text-3xl font-bold text-gray-900">{{ formatHours(data.avg_time_to_ack_hours) }}</p>
            <p class="text-xs text-gray-400 mt-1">temps moyen</p>
          </div>
          <div class="bg-white rounded-lg shadow p-5">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Délai résolution</p>
            <p class="text-3xl font-bold text-gray-900">{{ formatHours(data.avg_time_to_resolve_hours) }}</p>
            <p class="text-xs text-gray-400 mt-1">temps moyen</p>
          </div>
          <div class="bg-white rounded-lg shadow p-5">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Respect des SLA</p>
            <p class="text-3xl font-bold text-gray-900">
              <template v-if="data.sla_compliance_rate !== null">
                {{ data.sla_compliance_rate }}<span class="text-lg font-normal text-gray-500">%</span>
              </template>
              <template v-else>—</template>
            </p>
            <p class="text-xs text-gray-400 mt-1">sur {{ data.resolved_reports }} résolus</p>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div class="bg-white rounded-lg shadow p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Évolution mensuelle</h2>
            <div class="h-48">
              <canvas ref="lineChartEl"></canvas>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Délai moyen vs SLA par catégorie</h2>
            <div class="h-48">
              <canvas ref="barChartEl"></canvas>
            </div>
          </div>
        </div>

        <!-- SLA table -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="text-sm font-semibold text-gray-700">Détail par catégorie</h2>
          </div>
          <div v-if="data.by_category.length === 0" class="px-5 py-8 text-center text-sm text-gray-400">
            Aucune donnée pour cette période.
          </div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th class="px-5 py-3 text-left">Catégorie</th>
                <th class="px-5 py-3 text-right">Signalements</th>
                <th class="px-5 py-3 text-right">Résolus</th>
                <th class="px-5 py-3 text-right">Délai moyen</th>
                <th class="px-5 py-3 text-right">SLA</th>
                <th class="px-5 py-3 text-right">Respect SLA</th>
                <th class="px-5 py-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cat in data.by_category"
                :key="cat.label"
                class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td class="px-5 py-3 font-medium text-gray-800">
                  <span class="mr-2">{{ cat.icon }}</span>{{ cat.label }}
                </td>
                <td class="px-5 py-3 text-right text-gray-600">{{ cat.report_count }}</td>
                <td class="px-5 py-3 text-right text-gray-600">{{ cat.resolved_count }}</td>
                <td class="px-5 py-3 text-right text-gray-600">{{ formatHours(cat.avg_resolve_hours) }}</td>
                <td class="px-5 py-3 text-right text-gray-400">{{ formatHours(cat.sla_hours) }}</td>
                <td class="px-5 py-3 text-right">
                  <div v-if="cat.sla_compliance_rate !== null" class="flex items-center justify-end gap-2">
                    <div class="w-16 bg-gray-100 rounded-full h-1.5">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        :class="cat.sla_compliance_rate >= 80 ? 'bg-green-500' : cat.sla_compliance_rate >= 60 ? 'bg-orange-400' : 'bg-red-400'"
                        :style="{ width: cat.sla_compliance_rate + '%' }"
                      ></div>
                    </div>
                    <span class="text-gray-600 tabular-nums w-8 text-right">{{ cat.sla_compliance_rate }}%</span>
                  </div>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-5 py-3 text-right">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    :class="slaStatus(cat.sla_compliance_rate).cls"
                  >
                    {{ slaStatus(cat.sla_compliance_rate).label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

    </div>
  </div>
</template>
