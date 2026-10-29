/**
 * Service worker « pierre tombale ».
 *
 * OnSignale n'est plus une PWA : le citoyen passe par l'application mobile, et
 * le web est réservé à l'administration. Mais supprimer ce fichier ne suffisait
 * pas — un navigateur qui a déjà installé l'ancien service worker continue de
 * l'exécuter et de servir l'application depuis son cache, **indéfiniment**. Ses
 * utilisateurs seraient restés bloqués sur la version citoyenne, sans jamais
 * voir une mise à jour ni comprendre pourquoi.
 *
 * Ce fichier se désinscrit donc lui-même, vide tout ce que ses prédécesseurs
 * ont mis en cache, et recharge les onglets ouverts. Il ne met rien en cache et
 * n'intercepte aucune requête.
 *
 * À conserver plusieurs mois : un navigateur ne revérifie ce fichier qu'à la
 * visite suivante, et certains utilisateurs ne reviendront pas avant longtemps.
 * Le supprimer trop tôt laisserait ceux-là avec l'ancien worker actif.
 */

self.addEventListener('install', () => {
  // Sans cela, ce worker attendrait que l'ancien libère la place — c'est-à-dire
  // la fermeture de tous les onglets, ce qui peut ne jamais arriver.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))

      await self.registration.unregister()

      // Les onglets ouverts tournent encore sur les fichiers mis en cache par
      // l'ancien worker ; un rechargement est ce qui les remet sur le réseau.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })()
  )
})

// Aucun gestionnaire `fetch` : les requêtes passent directement au réseau.
