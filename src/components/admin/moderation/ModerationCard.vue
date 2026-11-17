<script setup lang="ts">
/**
 * Un signalement publié dans une commune sans mairie, tel qu'on le modère.
 *
 * Une carte **compacte**, en rangée : vignette à gauche, texte et gestes à
 * droite. La grille de grandes photos qu'elle remplace était lisible à quatre
 * cartes et ingérable à soixante — et sa photo débordait : un `<img h-full>`
 * dans une boîte à ratio laisse l'image imposer sa hauteur naturelle, si bien
 * que les photos portrait occupaient tout l'écran. La vignette est désormais
 * posée en absolu dans une boîte carrée, qui ne peut plus grandir.
 *
 * La photo reste ce qu'on vient chercher — une plaque, une devanture, un
 * visage — d'où la vignette cliquable : un clic l'agrandit, sans ouvrir de
 * fiche. Les trois gestes restent rangés du plus léger au plus lourd : retirer
 * la photo garde le signalement, son texte et le suivi de son auteur.
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
    class="flex gap-3 rounded-[12px] border bg-white p-2.5"
    :class="item.is_published ? 'border-line' : 'border-dashed border-neutral-300'"
  >
    <button
      type="button"
      class="relative h-[88px] w-[88px] flex-none overflow-hidden rounded-[8px] bg-neutral-100"
      :disabled="!item.photo_url"
      :aria-label="item.photo_url ? `Agrandir la photo : ${item.title}` : 'Aucune photo'"
      @click="emit('open')"
    >
      <img
        v-if="item.photo_url"
        :src="item.photo_url"
        :alt="item.title"
        class="absolute inset-0 h-full w-full object-cover"
        :class="{ 'opacity-45': !item.is_published }"
        loading="lazy"
      />
      <span v-else class="flex h-full items-center justify-center">
        <AppIcon name="ImageOff" :size="18" :stroke-width="1.6" class="text-neutral-400" />
      </span>
    </button>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-start gap-2">
        <span class="line-clamp-1 flex-1 text-[13px] font-semibold leading-[1.35] text-ink">
          {{ item.title }}
        </span>
        <!-- Retiré : dit à l'écran ce que la base dit, plutôt que de faire
             disparaître la carte et de laisser croire à une suppression. -->
        <span
          v-if="!item.is_published"
          class="flex-none rounded-full bg-status-danger-bg px-2 py-0.5 text-[10px] font-semibold text-status-danger"
        >
          Retiré du public
        </span>
      </div>

      <p class="truncate text-[11px] leading-[1.4] text-muted">
        {{ item.tenant.name }} · {{ categoryLabel(item.category) }} · {{ formatDate(item.created_at) }}
      </p>

      <p v-if="item.description" class="line-clamp-1 text-[11px] leading-[1.4] text-muted">
        {{ item.description }}
      </p>

      <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <button
          v-if="item.photo_url"
          type="button"
          :disabled="busy"
          class="rounded-ds border border-line px-2 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-neutral-100 disabled:opacity-50"
          @click="emit('removePhoto')"
        >
          Retirer la photo
        </button>

        <button
          v-if="item.is_published"
          type="button"
          :disabled="busy"
          class="rounded-ds border border-[#F3C9C9] bg-status-danger-bg px-2 py-1 text-[11px] font-semibold text-status-danger transition-colors hover:bg-[#F8DADA] disabled:opacity-50"
          @click="emit('retract')"
        >
          Dépublier
        </button>

        <button
          v-else
          type="button"
          :disabled="busy"
          class="rounded-ds border border-line px-2 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-neutral-100 disabled:opacity-50"
          @click="emit('restore')"
        >
          Republier
        </button>
      </div>
    </div>
  </article>
</template>
