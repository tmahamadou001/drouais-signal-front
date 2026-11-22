<script setup lang="ts">
/**
 * Un « i » qui explique ce qu'on lit : ce que mesure un chiffre, sur quoi il porte, comment
 * le lire. S'ouvre au survol, au focus clavier et au clic (le tactile n'a pas de survol), se
 * referme au clic ailleurs et sur Échap.
 *
 * Posé à côté du libellé, pas dessus : un chiffre sans sa définition ne dit pas s'il faut
 * s'inquiéter. `light` pour un fond sombre, `align` pour que la bulle ne sorte pas de l'écran.
 */
import { ref, useId } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useDismiss } from '@/composables/useDismiss'

const props = withDefaults(defineProps<{
  text: string
  /** Ce que la bulle introduit, en gras : le nom de l'indicateur. */
  title?: string
  align?: 'left' | 'right'
  tone?: 'dark' | 'light'
}>(), { align: 'left', tone: 'dark' })

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const side = ref<'left' | 'right'>(props.align)
const id = useId()

/** Largeur de la bulle (`w-64`) et marge à garder avec le bord de l'écran. */
const WIDTH = 256
const MARGIN = 16

/**
 * Le côté se décide **à l'ouverture**, d'après l'endroit où le « i » se trouve vraiment : une
 * carte de la dernière colonne ou une fenêtre étroite font sortir la bulle de l'écran, et aucune
 * liste de cartes écrite à la main ne suit un écran qui change de taille.
 */
function show() {
  if (root.value) {
    const box = root.value.getBoundingClientRect()
    const fitsRight = box.left + WIDTH <= window.innerWidth - MARGIN
    const fitsLeft = box.right - WIDTH >= MARGIN
    side.value = fitsRight ? (props.align === 'right' && fitsLeft ? 'right' : 'left') : fitsLeft ? 'right' : props.align
  }
  open.value = true
}

useDismiss(root, () => { open.value = false })
</script>

<template>
  <span ref="root" class="relative inline-flex" @mouseenter="show" @mouseleave="open = false">
    <button
      type="button"
      class="inline-flex h-4 w-4 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      :class="props.tone === 'light' ? 'text-brand-500 hover:text-white' : 'text-neutral-400 hover:text-brand-900'"
      :aria-label="props.title ? `Comment lire : ${props.title}` : 'Comment lire ce chiffre'"
      :aria-expanded="open"
      :aria-describedby="open ? id : undefined"
      @click.stop="show"
      @focus="show"
      @blur="open = false"
    >
      <AppIcon name="Info" :size="14" :stroke-width="2" />
    </button>

    <span
      v-if="open"
      :id="id"
      role="tooltip"
      class="absolute top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] whitespace-normal rounded-xl border border-line bg-white p-3 text-left text-xs font-normal normal-case leading-[1.5] tracking-normal text-ink shadow-lg"
      :class="side === 'right' ? 'right-0' : 'left-0'"
    >
      <span v-if="props.title" class="mb-1 block text-xs font-bold text-brand-900">{{ props.title }}</span>
      {{ props.text }}
    </span>
  </span>
</template>
