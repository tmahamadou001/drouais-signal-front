<script setup lang="ts">
/**
 * Les faits du signalement, en liste de définitions.
 *
 * C'étaient trois lignes d'icône + texte à la queue leu leu, qui se lisaient
 * comme une phrase alors que ce sont des valeurs qu'on compare. Une colonne de
 * libellés et une colonne de valeurs se balaient du regard, et occupent
 * honnêtement la largeur au lieu de l'étirer.
 *
 * **L'échéance remonte ici.** Elle vivait dans l'en-tête du suivi, à trois
 * cents pixels de la pastille « En retard de 93 j » qui en est la conséquence :
 * le même fait, dit deux fois, loin l'un de l'autre. Le délai de la catégorie
 * et la date qu'il produit se lisent maintenant l'un sous l'autre.
 */
import AppIcon from '@/components/AppIcon.vue'
import { categoryGlyph } from '@/lib/categories'

const props = defineProps<{
  categorySlug: string
  categoryLabel: string
  address: string | null
  slaHours: number
  deadline: Date | null
  overdue: boolean
  voteCount: number
  contact: { channel: 'account' | 'email' | 'none'; reachable: boolean } | null
}>()

const CONTACT_LABELS: Record<string, string> = {
  account: 'Compte OnSignale · joignable par e-mail',
  email:   'Sans compte · joignable par e-mail',
  none:    'Sans compte · aucun moyen de contact',
}

const longDate = (value: Date) =>
  value.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Rendue en fonction pour que le gabarit reste une liste, pas une condition. */
function contactLabel(): string {
  return props.contact ? CONTACT_LABELS[props.contact.channel] : '—'
}
</script>

<template>
  <dl class="grid grid-cols-[92px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 text-[13px] leading-[1.35]">
    <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Catégorie</dt>
    <dd class="flex min-w-0 items-center gap-[7px] font-medium text-ink">
      <AppIcon :name="categoryGlyph(categorySlug, categoryLabel)" :size="14" :stroke-width="1.75" class="flex-none text-muted" />
      <span class="truncate">{{ categoryLabel }}</span>
    </dd>

    <!-- L'adresse est aussi sous la carte, et c'est voulu : là-bas elle
         légende un marqueur, ici elle se lit avec le reste des faits, sans
         descendre en bas de fiche. -->
    <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Adresse</dt>
    <dd class="flex min-w-0 items-start gap-[7px] text-ink">
      <AppIcon name="MapPin" :size="14" :stroke-width="1.75" class="mt-px flex-none text-muted" />
      <span class="min-w-0 flex-1">{{ address || 'Position sans adresse connue' }}</span>
    </dd>

    <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Délai</dt>
    <dd class="tabular-nums text-muted">{{ slaHours }} h à compter du dépôt</dd>

    <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Échéance</dt>
    <dd
      class="font-medium tabular-nums"
      :class="overdue ? 'text-status-progress-fg' : 'text-ink'"
    >
      {{ deadline ? longDate(deadline) : '—' }}
      <span v-if="overdue" class="text-xs font-semibold">· dépassée</span>
    </dd>

    <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Habitant</dt>
    <dd :class="contact?.reachable === false ? 'text-status-progress-fg' : 'text-muted'">
      {{ contactLabel() }}
    </dd>

    <!-- Chacun de ces chiffres est un habitant qui se trouvait à moins de
         150 m, photo à l'appui : le serveur vérifie la distance avant
         d'enregistrer (migration 029). Ce n'est pas un vote. -->
    <template v-if="voteCount > 0">
      <dt class="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Constats</dt>
      <dd class="flex items-center gap-[7px] font-medium text-ink">
        <AppIcon name="ArrowBigUp" :size="14" :stroke-width="2" class="flex-none text-brand-700" />
        {{ voteCount }} habitant{{ voteCount > 1 ? 's ont' : ' a' }} constaté ce problème sur place
      </dd>
    </template>
  </dl>
</template>
