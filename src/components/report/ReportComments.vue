<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useReportComments } from '@/composables/useReportComments'
import { useAuthStore } from '@/stores/auth'
import { usePhotoUpload } from '@/composables/usePhotoUpload'
import type { ReportComment } from '@/types/comment'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import PhotoLightbox from '@/components/PhotoLightbox.vue'

const props = defineProps<{
  reportId: string
  reportStatus: string
  reportPhotoUrl?: string | null
  mode: 'agent' | 'citizen'
}>()

const authStore = useAuthStore()
const {
  comments, loading, sending, error,
  load, postAgentMessage, postCitizenReply,
  hasReplied,
} = useReportComments(props.reportId)

const { uploading, uploadResolutionPhoto } = usePhotoUpload()

// ─── Agent ───────────────────────────────────────
const agentMessage = ref('')
const agentPhotoUrl = ref('')
const isResolutionPhoto = ref(false)
const photoFileInput = ref<HTMLInputElement | null>(null)
const charCount = computed(
  () => agentMessage.value.length
)

function triggerPhotoSelect() {
  photoFileInput.value?.click()
}

async function handlePhotoSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const url = await uploadResolutionPhoto(file, props.reportId)
  if (url) {
    agentPhotoUrl.value = url
  }
  // Reset input
  if (target) target.value = ''
}

function removePhoto() {
  agentPhotoUrl.value = ''
}

async function handleAgentSubmit() {
  if (!agentMessage.value.trim()) return
  const ok = await postAgentMessage(
    agentMessage.value,
    agentPhotoUrl.value || undefined,
    isResolutionPhoto.value
  )
  if (ok) {
    agentMessage.value = ''
    agentPhotoUrl.value = ''
    isResolutionPhoto.value = false
  }
}

// ─── Lightbox photo ──────────────────────────────
const lightboxOpen = ref(false)
const lightboxImageUrl = ref('')

function openLightbox(imageUrl: string) {
  lightboxImageUrl.value = imageUrl
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

// ─── Citoyen ─────────────────────────────────────
const citizenReplies = ref<Record<string, string>>({})
const replyingTo = ref<string | null>(null)

function toggleReply(parentId: string) {
  if (replyingTo.value === parentId) {
    replyingTo.value = null
  } else {
    replyingTo.value = parentId
    if (!citizenReplies.value[parentId]) {
      citizenReplies.value[parentId] = ''
    }
  }
}

async function handleCitizenReply(parentId: string) {
  const content = citizenReplies.value[parentId]
  if (!content?.trim()) return
  const ok = await postCitizenReply(
    content, parentId
  )
  if (ok) {
    citizenReplies.value[parentId] = ''
    replyingTo.value = null
  }
}

// ─── Formatage date ───────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(
    'fr-FR',
    {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function getAuthorLabel(
  comment: ReportComment
): string {
  if (comment.authorType === 'citizen') {
    return 'Vous'
  }
  const meta = comment.author?.user_metadata
  if (meta?.first_name) {
    return [meta.first_name, meta.last_name]
      .filter(Boolean).join(' ')
  }
  return 'Agent municipal'
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">

    <!-- Titre section -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-900">
        Messages
      </h3>
      <span
        v-if="comments.length"
        class="text-xs text-gray-400"
      >
        {{ comments.length }}
        {{ comments.length > 1 ? 'messages' : 'message' }}
      </span>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-8"
    >
      <div class="w-5 h-5 border-2 border-primary
                  border-t-transparent rounded-full
                  animate-spin"/>
    </div>

    <!-- Fil de Messages -->
    <div v-else class="space-y-3">

      <!-- État vide -->
      <div
        v-if="!comments.length && mode === 'citizen'"
        class="text-center py-6"
      >
        <p class="text-sm text-gray-400">
          Aucun message pour l'instant.
        </p>
      </div>

      <!-- Messages agents + réponses -->
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="space-y-2"
      >
        <!-- Message agent -->
        <div class="flex gap-3">
          <!-- Avatar agent -->
          <div class="w-8 h-8 rounded-full bg-primary
                      flex items-center justify-center
                      flex-shrink-0">
            <AppIcon name="Wrench" :size="16" class="text-white" />
          </div>

          <div class="flex-1 min-w-0">
            <!-- Bulle message -->
            <div class="bg-blue-50 border border-blue-100
                        rounded-2xl rounded-tl-sm p-3">
              <div class="flex items-center
                          justify-between gap-2 mb-1.5">
                <span class="text-xs font-semibold
                             text-primary">
                  {{ getAuthorLabel(comment) }}
                </span>
                <span class="text-xs text-gray-400
                             flex-shrink-0">
                  {{ formatDate(comment.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-gray-800
                        leading-relaxed">
                {{ comment.content }}
              </p>

              <!-- Photo résolution -->
              <div
                v-if="comment.photoUrl"
                class="mt-3 space-y-2"
              >
                <p
                  v-if="comment.isResolutionPhoto
                        && reportPhotoUrl"
                  class="text-xs font-medium
                         text-gray-500"
                >
                  Avant / Après
                </p>
                <div
                  :class="[
                    'gap-2',
                    comment.isResolutionPhoto
                    && reportPhotoUrl
                      ? 'grid grid-cols-2'
                      : ''
                  ]"
                >
                  <!-- Photo Avant (si résolution) -->
                  <div
                    v-if="comment.isResolutionPhoto
                          && reportPhotoUrl"
                    class="relative group cursor-pointer
                           rounded-lg overflow-hidden"
                    @click="openLightbox(reportPhotoUrl)"
                  >
                    <img
                      :src="reportPhotoUrl"
                      alt="Avant"
                      class="w-full h-28 object-cover
                             opacity-75 group-hover:opacity-90
                             transition-opacity"
                    />
                    <div class="absolute inset-0 bg-black/0
                                group-hover:bg-black/20
                                transition-colors flex
                                items-center justify-center">
                      <AppIcon
                        name="ZoomIn"
                        :size="24"
                        class="text-white opacity-0
                               group-hover:opacity-100
                               transition-opacity"
                      />
                    </div>
                  </div>

                  <!-- Photo principale / Après -->
                  <div
                    class="relative group cursor-pointer
                           rounded-lg overflow-hidden"
                    @click="openLightbox(comment.photoUrl)"
                  >
                    <img
                      :src="comment.photoUrl"
                      :alt="comment.isResolutionPhoto
                            ? 'Après intervention'
                            : 'Photo jointe'"
                      class="w-full h-28 object-cover
                             group-hover:brightness-95
                             transition-all"
                    />
                    <div class="absolute inset-0 bg-black/0
                                group-hover:bg-black/20
                                transition-colors flex
                                items-center justify-center">
                      <AppIcon
                        name="ZoomIn"
                        :size="24"
                        class="text-white opacity-0
                               group-hover:opacity-100
                               transition-opacity"
                      />
                    </div>
                  </div>
                </div>
                <p
                  v-if="comment.isResolutionPhoto"
                  class="text-xs text-green-600
                         font-medium"
                >
                  ✓ Intervention terminée
                </p>
              </div>
            </div>

            <!-- Bouton répondre (citoyen) -->
            <div
              v-if="mode === 'citizen'
                    && !hasReplied(comment.id)"
              class="mt-1.5 ml-1"
            >
              <button
                v-if="replyingTo !== comment.id"
                @click="toggleReply(comment.id)"
                class="text-xs text-primary
                       font-medium hover:underline"
              >
                Répondre
              </button>
            </div>

            <!-- Badge "déjà répondu" -->
            <div
              v-else-if="mode === 'citizen'
                         && hasReplied(comment.id)"
              class="mt-1 ml-1"
            >
              <span class="text-xs text-gray-400">
                Vous avez répondu
              </span>
            </div>
          </div>
        </div>

        <!-- Réponses citoyens -->
        <div
          v-if="comment.replies?.length"
          class="ml-11 space-y-2"
        >
          <div
            v-for="reply in comment.replies"
            :key="reply.id"
            class="flex gap-3 justify-end"
          >
            <div class="flex-1 min-w-0">
              <div class="bg-gray-100 rounded-2xl
                          rounded-tr-sm p-3">
                <div class="flex items-center
                            justify-between
                            gap-2 mb-1.5">
                  <span class="text-xs font-semibold
                               text-gray-700">
                    Vous
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ formatDate(reply.createdAt) }}
                  </span>
                </div>
                <p class="text-sm text-gray-800
                          leading-relaxed">
                  {{ reply.content }}
                </p>
              </div>
            </div>
            <!-- Avatar citoyen -->
            <div class="w-8 h-8 rounded-full
                        bg-gray-200 flex items-center
                        justify-center flex-shrink-0">
              <AppIcon name="User" :size="16" class="text-gray-500" />
            </div>
          </div>
        </div>

        <!-- Formulaire réponse citoyen -->
        <div
          v-if="mode === 'citizen'
                && replyingTo === comment.id"
          class="ml-11"
        >
          <div class="bg-white border border-gray-200
                      rounded-2xl p-3 space-y-2">
            <textarea
              v-model="citizenReplies[comment.id]"
              placeholder="Votre réponse..."
              rows="3"
              maxlength="500"
              class="w-full text-sm text-gray-900
                     placeholder-gray-300 outline-none
                     resize-none"
            />
            <div class="flex items-center
                        justify-between">
              <span class="text-xs text-gray-400">
                {{
                  (citizenReplies[comment.id] ?? '')
                    .length
                }}/500
              </span>
              <div class="flex gap-2">
                <AppButton
                  variant="ghost"
                  size="xs"
                  @click="toggleReply(comment.id)"
                >
                  Annuler
                </AppButton>
                <AppButton
                  variant="primary"
                  size="xs"
                  :disabled="
                    sending ||
                    !citizenReplies[comment.id]
                      ?.trim()
                  "
                  :loading="sending"
                  @click="handleCitizenReply(
                    comment.id
                  )"
                >
                  Envoyer
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Erreur globale -->
    <div
      v-if="error"
      class="text-xs text-red-500 bg-red-50
             border border-red-100 rounded-xl
             px-4 py-2"
    >
      {{ error }}
    </div>

    <!-- Formulaire agent -->
    <div
      v-if="mode === 'agent'"
      class="border-t border-gray-100 pt-4 space-y-3"
    >
      <p class="text-xs font-medium text-gray-500">
        Envoyer un message au citoyen
      </p>

      <textarea
        v-model="agentMessage"
        placeholder="Votre message pour le citoyen..."
        rows="3"
        maxlength="500"
        class="w-full px-4 py-3 border border-gray-200
               rounded-xl text-sm text-gray-900
               placeholder-gray-300 outline-none
               resize-none focus:border-primary
               focus:ring-2 focus:ring-primary/10
               transition-all"
      />

      <div class="flex items-center
                  justify-between gap-3">
        <span class="text-xs text-gray-400">
          {{ charCount }}/500
        </span>

        <div class="flex items-center gap-3">
          <!-- Option photo résolution -->
          <label
            v-if="reportStatus === 'resolu'"
            class="flex items-center gap-1.5
                   cursor-pointer"
          >
            <input
              v-model="isResolutionPhoto"
              type="checkbox"
              class="w-3.5 h-3.5 accent-primary"
            />
            <span class="text-xs text-gray-600">
              Photo de résolution
            </span>
          </label>

          <AppButton
            variant="primary"
            size="sm"
            icon="Send"
            :disabled="
              sending || !agentMessage.trim()
            "
            :loading="sending"
            @click="handleAgentSubmit"
          >
            Envoyer
          </AppButton>
        </div>
      </div>

      <!-- Upload photo résolution -->
      <div v-if="isResolutionPhoto" class="space-y-3">
        <!-- Input file caché -->
        <input
          ref="photoFileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handlePhotoSelected"
        />

        <!-- Prévisualisation si photo uploadée -->
        <div
          v-if="agentPhotoUrl"
          class="relative rounded-xl overflow-hidden
                 border border-gray-200"
        >
          <img
            :src="agentPhotoUrl"
            alt="Photo de résolution"
            class="w-full h-48 object-cover"
          />
          <button
            @click="removePhoto"
            class="absolute top-2 right-2 w-8 h-8
                   bg-red-500 text-white rounded-full
                   flex items-center justify-center
                   hover:bg-red-600 transition-colors"
          >
            <AppIcon name="X" :size="16" />
          </button>
        </div>

        <!-- Bouton upload -->
        <AppButton
          v-if="!agentPhotoUrl"
          variant="secondary"
          size="sm"
          icon="Camera"
          :loading="uploading"
          :disabled="uploading"
          block
          @click="triggerPhotoSelect"
        >
          {{ uploading ? 'Upload en cours...' : 'Ajouter une photo' }}
        </AppButton>

        <p class="text-xs text-gray-400">
          Photo de l'intervention terminée (max 5 MB)
        </p>
      </div>
    </div>

    <!-- Lightbox pour agrandir les photos -->
    <PhotoLightbox
      :open="lightboxOpen"
      :image-url="lightboxImageUrl"
      @close="closeLightbox"
    />

  </div>
</template>
