<script setup lang="ts">
/**
 * La politique de confidentialité.
 *
 * Elle est séparée des mentions légales parce qu'elle ne répond pas à la même
 * obligation — la LCEN pour l'une, le RGPD pour l'autre — et parce que c'est le
 * document qu'un délégué à la protection des données d'une commune demandera à
 * lire avant de signer.
 *
 * **Elle décrit ce que le code fait, pas ce qu'il serait souhaitable qu'il
 * fasse.** Les durées annoncées ici sont celles qu'applique
 * `server/src/services/retentionService.ts`, et les deux doivent changer
 * ensemble. Une durée écrite sur une page et appliquée par personne est une
 * fausse déclaration, pas une politique.
 *
 * C'est aussi l'URL déclarée à Google Play et à l'App Store. Les deux
 * boutiques exigent que la page couvre **l'application**, pas seulement le
 * site : les autorisations demandées à l'appareil, ce qui en sort, et par où
 * passe une demande de suppression. D'où les sections « L'application mobile »
 * et « Supprimer vos données », à tenir d'accord avec le formulaire
 * *Data safety* (`docs/play-data-safety.md`).
 */
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PrivacySection from '@/pages/legal/PrivacySection.vue'
import PrivacyRetention from '@/pages/legal/PrivacyRetention.vue'

/** La date de dernière révision, que les deux boutiques affichent. */
const UPDATED_AT = '16 septembre 2026'

/**
 * Les autorisations demandées par l'application, et ce qui les justifie.
 *
 * Déclarées ici dans les mêmes termes que dans `mobile/app.json` : un magasin
 * d'applications compare les deux, et un habitant à qui l'appareil demande
 * l'accès à sa position mérite de trouver la réponse ailleurs que dans la
 * boîte de dialogue système.
 */
const PERMISSIONS = [
  {
    icon: 'Camera' as const,
    name: 'Appareil photo et photothèque',
    why: 'Joindre une photo au signalement — celle que vous prenez sur place, ou une image déjà dans votre téléphone. L’application n’accède à aucune autre photo que celle que vous choisissez.',
  },
  {
    icon: 'MapPin' as const,
    name: 'Position',
    why: 'Déterminer de quelle commune relève le signalement et permettre à l’agent de retrouver le problème. Elle est mesurée quand vous déposez un signalement ou ouvrez la carte, jamais en arrière-plan : l’application ne suit aucun déplacement.',
  },
  {
    icon: 'Bell' as const,
    name: 'Notifications',
    why: 'Vous dire que votre signalement a changé d’état ou qu’un agent vous a répondu. Facultatif, refusable, et désactivable à tout moment depuis les réglages du téléphone.',
  },
]
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <RouterLink
      to="/connexion"
      class="mb-8 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <AppIcon name="ChevronLeft" :size="16" />
      Retour
    </RouterLink>

    <h1 class="mb-2 text-3xl font-bold text-dark">Politique de confidentialité</h1>
    <p class="mb-10 text-sm text-neutral-400">
      Règlement (UE) 2016/679 (RGPD) et loi Informatique et Libertés modifiée.
      Dernière mise à jour : {{ UPDATED_AT }}.
    </p>

    <div class="space-y-10 text-sm leading-relaxed text-neutral-700">

      <PrivacySection title="1. Qui est responsable de quoi">
        <p>
          OnSignale est une plateforme mise à la disposition des collectivités. Le partage des rôles
          n’est pas un détail de rédaction : il détermine à qui vous vous adressez pour exercer vos
          droits.
        </p>
        <div class="mt-4 space-y-3">
          <div class="rounded-ds-lg bg-neutral-50 p-4">
            <p class="mb-1 font-medium text-dark">La commune est responsable de traitement</p>
            <p>
              C’est elle qui décide de traiter les signalements de son territoire, dans le cadre de
              sa mission d’intérêt public (article 6.1.e du RGPD). C’est à elle que vous adressez une
              demande d’accès ou d’effacement.
            </p>
          </div>
          <div class="rounded-ds-lg bg-neutral-50 p-4">
            <p class="mb-1 font-medium text-dark">OnSignale est sous-traitant</p>
            <p>
              Nous hébergeons et exploitons le service pour son compte, sur ses instructions, et
              n’utilisons ses données pour aucune autre finalité — ni revente, ni publicité, ni
              entraînement d’un modèle.
            </p>
          </div>
        </div>
      </PrivacySection>

      <PrivacySection title="2. Ce qui est collecté, et pourquoi">
        <ul class="ml-2 list-inside list-disc space-y-1">
          <li><span class="font-medium text-dark">Le signalement</span> — titre, description, catégorie, position et adresse approximative, photographie éventuelle. Sans cela, il n’y a pas de signalement.</li>
          <li><span class="font-medium text-dark">Une adresse e-mail</span>, si vous en donnez une, pour vous dire où en est votre signalement.</li>
          <li><span class="font-medium text-dark">Un jeton de notification</span>, si vous acceptez les notifications — un identifiant technique de votre installation, qui ne dit rien de vous ni de votre appareil.</li>
          <li><span class="font-medium text-dark">Le compte d’un agent municipal</span> — adresse professionnelle, rôle dans la commune.</li>
          <li><span class="font-medium text-dark">Les journaux d’audit</span> — les actions faites dans le back-office, avec leur auteur, leur date et l’adresse IP. Ils existent pour que la commune puisse vérifier ce qui s’est passé.</li>
        </ul>
        <p class="mt-3">
          <span class="font-medium text-dark">Signaler ne demande pas de compte.</span> On photographie
          un trou dans la rue, on ne s’inscrit pas pour ça. Un compte sert à retrouver ses
          signalements d’un appareil à l’autre, et rien d’autre.
        </p>
        <p class="mt-3">
          Nous ne collectons <span class="font-medium text-dark">aucune donnée d’usage</span> :
          ni statistique de navigation, ni identifiant publicitaire, ni outil de mesure tiers.
          L’application n’en embarque aucun.
        </p>
      </PrivacySection>

      <PrivacySection title="3. La position">
        <p>
          La position sert à deux choses et à rien d’autre : déterminer de quelle commune relève le
          signalement, et permettre à l’agent de retrouver le problème sur le terrain. Elle est
          mesurée à l’endroit du problème, pas en continu — l’application ne suit aucun déplacement.
        </p>
        <p class="mt-2">
          Elle est attachée <span class="font-medium text-dark">au problème, pas à vous</span> : ce
          qu’enregistre un signalement est l’endroit où se trouve le nid-de-poule, et l’adresse
          affichée publiquement est approximative.
        </p>
      </PrivacySection>

      <PrivacySection title="4. L’application mobile">
        <p class="mb-4">
          Trois autorisations, demandées au moment où elles servent et jamais avant. Refuser la
          position empêche de déposer un signalement — il faut bien savoir où est le problème ;
          refuser les notifications n’empêche rien.
        </p>
        <div class="space-y-3">
          <div v-for="permission in PERMISSIONS" :key="permission.name" class="flex gap-3 rounded-ds-lg border border-neutral-200 p-4">
            <AppIcon :name="permission.icon" :size="18" class="mt-0.5 flex-none text-primary" />
            <div>
              <p class="font-medium text-dark">{{ permission.name }}</p>
              <p class="mt-1 text-neutral-500">{{ permission.why }}</p>
            </div>
          </div>
        </div>
        <p class="mt-4">
          Rien n’est collecté en arrière-plan, et l’application ne lit ni votre carnet d’adresses,
          ni vos autres applications, ni le contenu de votre téléphone.
        </p>
      </PrivacySection>

      <PrivacySection title="5. Combien de temps">
        <PrivacyRetention />
      </PrivacySection>

      <PrivacySection title="6. Qui y a accès">
        <ul class="ml-2 list-inside list-disc space-y-1">
          <li>Les agents de <span class="font-medium text-dark">votre commune</span>, et d’elle seule. Aucune commune ne voit les signalements d’une autre.</li>
          <li>Le service destinataire d’une catégorie, quand la commune l’a configuré, par e-mail.</li>
          <li>Nos sous-traitants techniques : Supabase (base de données et fichiers, Union européenne), Vercel et Railway (hébergement), Resend (envoi d’e-mails), Google (analyse automatique des photos, notifications).</li>
        </ul>
        <p class="mt-3">
          La photographie envoyée est analysée automatiquement pour proposer une catégorie. Cette
          analyse ne décide rien seule : un agent revoit le signalement.
        </p>
        <p class="mt-3">
          <span class="font-medium text-dark">Un signalement publié est public.</span> C’est le
          principe du service : ce qui est signalé sur l’espace public est visible de tous, sans
          compte. Ce qui est publié, c’est le problème — catégorie, adresse approximative, photo,
          état d’avancement — jamais votre nom ni votre adresse e-mail.
        </p>
      </PrivacySection>

      <PrivacySection title="7. Supprimer vos données">
        <p>
          Vous pouvez à tout moment demander la suppression de votre compte et des signalements
          qui s’y rattachent. La marche à suivre, et ce qui est supprimé, sont décrits sur la page
          <RouterLink to="/supprimer-mes-donnees" class="font-medium text-primary hover:underline">Supprimer mes données</RouterLink>.
        </p>
      </PrivacySection>

      <PrivacySection title="8. Vos droits">
        <p>
          Accès, rectification, effacement, limitation, portabilité, opposition. Vous les exercez
          auprès de votre commune, responsable de traitement. Si vous ne savez pas à qui écrire,
          adressez-vous à
          <a href="mailto:dpo@onsignale.fr" class="text-primary hover:underline">dpo@onsignale.fr</a>
          et nous transmettrons.
        </p>
        <p class="mt-2">
          En cas de désaccord persistant, vous pouvez saisir la
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">CNIL</a>.
        </p>
      </PrivacySection>

      <PrivacySection title="9. Cookies">
        <p>
          Seuls ceux qui font fonctionner le service : la session de connexion d’un agent. Aucun
          cookie publicitaire, aucun pisteur tiers. L’application mobile n’utilise pas de cookies ;
          elle conserve votre session dans le coffre sécurisé du téléphone.
        </p>
      </PrivacySection>

      <p class="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        Voir aussi les
        <RouterLink to="/mentions-legales" class="text-primary hover:underline">mentions légales</RouterLink>.
      </p>
    </div>
  </div>
</template>
