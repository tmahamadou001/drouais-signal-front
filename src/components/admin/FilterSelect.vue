<script setup lang="ts">
/**
 * Le sélecteur des barres d'en-tête : icône, libellé courant, chevron, menu.
 *
 * Cinq exemplaires dans la maquette (période, catégorie, statut…) pour un seul
 * comportement. Un `<select>` natif ne suffisait pas — le design impose la
 * hauteur de 38 px, l'icône de tête et le chevron, qu'aucun navigateur ne laisse
 * styler de la même façon.
 *
 * Il se ferme au clic extérieur, capté sur le document : une page
 * d'administration a plusieurs de ces menus, et `blur` les laisserait ouverts
 * dès qu'on clique sur le suivant.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

export interface FilterOption<T = string> {
  value: T
  label: string
}

const props = defineProps<{
  modelValue: string | number
  options: FilterOption<string | number>[]
  /** Nom d'icône lucide affiché à gauche du libellé. */
  icon: string
  /** Largeur du menu déroulant. Défaut : celle du bouton. */
  menuWidth?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const currentLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label ?? '—'
)

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

function select(value: string | number) {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <div ref="root" class="relative flex-none">
    <button
      class="flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-white px-3 transition-colors hover:bg-canvas"
      @click="open = !open"
    >
      <AppIcon :name="icon" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
      <span class="whitespace-nowrap text-[13px] font-medium leading-none text-ink">{{ currentLabel }}</span>
      <AppIcon name="ChevronDown" :size="15" :stroke-width="2" class="flex-none text-muted" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-[42px] z-30 max-h-72 overflow-y-auto rounded-[10px] border border-line bg-white py-1 shadow-lg"
      :style="{ minWidth: menuWidth ?? '100%' }"
    >
      <button
        v-for="option in options"
        :key="String(option.value)"
        class="flex w-full whitespace-nowrap px-3 py-2 text-left text-[13px] hover:bg-canvas"
        :class="option.value === modelValue ? 'font-semibold text-brand-700' : 'text-ink'"
        @click="select(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
