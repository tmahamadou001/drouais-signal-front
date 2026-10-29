<script setup lang="ts">
/**
 * Choisir à qui envoyer, quand la catégorie ne le sait pas.
 *
 * Les suggestions viennent des deux endroits où une adresse de service existe
 * réellement : les catégories configurées, et les transmissions passées. Un
 * agent pense « la régie », pas « la table `tenant_categories` » — et retaper
 * une adresse de mémoire, c'est la retaper mal.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

export interface KnownRecipient {
  email: string
  serviceName: string | null
  source: string
}

const props = defineProps<{
  selected: string[]
  suggestions: KnownRecipient[]
  typed: string
  serviceName: string
  /** Les adresses connues sont en cours de chargement. */
  loading: boolean
}>()

const emit = defineEmits<{
  'update:typed': [value: string]
  'update:serviceName': [value: string]
  add: [email: string]
  remove: [email: string]
  pick: [item: KnownRecipient]
}>()

/** Les suggestions, moins celles déjà retenues. */
const offered = computed(() =>
  props.suggestions.filter((item) => !props.selected.includes(item.email))
)
</script>

<template>
  <div v-if="selected.length > 0" class="flex flex-wrap gap-2">
    <span
      v-for="email in selected"
      :key="email"
      class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-900"
    >
      {{ email }}
      <button :aria-label="`Retirer ${email}`" @click="emit('remove', email)">
        <AppIcon name="X" :size="13" :stroke-width="2" class="text-muted hover:text-ink" />
      </button>
    </span>
  </div>

  <div class="flex flex-col gap-2">
    <label for="transmit-email" class="text-xs font-semibold leading-none text-muted">
      ADRESSE DU SERVICE
    </label>
    <div class="flex gap-2">
      <input
        id="transmit-email"
        :value="typed"
        type="email"
        placeholder="regie.eclairage@mairie.fr"
        class="h-10 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
        @input="emit('update:typed', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('add', typed)"
      />
      <button
        class="flex h-10 flex-none items-center rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-canvas disabled:opacity-40"
        :disabled="!typed.trim()"
        @click="emit('add', typed)"
      >
        Ajouter
      </button>
    </div>
  </div>

  <!-- Ce que la commune connaît déjà.
       Le squelette occupe la place que les suggestions prendront : sans lui,
       le bloc apparaît d'un coup et pousse vers le bas le champ dans lequel
       l'agent est peut-être déjà en train de taper. -->
  <div v-if="loading" class="flex flex-col gap-2">
    <span class="text-xs font-semibold leading-none text-muted">DÉJÀ UTILISÉES</span>
    <div class="flex flex-col gap-1.5">
      <AppSkeleton v-for="row in 2" :key="row" class="h-[50px] rounded-[10px]" />
    </div>
  </div>

  <div v-else-if="offered.length > 0" class="flex flex-col gap-2">
    <span class="text-xs font-semibold leading-none text-muted">DÉJÀ UTILISÉES</span>
    <div class="flex flex-col gap-1.5">
      <button
        v-for="item in offered"
        :key="item.email"
        class="flex items-center gap-2.5 rounded-[10px] border border-line px-3 py-2 text-left transition-colors hover:bg-canvas"
        @click="emit('pick', item)"
      >
        <AppIcon name="Mail" :size="15" :stroke-width="1.75" class="flex-none text-muted" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[13px] font-medium leading-[1.3] text-ink">{{ item.email }}</div>
          <div class="truncate text-[11px] leading-[1.3] text-faint">
            {{ item.serviceName ? `${item.serviceName} · ` : '' }}{{ item.source }}
          </div>
        </div>
        <AppIcon name="Plus" :size="15" :stroke-width="2" class="flex-none text-brand-700" />
      </button>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <label for="transmit-service" class="text-xs font-semibold leading-none text-muted">
      NOM DU SERVICE (facultatif)
    </label>
    <input
      id="transmit-service"
      :value="serviceName"
      placeholder="Régie éclairage"
      class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
      @input="emit('update:serviceName', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
