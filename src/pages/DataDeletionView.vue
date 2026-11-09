<script setup lang="ts">
/**
 * « Supprimer mes données ».
 *
 * Google Play exige, pour toute application proposant des comptes, une URL
 * publique — atteignable **sans installer l'application ni se connecter** —
 * qui explique comment demander la suppression du compte et des données, ce
 * qui est supprimé, ce qui est conservé et pendant combien de temps. Apple
 * demande la même chose sous une autre forme. C'est cette page.
 *
 * Elle dit l'état réel du produit : la demande se traite aujourd'hui à la main,
 * sous 30 jours. Annoncer un bouton qui n'existe pas serait une déclaration
 * fausse faite à une boutique qui la vérifie — et le geste manquant est déjà
 * inscrit dans `docs/rgpd-registre.md`, section « Ce qui manque ».
 */
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PrivacySection from '@/pages/legal/PrivacySection.vue'

const CONTACT = 'dpo@onsignale.fr'

/** Ce qui part, et ce qui reste. La seconde colonne est celle qui compte. */
const REMOVED = [
  'Votre compte et votre adresse e-mail.',
  'Les photographies de vos signalements.',
  'Les messages que vous avez échangés avec les agents.',
  'Le lien entre vous et vos signalements.',
  'Le jeton de notification de vos appareils.',
]

const KEPT = [
  {
    what: 'Le signalement lui-même, dépersonnalisé',
    why: 'Catégorie, position, dates et état d’avancement. Une fois la photo, l’adresse e-mail et le lien avec votre compte effacés, il ne désigne plus personne — et il reste ce qui permet à la commune de savoir qu’un lampadaire a été réparé. La commune traite ces signalements dans le cadre d’une mission d’intérêt public : son obligation de traiter ce qui lui est signalé ne disparaît pas avec votre compte.',
  },
  {
    what: 'Les journaux d’audit du back-office',
    why: 'Uniquement pour les comptes d’agents municipaux, et pendant 12 mois. Ils existent pour que la commune puisse vérifier qui a fait quoi — les effacer sur demande viderait le contrôle de son sens.',
  },
]
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <RouterLink
      to="/confidentialite"
      class="mb-8 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <AppIcon name="ChevronLeft" :size="16" />
      Politique de confidentialité
    </RouterLink>

    <h1 class="mb-2 text-3xl font-bold text-dark">Supprimer mes données</h1>
    <p class="mb-10 text-sm text-neutral-400">
      Application OnSignale — <span class="font-mono">fr.onsignale.mobile</span>
    </p>

    <div class="space-y-10 text-sm leading-relaxed text-neutral-700">

      <PrivacySection title="Comment demander la suppression">
        <p>
          Écrivez à
          <a :href="`mailto:${CONTACT}?subject=Demande%20de%20suppression%20de%20mes%20donn%C3%A9es`" class="font-medium text-primary hover:underline">{{ CONTACT }}</a>
          depuis l’adresse e-mail de votre compte, ou indiquez-la dans votre message. C’est ce qui
          nous permet de vérifier que la demande vient bien de vous : nous ne supprimons pas un
          compte sur la parole d’une adresse inconnue.
        </p>
        <p class="mt-3">
          Vous n’avez pas besoin d’expliquer pourquoi. La demande est traitée
          <span class="font-medium text-dark">sous 30 jours</span>, et nous vous confirmons par
          e-mail quand c’est fait.
        </p>
        <p class="mt-3 rounded-ds-lg bg-neutral-50 p-4 text-neutral-500">
          Si vous avez déposé un signalement <span class="font-medium text-dark">sans compte</span>,
          il n’y a pas de compte à supprimer. Donnez-nous la référence du signalement — celle du
          type <span class="font-mono text-dark">LAL-2026-00418</span>, reçue par e-mail — et nous
          effaçons la photo et votre adresse.
        </p>
      </PrivacySection>

      <PrivacySection title="Ce qui est supprimé">
        <ul class="ml-2 list-inside list-disc space-y-1">
          <li v-for="item in REMOVED" :key="item">{{ item }}</li>
        </ul>
        <p class="mt-3">
          La suppression est définitive : ces données ne sont pas mises de côté, ni archivées.
        </p>
      </PrivacySection>

      <PrivacySection title="Ce qui est conservé, et pourquoi">
        <div class="space-y-3">
          <div v-for="entry in KEPT" :key="entry.what" class="rounded-ds-lg border border-neutral-200 p-4">
            <p class="font-medium text-dark">{{ entry.what }}</p>
            <p class="mt-2 text-neutral-500">{{ entry.why }}</p>
          </div>
        </div>
      </PrivacySection>

      <PrivacySection title="Sans supprimer votre compte">
        <ul class="ml-2 list-inside list-disc space-y-1">
          <li><span class="font-medium text-dark">Les notifications</span> se coupent depuis les réglages de votre téléphone, ou depuis l’application.</li>
          <li><span class="font-medium text-dark">Les e-mails</span> se coupent en un clic, par le lien de désabonnement présent dans chacun d’eux.</li>
          <li><span class="font-medium text-dark">Un signalement</span> peut être retiré isolément : donnez-nous sa référence.</li>
        </ul>
      </PrivacySection>

      <p class="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        Voir aussi la
        <RouterLink to="/confidentialite" class="text-primary hover:underline">politique de confidentialité</RouterLink>
        et les
        <RouterLink to="/mentions-legales" class="text-primary hover:underline">mentions légales</RouterLink>.
      </p>
    </div>
  </div>
</template>
