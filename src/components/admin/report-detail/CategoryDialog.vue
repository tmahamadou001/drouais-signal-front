<script setup lang="ts">
/**
 * Corriger la catégorie : l'IA ou l'habitant s'est trompé.
 *
 * La catégorie décide du délai et de l'aiguillage — le dialogue le dit, pour que
 * l'agent sache que l'échéance va bouger.
 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTenantCategories } from '@/composables/useTenantCategories'

const props = defineProps<{ open: boolean; current: string; saving: boolean }>()
const emit = defineEmits<{ close: []; submit: [category: string] }>()

const { categories } = useTenantCategories()
const chosen = ref('')

watch(() => props.open, (open) => { if (open) chosen.value = props.current }, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="font-ui fixed inset-0 z-[80] flex items-center justify-center p-4" @keydown.esc="emit('close')">
      <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

      <form class="relative flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg" data-testid="category-dialog" @submit.prevent="chosen !== current && emit('submit', chosen)">
        <header class="flex items-start gap-3 border-b border-line px-5 py-4">
          <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
            <AppIcon name="Tag" :size="18" :stroke-width="1.75" class="text-brand-700" />
          </div>
          <div>
            <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Corriger la catégorie</h2>
            <p class="mt-0.5 text-xs leading-[1.4] text-muted">Le délai suit la nouvelle catégorie. Un signalement que personne n’a encore suit son aiguillage.</p>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-5 py-4">
          <button
            v-for="category in categories" :key="category.slug" type="button" role="radio" :aria-checked="chosen === category.slug"
            class="flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors"
            :class="chosen === category.slug ? 'border-brand-700 bg-brand-50 text-brand-900' : 'border-line text-ink hover:bg-canvas'"
            :data-testid="`category-${category.slug}`" @click="chosen = category.slug"
          >
            {{ category.label }}
            <span v-if="category.slug === current" class="text-[11px] font-medium text-muted">actuelle</span>
          </button>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" class="h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="emit('close')">Fermer</button>
          <button
            type="submit" :disabled="saving || chosen === current" data-testid="category-submit"
            class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Corriger
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
