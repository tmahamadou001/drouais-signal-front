<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <RouterLink to="/" class="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1 mb-8">
      <AppIcon name="ChevronLeft" :size="16" />
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
      <!-- L'ancre est ciblée depuis l'app mobile, dont l'écran Profil ouvre
           directement cette section pour la ligne « Confidentialité ». -->
      <section id="donnees-personnelles" class="scroll-mt-24">
        <h2 class="text-lg font-semibold text-dark mb-3 pb-2 border-b border-neutral-200">4. Données personnelles et RGPD</h2>
        <p>
          Le détail des traitements — qui est responsable de quoi, ce qui est collecté, combien de
          temps c'est conservé et comment exercer vos droits — figure dans la
          <RouterLink to="/confidentialite" class="text-primary hover:underline">politique de confidentialité</RouterLink>.
        </p>
        <!-- Le détail vivait ici, en double. Les deux textes ont divergé : celui-ci
             annonçait une conservation de trois ans que rien n'appliquait. Un seul
             document, au même endroit que les durées réellement appliquées. -->
        <p class="mt-2">
          L'essentiel en deux phrases : votre commune est responsable de traitement, OnSignale est
          son sous-traitant et n'utilise ses données pour aucune autre finalité. Les photographies
          et les adresses e-mail sont effacées automatiquement à l'échéance de leur durée de
          conservation.
        </p>
        <p class="mt-2">
          Pour exercer vos droits : <a href="mailto:dpo@onsignale.fr" class="text-primary hover:underline">dpo@onsignale.fr</a>,
          ou la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">CNIL</a> en cas de réclamation non résolue.
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
