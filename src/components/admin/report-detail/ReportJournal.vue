<script setup lang="ts">
/**
 * Le journal du signalement : qui a fait bouger le statut, quand, et pourquoi.
 *
 * **La frise dit où l'on en est ; le journal dit qui l'a décidé.** Ce panneau
 * ne listait que les entrées portant un motif : un agent qui marquait un
 * signalement résolu ne laissait aucune trace lisible, et l'onglet restait vide
 * juste après l'action. Tout est listé, et tout a la même forme — une carte —
 * parce que deux traitements visuels pour une même nature d'information font
 * chercher la différence là où il n'y en a pas.
 */
import { computed } from 'vue'
import type { StatusHistoryEntry } from '@/types'
import type { TeamEvent } from '@/types/team'
import AppIcon from '@/components/AppIcon.vue'
import { statusPill } from '@/lib/reportStatus'

const props = withDefaults(defineProps<{
  history: StatusHistoryEntry[]
  /** Les gestes d'organisation : qui a confié le signalement à qui. */
  events?: TeamEvent[]
}>(), { events: () => [] })

type Row =
  | { kind: 'status'; at: string; entry: StatusHistoryEntry }
  | { kind: 'team'; at: string; event: TeamEvent }

/**
 * Les changements de statut et les gestes d'organisation, **dans un seul fil**.
 *
 * Deux listes séparées obligeaient à les recouper de tête pour comprendre
 * pourquoi un signalement était chez quelqu'un. Le plus récent d'abord :
 * c'est ce qu'on vient de faire qu'on relit.
 */
const entries = computed<Row[]>(() =>
  [
    ...props.history.map((entry): Row => ({ kind: 'status', at: entry.changed_at, entry })),
    ...props.events.map((event): Row => ({ kind: 'team', at: event.createdAt, event })),
  ]
    .map((row, index) => ({ row, index }))
    // À date égale, le plus tard dans l'ordre reçu passe devant : c'est l'ordre
    // que l'historique avait déjà, et il ne dépend pas de la précision des horodatages.
    .sort((a, b) => Date.parse(b.row.at) - Date.parse(a.row.at) || b.index - a.index)
    .map(({ row }) => row)
)

/** Ce que dit un geste d'organisation, à la voix de l'historique. */
const TEAM_ICONS: Record<string, string> = { auto_routed: 'Route', planned: 'CalendarClock', unplanned: 'CalendarX', reopened: 'RotateCcw', merged: 'GitMerge', merged_into: 'GitMerge', category_changed: 'Tag' }
const teamIcon = (kind: string) => TEAM_ICONS[kind] ?? 'UserCheck'

function formatDay(value?: string | null): string {
  if (!value) return 'une date à venir'
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

function teamLabel(event: TeamEvent): string {
  const who = event.actorName ?? 'Un collègue'
  switch (event.kind) {
    case 'auto_routed':
      return `Aiguillé automatiquement vers ${event.assigneeName ?? (event.serviceName ? `le service ${event.serviceName}` : 'son responsable')}`
    case 'assigned':
      return `${who} a confié le signalement à ${event.assigneeName ?? 'un collègue'}`
    case 'unassigned':
      return `${who} a retiré l’assignation`
    case 'service_changed':
      return event.serviceName ? `${who} l’a rattaché au service ${event.serviceName}` : `${who} l’a détaché de son service`
    case 'planned':
      return `${who} a prévu l’intervention le ${formatDay(event.plannedFor)}${event.note ? ` — ${event.note}` : ''}`
    case 'unplanned':
      return `${who} a retiré la date d’intervention`
    case 'merged':
      return `${who} a fusionné le doublon ${event.detail ?? ''}`.trim()
    case 'merged_into':
      return `${who} a fusionné ce signalement dans ${event.detail ?? 'un autre'}`
    case 'category_changed':
      return `${who} a corrigé la catégorie (${event.detail ?? ''})`
    case 'reopened':
      return `${who} a rouvert le signalement${event.note ? ` — ${event.note}` : ''}`
  }
}

/**
 * Le dépôt, reconnaissable sans colonne supplémentaire.
 *
 * `insert_initial_status_history` (migration 017) écrit la seule ligne où
 * `old_status` et `new_status` sont égaux. Elle n'a pas d'auteur, et elle
 * tombait donc dans le repli « Service extérieur » — le journal annonçait un
 * prestataire là où il n'y avait que l'habitant qui venait de signaler.
 */
function isCreation(entry: StatusHistoryEntry): boolean {
  return !entry.agent_id && entry.old_status === entry.new_status
}

/**
 * Le nom du service, extrait de ce que le serveur a préfixé.
 *
 * `routes/serviceHandoff.ts` écrit soit « Éclairage : note », soit « Via le
 * lien de transmission (Éclairage) ». Le nom est donc déjà dans le texte : le
 * répéter en étiquette générique — « Service extérieur » au-dessus de
 * « Éclairage : … » — dit deux fois moins bien la même chose.
 */
function serviceName(comment: string | null): string | null {
  if (!comment) return null

  const viaLink = comment.match(/^Via le lien de transmission \((.+)\)$/)
  if (viaLink) return viaLink[1]

  const prefixed = comment.match(/^([^:]{1,60}) : /)
  return prefixed ? prefixed[1].trim() : null
}

function actor(entry: StatusHistoryEntry): { label: string; icon: string } {
  if (entry.agent_id) return { label: entry.agent_name || 'Agent', icon: 'User' }
  if (isCreation(entry)) return { label: 'Dépôt du signalement', icon: 'Inbox' }

  if (entry.comment?.startsWith('Transmis automatiquement')) {
    return { label: 'Transmission automatique', icon: 'Bot' }
  }

  // L'auteur clôt ou rouvre le sien (migration 050) ; avant elle, des habitants le faisaient.
  // Sans agent, ces lignes tombaient dans « Service extérieur ».
  if (entry.comment?.startsWith('Auteur — ')) return { label: 'Auteur du signalement', icon: 'User' }
  if (entry.comment?.startsWith('Habitants — ')) return { label: 'Habitants', icon: 'Users' }

  return { label: serviceName(entry.comment) ?? 'Service extérieur', icon: 'Truck' }
}

/**
 * Ce qu'il reste à lire une fois l'auteur écrit au-dessus.
 *
 * Le préfixe est retiré, et « Via le lien de transmission (X) » disparaît
 * entièrement : l'étiquette porte déjà le nom du service, et la colonne de
 * statut dit ce qu'il a fait.
 */
function body(entry: StatusHistoryEntry): string | null {
  const comment = entry.comment?.trim()
  if (!comment) return null

  if (/^Via le lien de transmission \(.+\)$/.test(comment)) return null

  const own = !entry.agent_id && comment.match(/^(?:Auteur|Habitants) — (.+)$/)
  if (own) return own[1]

  const prefix = !entry.agent_id && serviceName(comment)
  return prefix ? comment.slice(comment.indexOf(' : ') + 3).trim() || null : comment
}

const when = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).replace(', ', ' · ')
</script>

<template>
  <section v-if="entries.length > 0" class="flex flex-none flex-col gap-2.5" data-testid="journal">
    <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
      JOURNAL DU TRAITEMENT
    </span>

    <div class="flex flex-col gap-2">
      <!--
        L'alignement suit le contenu.

        `items-start` est juste quand un motif suit l'en-tête : la pastille doit
        rester en haut, à hauteur du nom. Sur une entrée sans motif, il ne reste
        qu'une ligne de texte de douze pixels face à une pastille de vingt-huit,
        et les aligner par le haut les fait paraître décalées — c'est le cas le
        plus fréquent du journal, pas un cas limite.
      -->
      <template v-for="row in entries" :key="row.kind === 'status' ? row.entry.id : `team-${row.event.id}`">
      <article
        v-if="row.kind === 'team'"
        class="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3"
        data-testid="journal-team-event"
      >
        <div class="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-canvas">
          <AppIcon :name="teamIcon(row.event.kind)" :size="14" :stroke-width="1.75" class="text-muted" />
        </div>
        <p class="min-w-0 flex-1 text-[13px] leading-[1.4] text-ink">{{ teamLabel(row.event) }}</p>
        <span class="whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-faint">{{ when(row.at) }}</span>
      </article>

      <article
        v-else
        class="flex gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3"
        :class="body(row.entry) ? 'items-start' : 'items-center'"
      >
        <div class="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-canvas">
          <AppIcon :name="actor(row.entry).icon" :size="14" :stroke-width="1.75" class="text-muted" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span class="text-xs font-bold leading-none text-brand-900">{{ actor(row.entry).label }}</span>
            <span class="text-[11px] font-medium leading-none text-muted">
              → {{ statusPill(row.entry.new_status).label }}
            </span>
            <span class="ml-auto whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-faint">
              {{ when(row.entry.changed_at) }}
            </span>
          </div>
          <p v-if="body(row.entry)" class="mt-1.5 text-[13px] leading-[1.5] text-ink">
            {{ body(row.entry) }}
          </p>
        </div>
      </article>
      </template>
    </div>
  </section>
</template>
