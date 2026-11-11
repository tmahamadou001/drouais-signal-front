<script setup lang="ts">
/**
 * Ce qu'on sait d'une commune sans mairie, déplié sous sa ligne.
 *
 * Le tableau garde cinq colonnes lisibles ; tout le reste est ici. Ces chiffres
 * servent à deux conversations différentes, et c'est pour ça qu'ils sont
 * ensemble : celle qu'on aura avec le maire — combien de ses administrés, sur
 * quels sujets — et celle qu'on a avec soi-même avant d'ouvrir la commune au
 * public : ce fonds est-il vivant, et vaut-il une page.
 *
 * « Au plus N habitants » est volontairement prudent : les dépôts sans compte
 * ne se dédoublonnent pas, deux d'entre eux peuvent venir de la même personne.
 * Un chiffre faux présenté à un maire est la pire façon de perdre un rendez-vous.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { photoRate, daysSinceLastReport, type Commune } from '@/lib/communePipeline'
import { categoryLabel } from '@/lib/categories'

const props = defineProps<{ commune: Commune }>()

const silence = computed(() => daysSinceLastReport(props.commune))
const photos = computed(() => photoRate(props.commune))

const figures = computed(() => [
  {
    label: 'Sur 30 jours',
    value: String(props.commune.report_count_30d),
    hint: props.commune.report_count_30d === 0 ? 'rien de récent' : 'signalements',
  },
  {
    label: 'Dernier dépôt',
    value: silence.value === null ? '—' : silence.value === 0 ? "aujourd'hui" : `il y a ${silence.value} j`,
    hint: '',
  },
  {
    label: 'Habitants',
    value: `≤ ${props.commune.account_count + props.commune.anonymous_count}`,
    hint: `${props.commune.account_count} compte${props.commune.account_count > 1 ? 's' : ''} · ${props.commune.anonymous_count} sans compte`,
  },
  {
    label: 'Avec photo',
    value: photos.value === null ? '—' : `${photos.value} %`,
    hint: `${props.commune.with_photo_count} signalement${props.commune.with_photo_count > 1 ? 's' : ''}`,
  },
  {
    label: 'Constats sur place',
    value: String(props.commune.confirmation_count),
    hint: 'confirmations',
  },
])
</script>

<template>
  <div class="flex flex-col gap-4 bg-neutral-50 px-5 py-4">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div
        v-for="figure in figures"
        :key="figure.label"
        class="flex flex-col gap-1 rounded-[12px] border border-line bg-white px-3.5 py-3"
      >
        <span class="text-[11px] font-semibold tracking-[0.06em] text-muted">
          {{ figure.label.toUpperCase() }}
        </span>
        <span class="text-lg font-bold leading-none tabular-nums text-ink">{{ figure.value }}</span>
        <span v-if="figure.hint" class="text-[11px] leading-tight text-faint">{{ figure.hint }}</span>
      </div>
    </div>

    <div v-if="commune.top_categories.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="text-[11px] font-semibold tracking-[0.06em] text-muted">CE DONT ILS PARLENT</span>
      <span
        v-for="entry in commune.top_categories"
        :key="entry.category"
        class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line"
      >
        {{ categoryLabel(entry.category) }} · {{ entry.count }}
      </span>
    </div>

    <p v-if="commune.published_at" class="flex items-center gap-1.5 text-xs text-muted">
      <AppIcon name="Eye" :size="14" :stroke-width="1.8" />
      Ouverte au public le
      {{ new Date(commune.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
    </p>
  </div>
</template>
