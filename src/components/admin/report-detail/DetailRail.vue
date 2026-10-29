<script setup lang="ts">
/**
 * La navigation du panneau de détail : un rail vertical, sur le bord extérieur.
 *
 * Vertical et non horizontal parce que c'est de la **largeur** qu'on vient de
 * gagner : une rangée d'onglets volerait au contenu la hauteur qui manquait
 * déjà. Sur le bord droit parce que le panneau s'ouvre par la droite — le rail
 * se trouve donc là où la souris arrive.
 *
 * Icône **et** libellé, contrairement aux rails habituels. Trois destinations
 * dont deux qu'on distingue mal par le dessin — un journal et une conversation
 * sont tous deux « de l'historique » — et un panneau élargi peut se permettre
 * les cinquante-six pixels que coûte un mot. Une pastille qui devine se paie
 * une fois par agent et par jour, pas une fois à l'écriture.
 */
import AppIcon from '@/components/AppIcon.vue'

export type DetailView = 'overview' | 'messages' | 'journal'

defineProps<{
  active: DetailView
  /** Réponses de l'habitant non lues, pour la pastille. */
  unread: number
  /** Entrées du journal — le compteur évite d'y aller pour rien. */
  journalCount: number
}>()

const emit = defineEmits<{ select: [view: DetailView] }>()

const ITEMS: { view: DetailView; label: string; icon: string; title: string }[] = [
  { view: 'overview', label: 'Fiche',    icon: 'FileText',      title: 'Le signalement et son état' },
  { view: 'messages', label: 'Échanges', icon: 'MessageCircle', title: 'Conversation avec l’habitant' },
  { view: 'journal',  label: 'Journal',  icon: 'History',       title: 'Qui a fait quoi, et pourquoi' },
]
</script>

<template>
  <nav class="flex w-[68px] flex-none flex-col gap-1 border-l border-line bg-canvas px-2 py-3">
    <button
      v-for="item in ITEMS"
      :key="item.view"
      class="relative flex flex-col items-center gap-1.5 rounded-[10px] px-1 py-2.5 transition-colors"
      :class="active === item.view
        ? 'bg-white text-brand-700 shadow-[0_1px_2px_rgba(15,43,74,.10)]'
        : 'text-muted hover:bg-white/60 hover:text-ink'"
      :title="item.title"
      :aria-current="active === item.view ? 'page' : undefined"
      @click="emit('select', item.view)"
    >
      <AppIcon :name="item.icon" :size="18" :stroke-width="active === item.view ? 2 : 1.75" />
      <span class="text-[10px] font-semibold leading-none">{{ item.label }}</span>

      <!-- Ce qui rend le cloisonnement supportable : on voit qu'il s'est passé
           quelque chose ailleurs sans avoir à y aller. -->
      <span
        v-if="item.view === 'messages' && unread > 0"
        class="absolute right-1.5 top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold leading-none tabular-nums text-white"
      >
        {{ unread }}
      </span>
      <!-- Une pastille claire, pas un chiffre gris.
           Elle reste distincte de celle des messages — fond tendre contre
           bleu plein — parce que les deux ne demandent pas la même chose :
           l'une informe, l'autre attend une réponse. Mais un compteur qu'on
           doit chercher ne compte pour personne. -->
      <span
        v-else-if="item.view === 'journal' && journalCount > 0"
        class="absolute right-1.5 top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand-100 px-1 text-[10px] font-bold leading-none tabular-nums text-brand-800"
      >
        {{ journalCount }}
      </span>
    </button>
  </nav>
</template>
