<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
    <div class="text-center max-w-md">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <AppIcon name="Settings" :size="40" class="text-gray-400" />
      </div>
      
      <h1 class="text-2xl font-display font-bold text-gray-800 mb-3">
        Paramètres & Destinataires
      </h1>
      
      <p class="text-gray-600 mb-6 leading-relaxed">
        Configuration des destinataires d'emails, paramètres de notification, 
        et gestion des utilisateurs administrateurs.
      </p>
      
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200">
        <AppIcon name="Clock" :size="16" class="text-orange-600" />
        <span class="text-sm font-medium text-orange-800">Bientôt disponible</span>
      </div>
    </div>
  </div>
</template>
