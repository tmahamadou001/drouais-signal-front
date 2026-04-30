<script setup lang="ts">
import type { Report } from '@/types'
import { useTenantCategories } from '@/composables/useTenantCategories'
import CategoryIcon from '@/components/CategoryIcon.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'
import MapView from '@/components/MapView.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import ReportComments from '@/components/report/ReportComments.vue'

interface Props {
  open: boolean
  report: Report | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  close: []
  updateStatus: [reportId: string, status: 'en_attente' | 'pris_en_charge' | 'resolu']
}>()

const { getCategoryLabel } = useTenantCategories()

const handleUpdateStatus = (status: 'en_attente' | 'pris_en_charge' | 'resolu') => {
  if (props.report) {
    emit('updateStatus', props.report.id, status)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slideover">
      <div v-if="open && report" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-dark/30" @click="$emit('close')" />

        <div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 class="font-semibold text-dark">Détail du signalement</h2>
            <button
              @click="$emit('close')"
              class="w-8 h-8 rounded-ds flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <AppIcon name="X" :size="20" />
            </button>
          </div>

          <div class="p-6 space-y-6">
            <img
              v-if="report.photo_url"
              :src="report.photo_url"
              class="w-full h-48 object-cover rounded-ds-lg"
              :alt="report.title"
            />

            <div>
              <div class="flex items-start gap-3">
                <CategoryIcon :category="report.category" size="lg" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-bold text-dark">{{ report.title }}</h3>
                    <span
                      v-if="report.ai_assisted"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold"
                      title="Signalement créé avec l'aide de l'IA"
                    >
                      ✨ IA
                    </span>
                  </div>
                  <p class="text-sm text-neutral-500 mt-0.5">
                    {{ getCategoryLabel(report.category) }}
                  </p>
                  <p v-if="report.address_approx" class="text-sm text-neutral-500">
                    {{ report.address_approx }}
                  </p>
                </div>
              </div>

              <div v-if="(report.vote_count || 0) > 0" class="mt-4 flex items-center gap-2">
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                  <span>▲</span>
                  <span>{{ report.vote_count }} citoyen{{ report.vote_count > 1 ? 's ont' : ' a' }} signalé ce problème</span>
                </div>
                <span
                  v-if="report.vote_count >= 5"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
                >
                  🔥 Populaire
                </span>
              </div>

              <p v-if="report.description" class="text-sm text-neutral-600 mt-4 leading-relaxed">
                {{ report.description }}
              </p>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-dark mb-3">Suivi</h4>
              <StatusTimeline :current-status="report.status" />
            </div>

            <!-- Messages -->
            <div class="border-t border-neutral-200 pt-4">
              <ReportComments
                :report-id="report.id"
                :report-status="report.status"
                :report-photo-url="report.photo_url"
                mode="agent"
              />
            </div>

            <div class="border-t border-neutral-200 pt-2 space-y-3">
              <div class="h-[250px] rounded-ds-lg overflow-hidden border border-neutral-200">
                <MapView
                  :center="[report.lat, report.lng]"
                  :zoom="16"
                  :selected-position="{ lat: report.lat, lng: report.lng, category: report.category }"
                />
              </div>
            </div>

            <div class="border-t border-neutral-200 pt-2 space-y-3">
              <AppButton
                v-if="report.status === 'en_attente'"
                variant="warning"
                :disabled="loading"
                :loading="loading"
                block
                @click="handleUpdateStatus('pris_en_charge')"
              >
                Prendre en charge
              </AppButton>
              <AppButton
                v-if="report.status === 'pris_en_charge'"
                variant="success"
                :disabled="loading"
                :loading="loading"
                block
                @click="handleUpdateStatus('resolu')"
              >
                Marquer résolu
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slideover-enter-active,
.slideover-leave-active {
  transition: all 0.3s ease;
}
.slideover-enter-active > div:last-child,
.slideover-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.slideover-enter-from,
.slideover-leave-to {
  opacity: 0;
}
.slideover-enter-from > div:last-child,
.slideover-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
