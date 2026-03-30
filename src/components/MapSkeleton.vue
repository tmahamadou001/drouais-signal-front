<script setup lang="ts">
// Composant skeleton pour la carte pendant le chargement
</script>

<template>
  <div class="h-[500px] rounded-ds-lg overflow-hidden shadow-ds-lg border border-neutral-200 bg-neutral-100 animate-pulse">
    <div class="w-full h-full relative">
      <!-- Grille simulant une carte -->
      <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px); background-size: 50px 50px;"></div>
      
      <!-- Marqueurs simulés -->
      <div class="absolute top-1/4 left-1/3 w-8 h-8 bg-neutral-300 rounded-full"></div>
      <div class="absolute top-1/2 left-1/2 w-8 h-8 bg-neutral-300 rounded-full"></div>
      <div class="absolute top-2/3 left-2/3 w-8 h-8 bg-neutral-300 rounded-full"></div>
      <div class="absolute top-1/3 left-3/4 w-8 h-8 bg-neutral-300 rounded-full"></div>
      
      <!-- Contrôles de zoom simulés -->
      <div class="absolute top-4 right-4 space-y-2">
        <div class="w-10 h-10 bg-white rounded-lg shadow-md"></div>
        <div class="w-10 h-10 bg-white rounded-lg shadow-md"></div>
      </div>
      
      <!-- Texte de chargement centré -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-lg shadow-lg">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm font-medium text-neutral-700">Chargement de la carte…</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
