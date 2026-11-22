import { ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { activityTitle } from '@/lib/activity'
import type { ActivityItem } from '@/types/team'

/**
 * Le centre d'activité du membre connecté : mentions, assignations, réponses
 * d'habitants.
 *
 * L'état est au niveau du module — la cloche, le menu et la liste le lisent — et
 * **une seule** connexion temps réel est ouverte, quel que soit le nombre de
 * composants qui l'utilisent.
 *
 * Le temps réel pousse la ligne ; un rappel toutes les cinq minutes rattrape ce
 * qu'une coupure aurait fait manquer, et l'onglet qu'on retrouve se met à jour
 * tout de suite (c'est un signal, pas une horloge).
 */
const items = ref<ActivityItem[]>([])
const unread = ref(0)
const connected = ref(false)

let channel: RealtimeChannel | null = null
let safetyTimer: ReturnType<typeof setInterval> | null = null
let started: string | null = null

const SAFETY_MS = 5 * 60_000

export function useActivity() {
  const { apiFetch } = useApi()
  const toast = useToast()

  async function load(): Promise<void> {
    try {
      const data = await apiFetch<{ items: ActivityItem[]; unread: number }>('/api/activity?limit=30')
      items.value = data.items
      unread.value = data.unread
    } catch {
      // Silencieux : une cloche vide vaut mieux qu'un écran en erreur.
    }
  }

  /**
   * Ouvre le temps réel pour cet utilisateur. Idempotent : un second appel avec
   * le même identifiant ne rouvre rien.
   */
  async function start(userId: string): Promise<void> {
    if (started === userId) return
    await stop()
    started = userId

    await load()

    channel = supabase
      .channel(`activity-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_notifications', filter: `user_id=eq.${userId}` },
        () => {
          // On recharge plutôt que d'insérer la ligne brute : le serveur l'enrichit
          // (titre du signalement, nom de l'auteur) que le temps réel ne porte pas.
          void load().then(() => {
            const latest = items.value[0]
            if (latest && !latest.readAt) toast.info(activityTitle(latest), latest.reportTitle ?? undefined)
          })
        },
      )
      .subscribe((status) => { connected.value = status === 'SUBSCRIBED' })

    safetyTimer = setInterval(() => void load(), SAFETY_MS)
    document.addEventListener('visibilitychange', onVisible)
  }

  async function stop(): Promise<void> {
    if (channel) await supabase.removeChannel(channel)
    channel = null
    if (safetyTimer) clearInterval(safetyTimer)
    safetyTimer = null
    started = null
    connected.value = false
    document.removeEventListener('visibilitychange', onVisible)
    items.value = []
    unread.value = 0
  }

  function onVisible() {
    if (document.visibilityState === 'visible') void load()
  }

  /** Marque lue une ligne : le compteur baisse tout de suite, le serveur suit. */
  async function markRead(id: string): Promise<void> {
    const item = items.value.find((entry) => entry.id === id)
    if (item && !item.readAt) {
      item.readAt = new Date().toISOString()
      unread.value = Math.max(0, unread.value - 1)
    }
    try {
      await apiFetch('/api/activity/read', { method: 'POST', body: { ids: [id] } })
    } catch {
      void load()
    }
  }

  async function markAllRead(): Promise<void> {
    const now = new Date().toISOString()
    for (const item of items.value) item.readAt ??= now
    unread.value = 0
    try {
      await apiFetch('/api/activity/read', { method: 'POST', body: { all: true } })
    } catch {
      void load()
    }
  }

  /** Ouvrir un signalement par un autre chemin que la cloche en lit les lignes. */
  async function markReportRead(reportId: string): Promise<void> {
    const mine = items.value.filter((entry) => entry.reportId === reportId && !entry.readAt)
    if (mine.length === 0) return

    const now = new Date().toISOString()
    for (const item of mine) item.readAt = now
    unread.value = Math.max(0, unread.value - mine.length)

    try {
      await apiFetch(`/api/activity/reports/${reportId}/read`, { method: 'POST' })
    } catch {
      void load()
    }
  }

  return { items, unread, connected, load, start, stop, markRead, markAllRead, markReportRead }
}
