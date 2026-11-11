<script setup lang="ts">
/**
 * Un signalement publié dans une commune sans mairie, tel qu'on le modère.
 *
 * La photo est grande, et c'est le point : neuf fois sur dix, ce qui pose
 * problème est dedans — une plaque d'immatriculation, une devanture, un
 * visage. Une vignette obligerait à ouvrir chaque fiche pour voir ce qu'on
 * publie, et personne ne le ferait.
 *
 * Les trois gestes sont rangés du plus léger au plus lourd, et le plus léger
 * est le plus à portée : retirer la photo garde le signalement, son texte et
 * le suivi de son auteur. Supprimer tout un signalement pour une plaque
 * visible détruirait une information publique utile pour un détail réparable.
 */
import AppIcon from '@/components/AppIcon.vue'
import { categoryLabel } from '@/lib/categories'
import type { ModerationItem } from '@/lib/moderation'

defineProps<{ item: ModerationItem; busy?: boolean }>()

const emit = defineEmits<{
  retract: []
  restore: []
  removePhoto: []
  open: []
}>()

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>

<template>
  <article
    class="flex flex-col overflow-hidden rounded-[14px] border bg-white"
    :class="item.is_published ? 'border-line' : 'border-dashed border-neutral-300'"
  >
    <div class="relative aspect-[4/3] bg-neutral-100">
      <img
        v-if="item.photo_url"
        :src="item.photo_url"
        :alt="item.title"
        class="h-full w-full object-cover"
        :class="{ 'opacity-45': !item.is_published }"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center">
        <AppIcon name="ImageOff" :size="22" :stroke-width="1.6" class="text-neutral-400" />
      </div>

      <!-- Retiré : dit à l'écran ce que la base dit, plutôt que de faire
           disparaître la carte et de laisser croire à une suppression. -->
      <span
        v-if="!item.is_published"
        class="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-status-danger"
      >
        Retiré du public
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-3.5">
      <div class="flex items-start justify-between gap-2">
        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          @click="emit('open')"
        >
          <span class="line-clamp-2 text-sm font-semibold leading-[1.35] text-ink">{{ item.title }}</span>
        </button>
      </div>

      <p class="text-xs leading-[1.4] text-muted">
        {{ item.tenant.name }} · {{ categoryLabel(item.category) }} · {{ formatDate(item.created_at) }}
      </p>

      <p v-if="item.description" class="line-clamp-2 text-xs leading-[1.5] text-muted">
        {{ item.description }}
      </p>

      <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5">
        <button
          v-if="item.photo_url"
          type="button"
          :disabled="busy"
          class="rounded-ds border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-100 disabled:opacity-50"
          @click="emit('removePhoto')"
        >
          Retirer la photo
        </button>

        <button
          v-if="item.is_published"
          type="button"
          :disabled="busy"
          class="rounded-ds border border-[#F3C9C9] bg-status-danger-bg px-2.5 py-1.5 text-xs font-semibold text-status-danger transition-colors hover:bg-[#F8DADA] disabled:opacity-50"
          @click="emit('retract')"
        >
          Dépublier
        </button>

        <button
          v-else
          type="button"
          :disabled="busy"
          class="rounded-ds border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-100 disabled:opacity-50"
          @click="emit('restore')"
        >
          Republier
        </button>
      </div>
    </div>
  </article>
</template>
