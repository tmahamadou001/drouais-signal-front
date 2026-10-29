import { ref, readonly } from 'vue'

/**
 * Les messages éphémères du back-office.
 *
 * Jusqu'ici, une action réussie ne disait rien et une action échouée écrivait
 * dans la console : l'agent qui cliquait « Prendre en charge » sur trente
 * signalements voyait la table se recharger et devait en déduire que tout
 * s'était bien passé — y compris quand ce n'était pas le cas.
 *
 * L'état est **au niveau du module**, pas dans le composable : les toasts sont
 * posés depuis n'importe quel écran et lus par un seul hôte, monté une fois
 * dans le layout. Un état par instance donnerait à chaque appelant sa propre
 * file, invisible.
 *
 * À ne pas confondre avec `RealtimeToast` : celui-là annonce ce que *les
 * autres* font (un signalement vient d'arriver), celui-ci confirme ce que
 * l'agent vient de faire lui-même. Deux sujets, deux coins de l'écran.
 */

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

/**
 * Combien de temps un message reste à l'écran, par gravité.
 *
 * Exporté parce que la barre de progression du toast doit s'écouler exactement
 * sur cette durée : deux barèmes séparés finiraient par ne plus coïncider, et
 * une barre qui atteint zéro devant un message encore affiché est pire que pas
 * de barre du tout.
 */
export const TOAST_DURATIONS: Record<ToastVariant, number> = {
  success: 4_000,
  info: 5_000,
  // Une erreur se lit, et parfois se recopie : elle ne part pas en quatre
  // secondes. Elle reste refermable à la main comme les autres.
  error: 8_000,
}

/** Au-delà, les plus anciens sortent : une pile qui couvre l'écran ne se lit plus. */
const MAX_VISIBLE = 4

const toasts = ref<Toast[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function dismiss(id: string): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function push(variant: ToastVariant, title: string, description?: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  toasts.value = [...toasts.value, { id, variant, title, description }].slice(-MAX_VISIBLE)
  timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATIONS[variant]))

  return id
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    dismiss,
    success: (title: string, description?: string) => push('success', title, description),
    error: (title: string, description?: string) => push('error', title, description),
    info: (title: string, description?: string) => push('info', title, description),
  }
}

/** Réservé aux tests : repart d'une file vide entre deux cas. */
export function resetToasts(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toasts.value = []
}
