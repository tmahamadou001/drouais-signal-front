<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'

const { apiFetch } = useApi()
const authStore = useAuthStore()

interface TeamMember {
  user_id: string
  tenant_id: string
  role: 'admin' | 'agent' | 'observer'
  first_name: string | null
  last_name: string | null
  job_title: string | null
  is_active: boolean
  invited_at: string | null
  email: string | null
}

const members = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Filters
const roleFilter = ref<string>('all')
const statusFilter = ref<string>('all')

// Invite form
const showInviteForm = ref(false)
const inviteLoading = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref(false)
const inviteForm = ref({ email: '', role: 'agent', firstName: '', lastName: '', jobTitle: '' })

// Edit modal
const editingMember = ref<TeamMember | null>(null)
const editForm = ref({ role: 'agent' as string, isActive: true, firstName: '', lastName: '', jobTitle: '' })
const editLoading = ref(false)
const editError = ref<string | null>(null)

// Revoke confirm
const confirmRevokeId = ref<string | null>(null)
const revokeLoading = ref(false)

// Resend invite
const resendingId = ref<string | null>(null)
const resendSuccessId = ref<string | null>(null)

const roleConfig = {
  admin:    { label: 'Admin',    color: 'bg-blue-100 text-blue-700',   icon: 'Shield' },
  agent:    { label: 'Agent',    color: 'bg-indigo-100 text-indigo-700', icon: 'Wrench' },
  observer: { label: 'Observer', color: 'bg-amber-100 text-amber-700',  icon: 'Eye' },
}

const filteredMembers = computed(() => members.value.filter(m => {
  if (roleFilter.value !== 'all' && m.role !== roleFilter.value) return false
  if (statusFilter.value === 'actif' && !m.is_active) return false
  if (statusFilter.value === 'inactif' && m.is_active) return false
  return true
}))

const stats = computed(() => ({
  total:    members.value.filter(m => m.is_active).length,
  admin:    members.value.filter(m => m.role === 'admin' && m.is_active).length,
  agent:    members.value.filter(m => m.role === 'agent' && m.is_active).length,
  observer: members.value.filter(m => m.role === 'observer' && m.is_active).length,
}))

function displayName(m: TeamMember): string {
  if (m.first_name || m.last_name) return [m.first_name, m.last_name].filter(Boolean).join(' ')
  return m.email?.split('@')[0] ?? '—'
}

function initials(m: TeamMember): string {
  if (m.first_name && m.last_name) return (m.first_name[0] + m.last_name[0]).toUpperCase()
  if (m.first_name) return m.first_name.slice(0, 2).toUpperCase()
  if (m.email) return m.email.slice(0, 2).toUpperCase()
  return '??'
}

function avatarColor(m: TeamMember): string {
  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500']
  const i = (m.user_id.charCodeAt(0) + m.user_id.charCodeAt(1)) % colors.length
  return colors[i]
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function fetchMembers() {
  loading.value = true
  error.value = null
  try {
    members.value = await apiFetch<TeamMember[]>('/api/tenant/users')
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function submitInvite() {
  if (!inviteForm.value.email || !inviteForm.value.role) return
  inviteLoading.value = true
  inviteError.value = null
  inviteSuccess.value = false
  try {
    await apiFetch('/api/tenant/users/invite', {
      method: 'POST',
      body: {
        email: inviteForm.value.email,
        role: inviteForm.value.role,
        firstName: inviteForm.value.firstName || undefined,
        lastName: inviteForm.value.lastName || undefined,
        jobTitle: inviteForm.value.jobTitle || undefined,
      },
    })
    inviteSuccess.value = true
    inviteForm.value = { email: '', role: 'agent', firstName: '', lastName: '', jobTitle: '' }
    await fetchMembers()
    setTimeout(() => { showInviteForm.value = false; inviteSuccess.value = false }, 1500)
  } catch (err: any) {
    inviteError.value = err.message
  } finally {
    inviteLoading.value = false
  }
}

function openEdit(m: TeamMember) {
  editingMember.value = m
  editForm.value = {
    role: m.role,
    isActive: m.is_active,
    firstName: m.first_name ?? '',
    lastName: m.last_name ?? '',
    jobTitle: m.job_title ?? '',
  }
  editError.value = null
}

async function submitEdit() {
  if (!editingMember.value) return
  editLoading.value = true
  editError.value = null
  try {
    await apiFetch(`/api/tenant/users/${editingMember.value.user_id}`, {
      method: 'PATCH',
      body: {
        role: editForm.value.role,
        isActive: editForm.value.isActive,
        firstName: editForm.value.firstName || null,
        lastName: editForm.value.lastName || null,
        jobTitle: editForm.value.jobTitle || null,
      },
    })
    await fetchMembers()
    editingMember.value = null
  } catch (err: any) {
    editError.value = err.message
  } finally {
    editLoading.value = false
  }
}

async function resendInvite(userId: string) {
  resendingId.value = userId
  try {
    await apiFetch(`/api/tenant/users/${userId}/resend-invite`, { method: 'POST' })
    resendSuccessId.value = userId
    setTimeout(() => { resendSuccessId.value = null }, 3000)
  } catch (err: any) {
    error.value = err.message
  } finally {
    resendingId.value = null
  }
}

async function confirmRevoke(userId: string) {
  revokeLoading.value = true
  try {
    await apiFetch(`/api/tenant/users/${userId}`, { method: 'DELETE' })
    await fetchMembers()
  } catch (err: any) {
    error.value = err.message
  } finally {
    revokeLoading.value = false
    confirmRevokeId.value = null
  }
}

onMounted(fetchMembers)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Équipe</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gérez les membres et leurs niveaux d'accès</p>
      </div>
      <AppButton @click="showInviteForm = !showInviteForm" variant="primary" class="gap-2">
        <AppIcon name="UserPlus" :size="16" />
        Inviter un membre
      </AppButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="(value, key) in { 'Membres actifs': stats.total, 'Admin': stats.admin, 'Agents': stats.agent, 'Observers': stats.observer }"
        :key="key"
        class="bg-white border border-neutral-200 rounded-ds-lg p-4"
      >
        <p class="text-2xl font-bold text-dark">{{ value }}</p>
        <p class="text-sm text-neutral-500">{{ key }}</p>
      </div>
    </div>

    <!-- Invite Form -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition-all duration-200"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showInviteForm" class="bg-white border border-neutral-200 rounded-ds-lg p-5 space-y-4">
        <h3 class="font-semibold text-dark">Inviter un nouveau membre</h3>

        <div v-if="inviteSuccess" class="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-ds-lg">
          <AppIcon name="CheckCircle" :size="16" />
          Membre ajouté avec succès.
        </div>

        <div v-if="inviteError" class="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-ds-lg">{{ inviteError }}</div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-neutral-600 mb-1">Email <span class="text-red-500">*</span></label>
            <input v-model="inviteForm.email" type="email" placeholder="agent@mairie.fr"
              class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Rôle <span class="text-red-500">*</span></label>
            <select v-model="inviteForm.role"
              class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="observer">Observer</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Poste</label>
            <input v-model="inviteForm.jobTitle" type="text" placeholder="ex: Technicien terrain"
              class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Prénom</label>
            <input v-model="inviteForm.firstName" type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Nom</label>
            <input v-model="inviteForm.lastName" type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="showInviteForm = false" class="text-sm text-neutral-500 hover:text-neutral-700">Annuler</button>
          <AppButton @click="submitInvite" variant="primary" :loading="inviteLoading" :disabled="!inviteForm.email || inviteLoading">
            Inviter
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <select v-model="roleFilter"
        class="px-3 py-2 bg-white border border-neutral-200 rounded-ds text-sm text-neutral-700 focus:outline-none focus:border-primary cursor-pointer">
        <option value="all">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="agent">Agent</option>
        <option value="observer">Observer</option>
      </select>
      <select v-model="statusFilter"
        class="px-3 py-2 bg-white border border-neutral-200 rounded-ds text-sm text-neutral-700 focus:outline-none focus:border-primary cursor-pointer">
        <option value="all">Tous les statuts</option>
        <option value="actif">Actif</option>
        <option value="inactif">Inactif</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white border border-neutral-200 rounded-ds-lg overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-neutral-400 text-sm">Chargement…</div>
      <div v-else-if="error" class="p-4 text-sm text-red-600 bg-red-50">{{ error }}</div>
      <div v-else-if="filteredMembers.length === 0" class="p-8 text-center text-neutral-400 text-sm">
        Aucun membre pour ces filtres.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-neutral-200 bg-neutral-50">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Membre</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Rôle</th>
            <th class="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Poste</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Statut</th>
            <th class="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Invité le</th>
            <th class="px-4 py-3 w-24"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100">
          <tr v-for="m in filteredMembers" :key="m.user_id"
            class="hover:bg-neutral-50 transition-colors"
            :class="{ 'opacity-60': !m.is_active }"
          >
            <!-- Membre -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  :class="avatarColor(m)">
                  {{ initials(m) }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-dark truncate">{{ displayName(m) }}</p>
                  <p class="text-xs text-neutral-400 truncate">{{ m.email ?? '—' }}</p>
                </div>
              </div>
            </td>

            <!-- Rôle -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="roleConfig[m.role]?.color ?? 'bg-neutral-100 text-neutral-600'">
                {{ roleConfig[m.role]?.label ?? m.role }}
              </span>
            </td>

            <!-- Poste -->
            <td class="hidden sm:table-cell px-4 py-3 text-neutral-600">
              {{ m.job_title ?? '—' }}
            </td>

            <!-- Statut -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium"
                :class="m.is_active ? 'text-green-700' : 'text-neutral-400'">
                <span class="w-1.5 h-1.5 rounded-full" :class="m.is_active ? 'bg-green-500' : 'bg-neutral-400'"></span>
                {{ m.is_active ? 'Actif' : 'Inactif' }}
              </span>
            </td>

            <!-- Date -->
            <td class="hidden md:table-cell px-4 py-3 text-neutral-500 text-xs">
              {{ formatDate(m.invited_at) }}
            </td>

            <!-- Actions -->
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <!-- Ne pas permettre de modifier son propre compte -->
                <template v-if="m.user_id !== authStore.user?.id">
                  <button @click="resendInvite(m.user_id)"
                    :disabled="resendingId === m.user_id"
                    class="p-1.5 rounded transition-colors"
                    :class="resendSuccessId === m.user_id
                      ? 'text-green-600 bg-green-50'
                      : 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50'"
                    :title="resendSuccessId === m.user_id ? 'Envoyé !' : 'Renvoyer l\'invitation'">
                    <AppIcon v-if="resendSuccessId === m.user_id" name="CheckCircle" :size="15" />
                    <AppIcon v-else-if="resendingId === m.user_id" name="Loader" :size="15" class="animate-spin" />
                    <AppIcon v-else name="Send" :size="15" />
                  </button>
                  <button @click="openEdit(m)"
                    class="p-1.5 rounded text-neutral-400 hover:text-primary hover:bg-primary-50 transition-colors"
                    title="Modifier">
                    <AppIcon name="Pencil" :size="15" />
                  </button>
                  <button v-if="m.is_active" @click="confirmRevokeId = m.user_id"
                    class="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Révoquer">
                    <AppIcon name="UserX" :size="15" />
                  </button>
                </template>
                <span v-else class="text-xs text-neutral-300 px-2">Vous</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="editingMember" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30" @click="editingMember = null" />
        <div class="relative bg-white rounded-ds-xl shadow-xl w-full max-w-md p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-dark">Modifier le membre</h3>
            <button @click="editingMember = null" class="text-neutral-400 hover:text-neutral-600">
              <AppIcon name="X" :size="18" />
            </button>
          </div>

          <div class="flex items-center gap-3 p-3 bg-neutral-50 rounded-ds-lg">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              :class="avatarColor(editingMember)">
              {{ initials(editingMember) }}
            </div>
            <div>
              <p class="font-medium text-dark text-sm">{{ displayName(editingMember) }}</p>
              <p class="text-xs text-neutral-500">{{ editingMember.email }}</p>
            </div>
          </div>

          <div v-if="editError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-ds">{{ editError }}</div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-neutral-600 mb-1">Rôle</label>
              <select v-model="editForm.role"
                class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="observer">Observer</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Prénom</label>
                <input v-model="editForm.firstName" type="text"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Nom</label>
                <input v-model="editForm.lastName" type="text"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-neutral-600 mb-1">Poste</label>
              <input v-model="editForm.jobTitle" type="text" placeholder="ex: Technicien terrain"
                class="w-full px-3 py-2 border border-neutral-300 rounded-ds text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div class="flex items-center gap-3">
              <label class="text-xs font-medium text-neutral-600">Statut</label>
              <button
                @click="editForm.isActive = !editForm.isActive"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                :class="editForm.isActive ? 'bg-primary' : 'bg-neutral-300'"
              >
                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  :class="editForm.isActive ? 'translate-x-4' : 'translate-x-0.5'" />
              </button>
              <span class="text-xs text-neutral-500">{{ editForm.isActive ? 'Actif' : 'Inactif' }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="editingMember = null" class="text-sm text-neutral-500 hover:text-neutral-700">Annuler</button>
            <AppButton @click="submitEdit" variant="primary" :loading="editLoading">Enregistrer</AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Revoke Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmRevokeId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30" @click="confirmRevokeId = null" />
        <div class="relative bg-white rounded-ds-xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AppIcon name="UserX" :size="22" class="text-red-600" />
          </div>
          <div class="text-center">
            <h3 class="font-semibold text-dark">Révoquer l'accès ?</h3>
            <p class="text-sm text-neutral-500 mt-1">Le membre ne pourra plus accéder à l'administration. Vous pourrez le réactiver plus tard.</p>
          </div>
          <div class="flex justify-center gap-3">
            <button @click="confirmRevokeId = null" class="px-4 py-2 text-sm text-neutral-600 border border-neutral-300 rounded-ds hover:bg-neutral-50">Annuler</button>
            <AppButton @click="confirmRevoke(confirmRevokeId!)" variant="danger" :loading="revokeLoading">Révoquer</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
