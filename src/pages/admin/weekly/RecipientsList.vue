<script setup lang="ts">
/**
 * À qui la synthèse part chaque semaine.
 *
 * Une liste plutôt qu'une table : trois à dix lignes, deux informations
 * chacune. Une `DataTable` avec ses en-têtes de colonnes et sa pagination
 * pèserait plus lourd que ce qu'elle porterait.
 */
import AppIcon from '@/components/AppIcon.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { recipientRoleInfo } from '@/lib/recipientRoles'
import type { Recipient } from '@/composables/useWeeklyReport'

defineProps<{
  recipients: Recipient[]
  loading: boolean
  /** Seul un administrateur décide à qui la commune écrit. */
  canEdit: boolean
}>()

const emit = defineEmits<{ add: []; remove: [recipient: Recipient] }>()
</script>

<template>
  <section class="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-line bg-white">
    <header class="flex flex-none items-center gap-3 border-b border-line px-[18px] py-3.5">
      <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
        DESTINATAIRES
      </span>
      <span class="text-[11px] font-medium leading-none tabular-nums text-faint">
        {{ recipients.filter((one) => one.is_active).length }} actif{{ recipients.filter((one) => one.is_active).length > 1 ? 's' : '' }}
      </span>

      <button
        v-if="canEdit"
        class="ml-auto flex h-8 flex-none items-center gap-[7px] rounded-lg border border-line bg-white px-[11px] text-xs font-semibold leading-none text-brand-700 transition-colors hover:bg-brand-50"
        @click="emit('add')"
      >
        <AppIcon name="Plus" :size="14" :stroke-width="2" />
        Ajouter
      </button>
    </header>

    <div v-if="loading" class="flex flex-col gap-px bg-hairline">
      <div v-for="row in 3" :key="row" class="flex h-[62px] flex-col justify-center gap-2 bg-white px-[18px]">
        <AppSkeleton class="h-3 w-40 rounded" />
        <AppSkeleton class="h-2.5 w-56 rounded" />
      </div>
    </div>

    <p
      v-else-if="recipients.length === 0"
      class="px-[18px] py-10 text-center text-sm text-muted"
    >
      Aucun destinataire. Tant que cette liste est vide, la synthèse est calculée mais n’est envoyée à personne.
    </p>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-for="recipient in recipients"
        :key="recipient.id"
        class="flex items-center gap-[11px] border-b border-hairline px-[18px] py-3 last:border-0"
        :class="recipient.is_active ? '' : 'opacity-50'"
      >
        <div
          class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold"
          :class="recipientRoleInfo(recipient.role).classes"
        >
          {{ recipient.name.charAt(0).toUpperCase() }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ recipient.name }}</div>
          <div class="truncate text-xs leading-[1.3] text-muted">{{ recipient.email }}</div>
        </div>

        <span
          class="flex-none whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
          :class="recipientRoleInfo(recipient.role).classes"
        >
          {{ recipientRoleInfo(recipient.role).label }}
        </span>

        <button
          v-if="canEdit && recipient.is_active"
          class="group flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-status-danger-bg transition-colors hover:bg-status-danger"
          title="Retirer ce destinataire"
          @click="emit('remove', recipient)"
        >
          <AppIcon
            name="X" :size="15" :stroke-width="2"
            class="text-status-danger transition-colors group-hover:text-white"
          />
        </button>
        <span v-else class="h-[30px] w-[30px] flex-none" />
      </div>
    </div>
  </section>
</template>
