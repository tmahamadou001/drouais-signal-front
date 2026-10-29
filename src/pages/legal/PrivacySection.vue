<script setup lang="ts">
/**
 * Une section de la politique de confidentialité ou des mentions légales.
 *
 * Le titre et son filet étaient recopiés à l'identique sept fois dans la même
 * page : une classe changée à un endroit et pas aux six autres, et le document
 * cesse d'avoir l'air d'un document.
 */
defineProps<{ title: string }>()
</script>

<template>
  <section>
    <h2 class="mb-3 border-b border-neutral-200 pb-2 text-lg font-semibold text-dark">
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
