<script setup lang="ts">
/**
 * Le rôle choisi par cartes décrites, et non par une liste déroulante.
 *
 * « Agent » ne dit rien à un secrétaire de mairie qui invite son collègue ;
 * « traite les signalements, ne touche pas aux réglages » lui fait choisir
 * juste du premier coup. C'est l'information qui manquait — le `<select>`
 * offrait trois mots sans conséquence visible, et le rôle se corrigeait
 * ensuite, ou jamais.
 */
import AppIcon from '@/components/AppIcon.vue'
import { ASSIGNABLE_ROLES, ROLES, type TeamRole } from '@/lib/roles'

defineProps<{ modelValue: TeamRole }>()

defineEmits<{ 'update:modelValue': [role: TeamRole] }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-xs font-semibold leading-none text-muted">RÔLE</span>

    <button
      v-for="role in ASSIGNABLE_ROLES"
      :key="role"
      type="button"
      class="flex items-start gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-colors"
      :class="modelValue === role
        ? 'border-brand-700 bg-brand-50'
        : 'border-line bg-white hover:bg-canvas'"
      @click="$emit('update:modelValue', role)"
    >
      <div
        class="mt-px flex h-8 w-8 flex-none items-center justify-center rounded-[9px]"
        :class="ROLES[role].classes"
      >
        <AppIcon :name="ROLES[role].icon" :size="16" :stroke-width="1.75" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="text-[13px] font-semibold leading-[1.3] text-ink">{{ ROLES[role].label }}</div>
        <div class="mt-0.5 text-xs leading-[1.45] text-muted">{{ ROLES[role].summary }}</div>
      </div>

      <AppIcon
        v-if="modelValue === role"
        name="CircleCheck" :size="17" :stroke-width="2"
        class="mt-0.5 flex-none text-brand-700"
      />
    </button>
  </div>
</template>
