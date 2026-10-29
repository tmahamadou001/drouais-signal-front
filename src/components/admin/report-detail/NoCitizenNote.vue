<script setup lang="ts">
/**
 * Pourquoi il n'y a pas de zone de réponse.
 *
 * Un signalement saisi depuis le back-office n'a pas d'auteur : il vient d'un
 * appel téléphonique ou d'une tournée, et `user_id` est nul par construction.
 * Il ne s'agit pas d'un habitant injoignable — ce cas existe aussi et se dit
 * autrement — mais de l'absence d'interlocuteur.
 *
 * Retirer le champ sans explication laisserait croire à une panne ; le laisser
 * serait pire, puisque le message partirait dans le vide et s'afficherait dans
 * le fil comme un message envoyé. Le serveur refuse d'ailleurs l'écriture
 * (422 `no_recipient`) : cet écran dit la même règle avant le geste plutôt
 * qu'après.
 */
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="flex items-start gap-2.5 rounded-xl border border-line bg-canvas px-3.5 py-3">
    <AppIcon name="Landmark" :size="16" :stroke-width="1.75" class="mt-px flex-none text-muted" />
    <p class="text-xs leading-[1.5] text-muted">
      <span class="font-semibold text-ink">Ce signalement a été saisi par la commune.</span>
      Il n’a pas d’auteur à qui écrire — l’échange est réservé aux signalements
      déposés par un habitant. Pour joindre la personne à l’origine de l’appel,
      utilisez les coordonnées que vous avez relevées.
    </p>
  </div>
</template>
