/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /**
     * La cible, fixée plutôt que laissée au défaut de Vite 7.
     *
     * Vite 7 vise `baseline-widely-available`, ce qui demande Safari 16 — donc
     * iOS 16. Pour un back-office municipal, aucune importance. Mais trois pages
     * de ce client sont ouvertes depuis un e-mail par des habitants, sur le
     * téléphone qu'ils ont : le détail d'un signalement, le suivi anonyme, les
     * mentions légales. Descendre à Safari 15 ne coûte rien de mesurable et
     * garde ces liens vivants sur un iPhone de 2021.
     */
    target: ['chrome107', 'edge107', 'firefox104', 'safari15'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    // `jsdom` parce que la moitié de ce qui est testé touche au DOM : le
    // routeur, les composants, les menus qui se ferment au clic extérieur.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
