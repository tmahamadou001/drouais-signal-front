import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToast, resetToasts, TOAST_DURATIONS } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetToasts()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * The queue lives at module level: a toast pushed from any screen has to be
   * read by the single host mounted in the layout.
   */
  it('shares its queue between callers', () => {
    useToast().success('Statut mis à jour')

    expect(useToast().toasts.value).toHaveLength(1)
    expect(useToast().toasts.value[0].title).toBe('Statut mis à jour')
  })

  it('carries the description when there is one', () => {
    const toast = useToast()
    toast.error('Transmission impossible', 'Vérifiez l’adresse du service.')

    expect(toast.toasts.value[0]).toMatchObject({
      variant: 'error',
      description: 'Vérifiez l’adresse du service.',
    })
  })

  it('dismisses itself after its own duration', () => {
    const toast = useToast()
    toast.success('Fait')

    vi.advanceTimersByTime(TOAST_DURATIONS.success - 1)
    expect(toast.toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  /** An error is read, and sometimes copied: it does not go in four seconds. */
  it('keeps an error on screen longer than a success', () => {
    expect(TOAST_DURATIONS.error).toBeGreaterThan(TOAST_DURATIONS.success)
  })

  it('dismisses on demand, and stops the timer', () => {
    const toast = useToast()
    const id = toast.info('Chargement')

    toast.dismiss(id)
    expect(toast.toasts.value).toHaveLength(0)

    // No leftover timer may resurrect or re-remove anything.
    vi.advanceTimersByTime(TOAST_DURATIONS.info)
    expect(toast.toasts.value).toHaveLength(0)
  })

  /** A stack that covers the screen is a stack nobody reads. */
  it('keeps only the four most recent', () => {
    const toast = useToast()
    for (let index = 0; index < 6; index += 1) toast.success(`Message ${index}`)

    expect(toast.toasts.value).toHaveLength(4)
    expect(toast.toasts.value[0].title).toBe('Message 2')
    expect(toast.toasts.value[3].title).toBe('Message 5')
  })
})
