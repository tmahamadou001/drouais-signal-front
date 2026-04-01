<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/AppIcon.vue'

const { apiFetch, invalidateCachePattern } = useApi()

interface WeeklyStats {
  period: { from: string; to: string }
  new_reports: number
  resolved: number
  in_progress: number
  overdue: number
  vs_last_week: number
  by_category: Record<string, number>
  top_zones: Array<{ address: string; count: number }>
  total_votes: number
}

interface Recipient {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

const loading = ref(false)
const sending = ref(false)
const previewHtml = ref('')
const stats = ref<WeeklyStats | null>(null)
const recipients = ref<Recipient[]>([])
const showAddModal = ref(false)
const showConfirmSend = ref(false)
const showDeleteConfirm = ref<string | null>(null)
const showPreviewModal = ref(false)

const newRecipient = ref({
  email: '',
  name: '',
  role: 'elu',
})

const activeRecipients = ref(0)

async function loadPreview() {
  loading.value = true
  try {
    const data = await apiFetch<{ stats: WeeklyStats; html: string }>(
      '/api/admin/weekly-report/preview'
    )
    stats.value = data.stats
    previewHtml.value = data.html
    showPreviewModal.value = true
  } catch (err: any) {
    console.error('Erreur chargement preview:', err)
    alert('Erreur lors du chargement de l\'aperçu')
  } finally {
    loading.value = false
  }
}

async function loadRecipients() {
  try {
    const data = await apiFetch<{ recipients: Recipient[] }>(
      '/api/admin/weekly-report/recipients'
    )
    recipients.value = data.recipients
    activeRecipients.value = data.recipients.filter((r) => r.is_active).length
  } catch (err: any) {
    console.error('Erreur chargement destinataires:', err)
  }
}

async function sendReport() {
  sending.value = true
  showConfirmSend.value = false
  try {
    await apiFetch('/api/admin/weekly-report/send', {
      method: 'POST',
    })
    alert(`✓ Rapport envoyé à ${activeRecipients.value} destinataire(s)`)
  } catch (err: any) {
    console.error('Erreur envoi rapport:', err)
    alert('Erreur lors de l\'envoi du rapport')
  } finally {
    sending.value = false
  }
}

async function addRecipient() {
  if (!newRecipient.value.email || !newRecipient.value.name) {
    alert('Email et nom requis')
    return
  }

  try {
    await apiFetch('/api/admin/weekly-report/recipients', {
      method: 'POST',
      body: newRecipient.value,
    })
    
    invalidateCachePattern(/^\/api\/admin\/weekly-report\/recipients/)
    
    showAddModal.value = false
    newRecipient.value = { email: '', name: '', role: 'elu' }
    await loadRecipients()
  } catch (err: any) {
    console.error('Erreur ajout destinataire:', err)
    alert(err.message || 'Erreur lors de l\'ajout')
  }
}

async function deleteRecipient(id: string) {
  try {
    await apiFetch(`/api/admin/weekly-report/recipients/${id}`, {
      method: 'DELETE',
    })
    
    invalidateCachePattern(/^\/api\/admin\/weekly-report\/recipients/)
    
    showDeleteConfirm.value = null
    await loadRecipients()
  } catch (err: any) {
    console.error('Erreur suppression destinataire:', err)
    alert('Erreur lors de la suppression')
  }
}

onMounted(() => {
  loadRecipients()
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-4 md:space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-800">Rapport hebdomadaire</h1>
        <p class="text-sm text-gray-600 mt-1">
          Synthèse automatique envoyée chaque lundi à 8h00
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          @click="loadPreview"
          :disabled="loading"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm md:text-base"
        >
          <AppIcon
            :name="loading ? 'Loader' : 'Eye'"
            :size="18"
            :class="loading ? 'animate-spin' : ''"
          />
          <span class="font-medium text-gray-700">Aperçu du rapport</span>
        </button>
        <button
          @click="showConfirmSend = true"
          :disabled="sending || activeRecipients === 0"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
        >
          <AppIcon
            :name="sending ? 'Loader' : 'Send'"
            :size="18"
            :class="sending ? 'animate-spin' : ''"
          />
          <span class="font-medium">Envoyer maintenant</span>
        </button>
      </div>
    </div>

    <!-- Destinataires -->
    <div class="bg-white rounded-lg border border-gray-200">
      <div class="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-gray-700">
            Destinataires ({{ activeRecipients }} actifs)
          </h2>
        </div>
        <button
          @click="showAddModal = true"
          class="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <AppIcon name="Plus" :size="16" />
          <span>Ajouter</span>
        </button>
      </div>

      <div class="divide-y divide-gray-100">
        <div
          v-for="recipient in recipients"
          :key="recipient.id"
          class="px-4 py-3 flex items-start sm:items-center justify-between hover:bg-gray-50 transition-colors gap-3"
          :class="{ 'opacity-50': !recipient.is_active }"
        >
          <div class="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div
              class="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
              :class="recipient.is_active ? 'bg-primary' : 'bg-gray-400'"
            >
              {{ recipient.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-800 truncate">{{ recipient.name }}</div>
              <div class="text-sm text-gray-500 truncate">{{ recipient.email }}</div>
              <span
                class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-blue-100 text-blue-700': recipient.role === 'elu',
                  'bg-purple-100 text-purple-700': recipient.role === 'mairie',
                  'bg-green-100 text-green-700': recipient.role === 'vp_numerique',
                  'bg-gray-100 text-gray-700': recipient.role === 'autre',
                }"
              >
                {{ recipient.role }}
              </span>
            </div>
          </div>
          <button
            v-if="recipient.is_active"
            @click="showDeleteConfirm = recipient.id"
            class="p-2 flex-shrink-0 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Retirer ce destinataire"
          >
            <AppIcon name="X" :size="18" />
          </button>
        </div>

        <div v-if="recipients.length === 0" class="px-4 py-8 text-center text-gray-500">
          Aucun destinataire configuré
        </div>
      </div>
    </div>

    <!-- Modal aperçu du rapport -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showPreviewModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <!-- Header modale -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Aperçu du rapport hebdomadaire</h3>
            <p v-if="stats" class="text-sm text-gray-600 mt-0.5">
              Semaine du {{ stats.period.from }} au {{ stats.period.to }}
            </p>
          </div>
          <button
            @click="showPreviewModal = false"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <AppIcon name="X" :size="20" class="text-gray-500" />
          </button>
        </div>

        <!-- Contenu scrollable -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Stats cards -->
          <div v-if="stats" class="grid grid-cols-4 gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="text-3xl font-bold text-blue-900">{{ stats.new_reports }}</div>
              <div class="text-sm text-blue-700 mt-1">Nouveaux signalements</div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="text-3xl font-bold text-green-900">{{ stats.resolved }}</div>
              <div class="text-sm text-green-700 mt-1">Résolus</div>
            </div>
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div class="text-3xl font-bold text-orange-900">{{ stats.in_progress }}</div>
              <div class="text-sm text-orange-700 mt-1">En cours</div>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="text-3xl font-bold text-red-900">{{ stats.overdue }}</div>
              <div class="text-sm text-red-700 mt-1">En retard</div>
            </div>
          </div>

          <!-- Aperçu email -->
          <div v-if="previewHtml" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h4 class="text-sm font-semibold text-gray-700">Rendu de l'email</h4>
            </div>
            <div class="p-4 bg-gray-50">
              <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div v-html="previewHtml"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer modale -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            @click="showPreviewModal = false"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
          >
            Fermer
          </button>
          <button
            @click="showPreviewModal = false; showConfirmSend = true"
            :disabled="activeRecipients === 0"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AppIcon name="Send" :size="18" />
            <span>Envoyer maintenant</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal ajout destinataire -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showAddModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-800">Ajouter un destinataire</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              v-model="newRecipient.name"
              type="text"
              placeholder="Jean Dupont"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="newRecipient.email"
              type="email"
              placeholder="jean.dupont@example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              v-model="newRecipient.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="elu">Élu</option>
              <option value="mairie">Mairie</option>
              <option value="vp_numerique">VP Numérique</option>
              <option value="dsi">DSI</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            @click="showAddModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Annuler
          </button>
          <button
            @click="addRecipient"
            class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>

    <!-- Modal confirmation envoi -->
    <div
      v-if="showConfirmSend"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showConfirmSend = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AppIcon name="AlertTriangle" :size="20" class="text-orange-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Envoyer le rapport ?</h3>
            <p class="text-sm text-gray-600 mt-1">
              Le rapport sera envoyé à {{ activeRecipients }} destinataire(s) actif(s).
            </p>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            @click="showConfirmSend = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Annuler
          </button>
          <button
            @click="sendReport"
            class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal confirmation suppression -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showDeleteConfirm = null"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AppIcon name="AlertTriangle" :size="20" class="text-red-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Retirer ce destinataire ?</h3>
            <p class="text-sm text-gray-600 mt-1">
              Il ne recevra plus les rapports hebdomadaires.
            </p>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            @click="showDeleteConfirm = null"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Annuler
          </button>
          <button
            @click="deleteRecipient(showDeleteConfirm)"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Retirer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
