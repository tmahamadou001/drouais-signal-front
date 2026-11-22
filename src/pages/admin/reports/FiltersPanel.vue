<script setup lang="ts">
/**
 * Le panneau des filtres : tout ce qui affine la liste sans mériter une place
 * permanente dans la barre.
 *
 * Quatre questions, chacune sur sa ligne et dans le même geste — des pastilles à
 * cocher, jamais un menu dans un menu : de quoi parle-t-on (catégorie), depuis
 * quand, d'où ça vient, et où en est l'échange avec l'habitant. Les catégories
 * deviennent cherchables au-delà de huit : une commune en a une douzaine, et
 * une plateforme nationale en aura davantage.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PERIODS } from '@/composables/useReportsList'

const props = defineProps<{
  category: string
  days: number
  source: '' | 'citizen' | 'agent'
  reply: string
  categories: { slug: string; label: string }[]
  repliedCount: number
  waitingCount: number
}>()

const emit = defineEmits<{
  'update:category': [value: string]
  'update:days': [value: number]
  'update:source': [value: '' | 'citizen' | 'agent']
  'update:reply': [value: string]
}>()

const search = ref('')
const SEARCH_FROM = 8

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const shown = computed(() => {
  const needle = normalize(search.value.trim())
  return needle ? props.categories.filter((c) => normalize(c.label).includes(needle)) : props.categories
})

const SOURCES = [
  { value: '' as const, label: 'Toutes' },
  { value: 'citizen' as const, label: 'Habitants' },
  { value: 'agent' as const, label: 'Saisis par la mairie' },
]

const chip = (active: boolean) =>
  active ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink hover:bg-canvas'
</script>

<template>
  <div class="flex max-h-[70vh] w-[min(420px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto p-4" data-testid="filters-panel">
    <section class="flex flex-col gap-2">
      <h3 class="text-[11px] font-semibold tracking-[0.08em] text-muted">CATÉGORIE</h3>
      <div v-if="categories.length >= SEARCH_FROM" class="relative">
        <AppIcon name="Search" :size="14" :stroke-width="1.75" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input v-model="search" type="search" placeholder="Chercher une catégorie" data-testid="category-search"
          class="h-9 w-full rounded-lg border border-line pl-8 pr-3 text-[13px] focus:border-brand-700 focus:outline-none">
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(category === '')" data-testid="category-all" @click="emit('update:category', '')">Toutes</button>
        <button
          v-for="item in shown" :key="item.slug"
          class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(category === item.slug)"
          :data-testid="`category-${item.slug}`" @click="emit('update:category', item.slug)"
        >
          {{ item.label }}
        </button>
        <p v-if="shown.length === 0" class="py-1 text-xs text-muted">Aucune catégorie ne correspond.</p>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-[11px] font-semibold tracking-[0.08em] text-muted">PÉRIODE</h3>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="period in PERIODS" :key="period.days"
          class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(days === period.days)"
          :data-testid="`period-${period.days}`" @click="emit('update:days', period.days)"
        >
          {{ period.label }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-[11px] font-semibold tracking-[0.08em] text-muted">ORIGINE</h3>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in SOURCES" :key="item.value || 'all'"
          class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(source === item.value)"
          :data-testid="`source-${item.value || 'all'}`" @click="emit('update:source', item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-[11px] font-semibold tracking-[0.08em] text-muted">ÉCHANGE AVEC L’HABITANT</h3>
      <div class="flex flex-wrap gap-1.5">
        <button class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(reply === '')" data-testid="reply-any" @click="emit('update:reply', '')">Tous</button>
        <button class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(reply === 'received')" data-testid="reply-received" @click="emit('update:reply', 'received')">
          Réponse reçue<span v-if="repliedCount" class="ml-1.5 tabular-nums text-muted">{{ repliedCount }}</span>
        </button>
        <button class="h-8 rounded-lg border px-3 text-[13px] font-semibold" :class="chip(reply === 'waiting')" data-testid="reply-waiting" @click="emit('update:reply', 'waiting')">
          Précision demandée<span v-if="waitingCount" class="ml-1.5 tabular-nums text-muted">{{ waitingCount }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
