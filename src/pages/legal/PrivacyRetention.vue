<script setup lang="ts">
/**
 * Les durées de conservation.
 *
 * Elles sont écrites ici, dans `docs/rgpd-registre.md` et appliquées par
 * `server/src/services/retentionService.ts`. Les trois changent ensemble : une
 * durée annoncée sur une page et appliquée par personne est une fausse
 * déclaration, pas une politique.
 */
const RETENTION = [
  {
    data: 'Photographie d’un signalement',
    duration: '12 mois après la résolution, 24 mois s’il n’est jamais résolu',
    why: 'On ne maîtrise pas ce qu’une photo contient : une plaque d’immatriculation, une devanture, parfois un visage. Le délai plus long pour un signalement non résolu tient à ce qu’elle reste la preuve d’un problème ouvert.',
  },
  {
    data: 'Adresse e-mail d’un signalement sans compte',
    duration: '24 mois après le dépôt',
    why: 'Elle n’existe que pour prévenir l’auteur de l’avancement de ce signalement.',
  },
  {
    data: 'Jeton de notification d’un appareil',
    duration: 'Jusqu’à la désinstallation de l’application ou la désactivation des notifications',
    why: 'Il ne sert qu’à adresser une notification à cet appareil. Il est effacé dès qu’il devient invalide.',
  },
  {
    data: 'Journaux d’audit (qui a fait quoi dans le back-office)',
    duration: '12 mois',
    why: 'Le temps de couvrir un contrôle ou une contestation, sans garder indéfiniment la trace des gestes d’un agent.',
  },
  {
    data: 'Compte d’un agent municipal',
    duration: 'Durée de ses fonctions, supprimé par sa commune',
    why: 'La commune révoque l’accès depuis l’écran Équipe. C’est elle qui sait quand un agent la quitte.',
  },
  {
    data: 'Signalement dépersonnalisé (catégorie, position, dates, statut)',
    duration: 'Conservé',
    why: 'Une fois la photo et l’adresse effacées, il ne désigne plus personne. C’est la mémoire technique de la commune et la base de ses statistiques.',
  },
]
</script>

<template>
  <div>
    <p class="mb-4">
      Ces durées sont appliquées automatiquement, chaque nuit. Ce ne sont pas des intentions.
    </p>
    <div class="space-y-4">
      <div v-for="entry in RETENTION" :key="entry.data" class="rounded-ds-lg border border-neutral-200 p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="font-medium text-dark">{{ entry.data }}</p>
          <p class="text-xs font-semibold text-primary">{{ entry.duration }}</p>
        </div>
        <p class="mt-2 text-neutral-500">{{ entry.why }}</p>
      </div>
    </div>
  </div>
</template>
