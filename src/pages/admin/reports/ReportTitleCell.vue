<script setup lang="ts">
/**
 * La première colonne : ce qu'il faut savoir d'une ligne sans l'ouvrir.
 *
 * Le titre, et à côté seulement ce qui appelle une décision — le retard, les
 * messages non lus, la catégorisation automatique. L'adresse en dessous, parce
 * qu'elle situe sans presser.
 */
import type { Report } from '@/types'
import AppIcon from '@/components/AppIcon.vue'
import CategoryGlyph from '@/components/admin/CategoryGlyph.vue'

defineProps<{
  report: Report
  categoryLabel: string
  overdue: boolean
  unread: number
}>()
</script>

<template>
  <div class="flex min-w-0 items-center gap-[11px]">
    <CategoryGlyph :category="report.category" :label="categoryLabel" />
    <div class="min-w-0">
      <div class="flex items-center gap-[7px]">
        <span class="truncate text-sm font-semibold leading-[1.3] text-ink">{{ report.title }}</span>
        <span
          v-if="overdue"
          class="flex-none rounded-md bg-status-danger-bg px-1.5 py-[3px] text-[11px] font-semibold leading-none text-status-danger"
        >
          En retard
        </span>
        <span
          v-if="unread"
          class="flex flex-none items-center gap-1 rounded-md bg-brand-700 px-1.5 py-[3px] text-[11px] font-semibold leading-none text-white"
          title="Nouveaux messages"
        >
          <AppIcon name="MessageCircle" :size="11" />
          {{ unread }}
        </span>
        <!-- Saisi par la commune : sans ce repère, l'agent ouvre la fiche pour
             comprendre pourquoi il ne peut pas écrire à l'habitant. -->
        <span
          v-if="report.source === 'agent'"
          class="flex flex-none items-center gap-1 rounded-md bg-canvas px-1.5 py-[3px] text-[11px] font-semibold leading-none text-muted"
          title="Saisi depuis le back-office"
        >
          <AppIcon name="Landmark" :size="11" />
          Mairie
        </span>
        <span
          v-if="report.ai_assisted"
          class="flex-none rounded-md bg-brand-50 px-1.5 py-[3px] text-[11px] font-semibold leading-none text-brand-700"
          title="Catégorisé par l’IA"
        >
          IA
        </span>
      </div>
      <div class="truncate text-xs leading-[1.3] text-muted">
        {{ report.address_approx || '—' }}
      </div>
    </div>
  </div>
</template>
