<script setup lang="ts">
/**
 * La charge par agent : combien de signalements chacun a en cours.
 *
 * Elle sert à **répartir** le travail, pas à noter les personnes : c'est ce qu'elle
 * dit sous son titre, et la conception le tient — ni délai, ni classement entre
 * agents, ni période. Ce sont les signalements ouverts aujourd'hui. Réservée aux
 * administrateurs (le serveur refuse les autres), comme le bandeau l'annonce.
 *
 * La ligne « À assigner » compte ceux qui n'ont encore personne : c'est la
 * première chose qu'on veut voir avant de se demander qui est surchargé.
 */
import InfoTip from '@/components/InfoTip.vue'
import { computed, onMounted } from 'vue'
import { useWorkload } from '@/composables/useWorkload'
import AppIcon from '@/components/AppIcon.vue'

const { agents, unassigned, loading, failed, load } = useWorkload()

onMounted(() => void load())

/** La barre est proportionnelle au plus chargé : on compare des charges, pas des pourcentages. */
const maximum = computed(() => Math.max(1, unassigned.value, ...agents.value.map((agent) => agent.openCount)))
const width = (count: number) => `${Math.round((count / maximum.value) * 100)}%`
</script>

<template>
  <section class="flex flex-none flex-col gap-3.5 rounded-[14px] border border-line bg-white p-5" data-testid="workload-card">
    <header class="flex items-center gap-2.5">
      <h2 class="flex items-center gap-1.5 text-[15px] font-bold text-brand-900">Charge par agent
        <InfoTip title="Charge par agent" text="Combien de signalements ouverts chaque membre de l’équipe a en main en ce moment. « À assigner » : ceux que personne n’a. Sert à repérer une file trop lourde avant qu’elle ne prenne du retard." />
      </h2>
      <span class="inline-flex items-center gap-1 rounded-md bg-status-pending-bg px-2 py-1 text-[11px] font-semibold leading-none text-status-pending-fg">
        <AppIcon name="Lock" :size="11" /> Admin — visible par les administrateurs seulement
      </span>
    </header>

    <p class="max-w-[68ch] text-xs leading-[1.5] text-muted">
      Les signalements ouverts aujourd’hui, quelle que soit la période choisie : ni délai, ni classement entre
      agents. Ce tableau sert à répartir le travail, pas à noter les personnes.
    </p>

    <p v-if="failed" class="text-[13px] text-status-danger">Charge indisponible pour le moment.</p>
    <p v-else-if="loading && agents.length === 0" class="text-[13px] text-muted">Chargement…</p>

    <ul v-else class="flex flex-col gap-2.5">
      <li class="flex items-center gap-3" data-testid="workload-unassigned">
        <span class="w-[190px] flex-none text-[13px] font-semibold text-status-progress-fg">À assigner</span>
        <span class="h-2 min-w-0 flex-1 overflow-hidden rounded bg-canvas">
          <span class="block h-2 rounded bg-status-progress-dot" :style="{ width: width(unassigned) }" />
        </span>
        <span class="w-8 flex-none text-right text-[13px] font-bold tabular-nums text-ink">{{ unassigned }}</span>
      </li>

      <li v-for="agent in agents" :key="agent.userId" class="flex items-center gap-3" :data-testid="`workload-${agent.userId}`">
        <span class="w-[190px] min-w-0 flex-none">
          <span class="block truncate text-[13px] font-medium text-ink">{{ agent.name ?? 'Membre sans nom' }}</span>
          <span v-if="agent.services.length" class="block truncate text-[11px] text-muted">{{ agent.services.join(', ') }}</span>
        </span>
        <span class="h-2 min-w-0 flex-1 overflow-hidden rounded bg-canvas">
          <span class="block h-2 rounded bg-brand-700" :style="{ width: width(agent.openCount) }" />
        </span>
        <span class="w-8 flex-none text-right text-[13px] font-bold tabular-nums text-ink">{{ agent.openCount }}</span>
      </li>
    </ul>
  </section>
</template>
