<script setup lang="ts">
/**
 * La photo, facultative.
 *
 * C'est la différence de fond avec le dépôt citoyen, où la photo ouvre le
 * parcours et alimente l'analyse automatique. Un agent qui saisit un appel
 * téléphonique n'en a pas, et n'en aura jamais : l'exiger reviendrait à
 * interdire la saisie du cas le plus courant.
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ photo: File | null }>()
const emit = defineEmits<{ (e: 'update:photo', value: File | null): void }>()

const input = ref<HTMLInputElement | null>(null)
const preview = ref<string | null>(null)

// L'URL d'objet est révoquée à chaque remplacement : sans ça, chaque photo
// essayée reste en mémoire jusqu'au rechargement de la page.
watch(
  () => props.photo,
  (file) => {
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = file ? URL.createObjectURL(file) : null
  },
  { immediate: true }
)

const sizeLabel = computed(() =>
  props.photo ? `${(props.photo.size / 1024 / 1024).toFixed(1)} Mo` : ''
)

function pick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  emit('update:photo', file)
}

function clear() {
  emit('update:photo', null)
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div>
    <input ref="input" type="file" accept="image/*" class="hidden" @change="pick" />

    <button
      v-if="!photo"
      type="button"
      class="flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line bg-white transition-colors hover:bg-canvas"
      @click="input?.click()"
    >
      <AppIcon name="ImagePlus" :size="15" class="text-muted" />
      <span class="text-[13px] font-medium text-muted">Ajouter une photo</span>
    </button>

    <div v-else class="flex items-center gap-3 rounded-[10px] border border-line bg-white p-2.5">
      <img :src="preview ?? ''" alt="" class="h-12 w-12 flex-none rounded-lg object-cover" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-[13px] font-medium text-ink">{{ photo.name }}</p>
        <p class="text-[11px] text-muted">{{ sizeLabel }}</p>
      </div>
      <button
        type="button"
        class="flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors hover:bg-canvas"
        aria-label="Retirer la photo"
        @click="clear"
      >
        <AppIcon name="X" :size="15" class="text-muted" />
      </button>
    </div>
  </div>
</template>
