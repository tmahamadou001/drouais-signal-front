<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <RouterLink to="/" class="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1 mb-8">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Retour à l'accueil
    </RouterLink>

    <h1 class="text-3xl font-display font-bold text-dark mb-2">Mentions légales</h1>
    <p class="text-sm text-neutral-400 mb-10">Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).</p>

    <div class="space-y-10 text-sm text-neutral-700 leading-relaxed">

      <!-- 1. Éditeur -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">1. Éditeur du site</h2>
        <div class="space-y-1">
          <p><span class="font-medium text-dark">Adresse :</span> Dreux, France</p>
          <p><span class="font-medium text-dark">Email :</span> <a href="mailto:equipe@onsignale.fr" class="text-primary hover:underline">equipe@onsignale.fr</a></p>
          <p><span class="font-medium text-dark">Directeur de la publication :</span> Équipe OnSignale</p>
        </div>
      </section>

      <!-- 2. Hébergement -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">2. Hébergement</h2>
        <p class="mb-4">Le site OnSignale est hébergé par les prestataires suivants :</p>
        <div class="space-y-4">
          <div class="bg-neutral-50 rounded-ds-lg p-4">
            <p class="font-medium text-dark mb-1">Frontend (interface utilisateur)</p>
            <p><span class="font-medium">Vercel Inc.</span></p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723 — États-Unis</p>
            <p>Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">vercel.com</a></p>
          </div>
          <div class="bg-neutral-50 rounded-ds-lg p-4">
            <p class="font-medium text-dark mb-1">Backend (serveur et base de données)</p>
            <p><span class="font-medium">Railway Corp.</span></p>
            <p>548 Market St PMB 60971, San Francisco, CA 94104 — États-Unis</p>
            <p>Site web : <a href="https://railway.app" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">railway.app</a></p>
          </div>
          <div class="bg-neutral-50 rounded-ds-lg p-4">
            <p class="font-medium text-dark mb-1">Base de données et authentification</p>
            <p><span class="font-medium">Supabase Inc.</span></p>
            <p>970 Toa Payoh North #07-04, Singapour 318992</p>
            <p>Site web : <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">supabase.com</a></p>
          </div>
        </div>
      </section>

      <!-- 3. Propriété intellectuelle -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">3. Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu du site OnSignale (structure, textes, logos, images, interfaces) est protégé par le droit de la propriété intellectuelle et est la propriété exclusive de l'éditeur, sauf mention contraire.
        </p>
        <p class="mt-2">
          Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de l'éditeur.
        </p>
        <p class="mt-2">
          Les signalements publiés par les utilisateurs restent leur propriété. En les soumettant, ils accordent à l'éditeur une licence non exclusive permettant leur affichage dans le cadre du service.
        </p>
      </section>

      <!-- 4. Données personnelles -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">4. Données personnelles et RGPD</h2>
        <p>
          OnSignale collecte et traite des données personnelles dans le cadre de la fourniture de son service de signalement citoyen. Ces traitements sont conformes au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés modifiée.
        </p>

        <h3 class="font-medium text-dark mt-4 mb-2">Données collectées</h3>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li>Adresse email et mot de passe (compte utilisateur)</li>
          <li>Contenu des signalements : titre, description, catégorie, localisation (coordonnées GPS et adresse approximative), photographie éventuelle</li>
          <li>Adresse email pour les signalements anonymes (facultatif)</li>
          <li>Logs de connexion et d'activité (adresse IP, horodatage)</li>
        </ul>

        <h3 class="font-medium text-dark mt-4 mb-2">Finalités du traitement</h3>
        <ul class="list-disc list-inside space-y-1 ml-2">
          <li>Gestion des comptes utilisateurs et authentification</li>
          <li>Transmission des signalements aux collectivités concernées</li>
          <li>Envoi de notifications liées à l'évolution d'un signalement</li>
          <li>Amélioration du service et analyse statistique anonymisée</li>
        </ul>

        <h3 class="font-medium text-dark mt-4 mb-2">Durée de conservation</h3>
        <p>Les données sont conservées pendant la durée d'activité du compte utilisateur, puis supprimées dans un délai de 3 ans suivant la dernière connexion. Les signalements résolus sont conservés à des fins d'archivage historique par la collectivité.</p>

        <h3 class="font-medium text-dark mt-4 mb-2">Vos droits</h3>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul class="list-disc list-inside space-y-1 ml-2 mt-1">
          <li>Droit d'accès à vos données personnelles</li>
          <li>Droit de rectification des données inexactes</li>
          <li>Droit à l'effacement (« droit à l'oubli »)</li>
          <li>Droit à la limitation du traitement</li>
          <li>Droit à la portabilité de vos données</li>
          <li>Droit d'opposition au traitement</li>
        </ul>
        <p class="mt-2">
          Pour exercer ces droits, contactez-nous à : <a href="mailto:dpo@onsignale.fr" class="text-primary hover:underline">dpo@onsignale.fr</a>
        </p>
        <p class="mt-2">
          En cas de réclamation non résolue, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">CNIL</a> (Commission Nationale de l'Informatique et des Libertés).
        </p>
      </section>

      <!-- 5. Cookies -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">5. Cookies</h2>
        <p>
          OnSignale utilise des cookies et technologies similaires strictement nécessaires au fonctionnement du service : session d'authentification, préférences de langue. Aucun cookie publicitaire ou de pistage tiers n'est utilisé.
        </p>
        <p class="mt-2">
          Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités du service pourraient ne plus être disponibles.
        </p>
      </section>

      <!-- 6. Responsabilité -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">6. Limitation de responsabilité</h2>
        <p>
          L'éditeur s'efforce de maintenir le service disponible et à jour, mais ne peut garantir une disponibilité ininterrompue. L'éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site.
        </p>
        <p class="mt-2">
          Le contenu des signalements est soumis par les utilisateurs. L'éditeur ne saurait être tenu responsable des informations publiées par des tiers. Tout contenu manifestement illicite peut être signalé à l'adresse : <a href="mailto:[À COMPLÉTER]" class="text-primary hover:underline">[À COMPLÉTER]</a>
        </p>
      </section>

      <!-- 7. Droit applicable -->
      <section>
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">7. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
        </p>
      </section>

      <p class="text-xs text-neutral-400 pt-4 border-t border-neutral-200">
        Dernière mise à jour : juin 2026
      </p>
    </div>
  </div>
</template>
