<script setup lang="ts">
/**
 * Ouvrir une commune au public, ou la refermer.
 *
 * Cette confirmation est volontairement désagréable à passer. Ouvrir rend
 * visible de tous ce qu'une commune avait reçu en silence, et le geste ne se
 * défait pas vraiment : refermer la page ne fait pas oublier ce que la mairie,
 * la presse locale ou un habitant auront vu. Le nom de la commune est donc à
 * recopier, comme pour une suppression.
 *
 * Elle dit trois choses, dans cet ordre : ce qui devient public, en chiffres ;
 * ce que ça implique, c'est-à-dire que personne sur place ne modère ; puis les
 * objections que les chiffres soulèvent. Les objections ne bloquent rien —
 * elles existent pour que la décision soit prise en les ayant lues.
 */
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { confirms, openingConcerns, type Commune } from '@/lib/communePipeline'

const props = defineProps<{
  commune: Commune | null
  /** `true` pour ouvrir, `false` pour refermer. */
  opening: boolean
  loading?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const typed = ref('')

// Un nom recopié pour une commune ne vaut pas pour la suivante.
watch(() => props.commune?.id, () => { typed.value = '' })

const concerns = computed(() =>
  props.commune && props.opening ? openingConcerns(props.commune) : []
)

const unlocked = computed(() =>
  !!props.commune && confirms(typed.value, props.commune.name)
)
</script>

<template>
  <AppModal
    v-if="commune"
    :open="true"
    :title="opening ? `Ouvrir ${commune.name} au public` : `Refermer ${commune.name}`"
    :confirm-text="opening ? 'Ouvrir au public' : 'Refermer'"
    :confirm-variant="opening ? 'warning' : 'danger'"
    :loading="loading"
    @confirm="unlocked && emit('confirm')"
    @cancel="emit('cancel')"
    @close="emit('cancel')"
  >
    <div class="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-neutral-700">
      <p v-if="opening">
        <strong class="font-semibold text-dark">{{ commune.report_count }} signalement{{ commune.report_count > 1 ? 's' : '' }}</strong>
        et
        <strong class="font-semibold text-dark">{{ commune.with_photo_count }} photo{{ commune.with_photo_count > 1 ? 's' : '' }}</strong>
        déposés depuis {{ new Date(commune.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }}
        deviendront visibles de tous, sur le web et dans l’application.
      </p>
      <p v-else>
        Les <strong class="font-semibold text-dark">{{ commune.report_count }} signalement{{ commune.report_count > 1 ? 's' : '' }}</strong>
        de cette commune sortiront des listes, de la carte et de la recherche. Ils resteront
        visibles de leurs auteurs, et rien n’est supprimé.
      </p>

      <p v-if="opening" class="rounded-ds bg-neutral-50 px-3 py-2.5 text-[13px]">
        Aucun agent de cette commune ne peut modérer ce qui s’y publie : vous seul pourrez
        retirer un contenu. <strong class="font-semibold text-dark">Refermer la page ne fera pas
        disparaître ce qui aura été vu.</strong>
      </p>

      <ul v-if="concerns.length > 0" class="flex flex-col gap-2">
        <li
          v-for="concern in concerns"
          :key="concern"
          class="flex items-start gap-2 rounded-ds bg-status-pending-bg px-3 py-2 text-[13px] text-status-pending-fg"
        >
          <AppIcon name="TriangleAlert" :size="15" :stroke-width="1.9" class="mt-0.5 flex-none" />
          <span>{{ concern }}</span>
        </li>
      </ul>

      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-neutral-700">
          Saisissez <strong class="font-semibold text-dark">{{ commune.name }}</strong> pour confirmer
        </span>
        <input
          v-model="typed"
          type="text"
          autocomplete="off"
          class="rounded-ds border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary"
          :placeholder="commune.name"
        />
      </label>

      <p v-if="!unlocked" class="text-xs text-muted">
        Le bouton reste sans effet tant que le nom ne correspond pas.
      </p>
    </div>
  </AppModal>
</template>
