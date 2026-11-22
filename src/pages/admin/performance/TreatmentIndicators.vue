<script setup lang="ts">
/**
 * Les indicateurs de traitement : où en est le travail, et où il coince.
 *
 * Elle complète les quatre chiffres de tête — qui disent la **moyenne** — par ce
 * que la moyenne cache : la médiane (un seul signalement oublié six mois ne la
 * fausse pas), le neuvième décile (« neuf sur dix sont résolus en… »), et les
 * files qui attendent quelqu'un. Chaque tuile dit ce qu'elle compte sous son
 * chiffre : un nombre sans sa référence ne dit pas s'il faut s'inquiéter.
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import InfoTip from '@/components/InfoTip.vue'
import { formatDelay } from '@/lib/delays'
import type { TreatmentIndicators } from '@/composables/useTreatmentStats'

const props = defineProps<{ indicators: TreatmentIndicators }>()

interface Tile { key: string; label: string; icon: string; value: string; hint: string; tone: 'alert' | 'ok' | 'neutral'; info: string }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

const tiles = computed<Tile[]>(() => {
  const i = props.indicators
  return [
    {
      key: 'open', label: 'À TRAITER', icon: 'Inbox', value: String(i.open_count),
      hint: i.overdue_count > 0 ? `dont ${i.overdue_count} en retard` : 'aucun en retard',
      tone: i.overdue_count > 0 ? 'alert' : 'ok',
      info: 'Signalements encore ouverts : ni résolus, ni annulés, ni classés indésirables. « En retard » : ouverts depuis plus longtemps que le délai fixé pour leur catégorie.',
    },
    {
      key: 'unassigned', label: 'À ASSIGNER', icon: 'UserPlus', value: String(i.unassigned_count),
      hint: i.unassigned_count > 0 ? 'personne ne les a encore' : 'tout est confié',
      tone: i.unassigned_count > 0 ? 'alert' : 'ok',
      info: 'Signalements ouverts que personne n’a : ni membre de l’équipe, ni service. À confier, ou à laisser prendre par un agent depuis « À prendre ».',
    },
    {
      key: 'ack', label: 'PRISE EN CHARGE (MÉDIANE)', icon: 'Clock', value: formatDelay(i.median_ack_hours),
      hint: i.ack_within_48h_rate === null ? 'pas encore mesurée' : `${i.ack_within_48h_rate} % en moins de 48 h`,
      tone: 'neutral',
      info: 'Un signalement sur deux est pris en charge plus vite que ce délai. Le pourcentage dit quelle part l’a été en moins de 48 h. Plus parlant que la moyenne : un cas oublié ne le fausse pas.',
    },
    {
      key: 'resolve', label: 'RÉSOLUTION (MÉDIANE)', icon: 'Wrench', value: formatDelay(i.median_resolve_hours),
      hint: i.p90_resolve_hours === null ? 'pas encore mesurée' : `9 sur 10 en moins de ${formatDelay(i.p90_resolve_hours)}`,
      tone: 'neutral',
      info: 'Un signalement sur deux est résolu plus vite que ce délai. « 9 sur 10 en moins de… » montre où se situent les plus longs : c’est là qu’il faut regarder.',
    },
    {
      key: 'clarification', label: 'PRÉCISIONS ATTENDUES', icon: 'MessageSquareText', value: String(i.awaiting_clarification),
      hint: i.awaiting_clarification > 0 ? 'en attente de l’habitant' : 'aucune en attente',
      tone: 'neutral',
      info: 'Questions posées à l’habitant (« Demander une précision ») qui attendent encore sa réponse. Tant qu’elles attendent, le signalement avance mal.',
    },
    {
      key: 'reopened', label: 'RÉOUVERTURES', icon: 'RotateCcw', value: String(i.reopened_count),
      hint: i.reopened_count > 0 ? `sur ${plural(i.resolved_count, 'résolu', 'résolus')}` : 'aucune réparation contestée',
      tone: i.reopened_count > 0 ? 'alert' : 'ok',
      info: 'Signalements résolus puis rouverts, parce que l’habitant a contesté la réparation ou qu’un agent l’a reprise. Un nombre élevé veut dire des réparations qui ne tiennent pas.',
    },
    {
      key: 'closed', label: 'CLOS SANS RÉPARATION', icon: 'CircleX', value: String(i.closed_without_repair),
      hint: 'annulés ou indésirables',
      tone: 'neutral',
      info: 'Signalements annulés ou classés indésirables : la commune n’a rien réparé. Ils sont comptés à part et n’entrent pas dans les délais.',
    },
  ]
})

const toneClass = { alert: 'text-status-progress-fg', ok: 'text-status-done-fg', neutral: 'text-muted' } as const
</script>

<template>
  <section class="flex flex-none flex-col gap-3.5" data-testid="treatment-indicators">
    <h2 class="text-[15px] font-bold text-brand-900">Indicateurs de traitement</h2>

    <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div
        v-for="tile in tiles" :key="tile.key"
        class="flex flex-col gap-3 rounded-[14px] border border-line bg-white px-[18px] py-4"
        :data-testid="`tile-${tile.key}`"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="flex items-center gap-1.5">
            <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">{{ tile.label }}</span>
            <InfoTip :title="tile.label.charAt(0) + tile.label.slice(1).toLowerCase()" :text="tile.info" :align="['clarification', 'reopened', 'closed'].includes(tile.key) ? 'right' : 'left'" />
          </span>
          <AppIcon :name="tile.icon" :size="16" :stroke-width="1.75" class="flex-none text-neutral-400" />
        </div>
        <span class="text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">{{ tile.value }}</span>
        <span class="text-xs font-semibold leading-none" :class="toneClass[tile.tone]">{{ tile.hint }}</span>
      </div>
    </div>
  </section>
</template>
