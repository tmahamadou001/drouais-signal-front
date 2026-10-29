<script setup lang="ts">
/**
 * La fiche : ce qu'est le signalement, et où il en est.
 *
 * C'est la vue par défaut, et la seule dont le contenu **ne grandit jamais** —
 * elle tient dans un écran quel que soit l'âge du signalement. C'est ce qui
 * justifiait de la séparer du journal et de la conversation.
 *
 * ── L'agencement ───────────────────────────────────────────────────────────
 *
 * **L'identité en deux colonnes**, puis une pile pleine largeur : suivi,
 * description, carte.
 *
 * La vignette de la photo tient à gauche de l'état, du titre et des faits.
 * C'est plus serré qu'un bandeau, et rien n'y est perdu : la photo s'agrandit
 * au clic, donc elle n'a pas besoin de la largeur pour être consultable — et
 * la place ainsi gagnée fait tenir l'identité entière au-dessus de la ligne de
 * flottaison, ce qu'aucune version en pile n'arrivait à faire.
 *
 * Les trois blocs du bas, eux, prennent toute la largeur : ils n'ont pas de
 * voisin naturel, et la partager les rendait tous plus petits sans rien
 * rapprocher.
 *
 * La carte en dernier parce que c'est le seul bloc dont on peut se passer :
 * l'adresse est déjà dans les faits, et un agent ne descend jusqu'ici que s'il
 * compte s'y rendre. Elle y gagne d'être enfin lisible — 220 px de haut sur
 * toute la largeur, au lieu d'une vignette où le marqueur touchait les bords.
 */
import type { Report, StatusHistoryEntry } from '@/types'
import ReportHeadline from '@/components/admin/report-detail/ReportHeadline.vue'
import ReportPhoto from '@/components/admin/report-detail/ReportPhoto.vue'
import ReportFacts from '@/components/admin/report-detail/ReportFacts.vue'
import ReportLocation from '@/components/admin/report-detail/ReportLocation.vue'
import ReportStatusTrail from '@/components/admin/report-detail/ReportStatusTrail.vue'

defineProps<{
  report: Report
  history: StatusHistoryEntry[]
  categoryLabel: string
  slaHours: number
  deadline: Date | null
  overdue: boolean
  overdueDays: number
  contact: { channel: 'account' | 'email' | 'none'; reachable: boolean } | null
  unreachable: boolean
}>()

const emit = defineEmits<{ zoom: [url: string] }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- L'identité : la vignette, puis l'état, le titre et les faits. -->
    <div class="flex gap-4">
      <ReportPhoto
        :photo-url="report.photo_url"
        :alt="report.title"
        @zoom="emit('zoom', $event)"
      />

      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <ReportHeadline :report="report" :overdue="overdue" :overdue-days="overdueDays" />

        <ReportFacts
          :category-slug="report.category"
          :category-label="categoryLabel"
          :address="report.address_approx"
          :sla-hours="slaHours"
          :deadline="deadline"
          :overdue="overdue"
          :vote-count="report.vote_count || 0"
          :contact="contact"
        />
      </div>
    </div>

    <ReportStatusTrail :report="report" :history="history" :overdue="overdue" />

    <div class="flex flex-col gap-[7px]">
      <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
        DESCRIPTION DE L’HABITANT
      </span>
      <p v-if="report.description" class="text-sm leading-[1.55] text-ink">
        {{ report.description }}
      </p>
      <p v-else class="text-sm leading-[1.55] text-faint">
        Aucune description — la photo et la position font le signalement.
      </p>
    </div>

    <div class="flex flex-col gap-[7px]">
      <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
        LOCALISATION
      </span>
      <ReportLocation
        :lat="report.lat"
        :lng="report.lng"
        :category="report.category"
        :address="report.address_approx"
      />
    </div>
  </div>
</template>
