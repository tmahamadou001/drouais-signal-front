<script setup lang="ts">
/**
 * Un champ des écrans d'authentification : intitulé, icône, saisie.
 *
 * Il existe parce que la maquette pose une bordure de 2 px sur le champ actif
 * et de 1 px sinon. Avec une bordure qui change d'épaisseur, le contenu se
 * déplace d'un pixel au focus — sauf à gérer le décalage de padding, ce que ce
 * composant fait une fois pour les trois champs de l'authentification.
 */
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  label: string
  icon: string
  type: string
  modelValue: string
  placeholder?: string
  autocomplete?: string
  id: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()

const focused = ref(false)
</script>

<template>
  <div class="flex flex-col gap-[7px]">
    <div class="flex items-baseline justify-between gap-2.5">
      <label :for="id" class="whitespace-nowrap text-xs font-semibold leading-none tracking-[0.02em] text-muted">
        {{ label }}
      </label>
      <slot name="aside" />
    </div>

    <div
      class="flex h-[46px] items-center gap-2.5 rounded-[10px] bg-white transition-colors"
      :class="focused ? 'border-2 border-brand-700 px-[13px]' : 'border border-line px-[14px]'"
    >
      <AppIcon :name="icon" :size="17" :stroke-width="1.75" class="flex-none text-muted" />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        required
        class="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="focused = true"
        @blur="focused = false"
      />
      <slot name="trailing" />
    </div>
  </div>
</template>
