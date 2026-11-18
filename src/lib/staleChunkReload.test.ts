import { describe, it, expect, vi } from 'vitest'
import { isStaleChunkError, reloadOnceForStaleChunk } from './staleChunkReload'

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('isStaleChunkError', () => {
  it('recognises the messages browsers give for a missing chunk', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/A-1.js'))).toBe(true)
    expect(isStaleChunkError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true)
  })

  it('ignores any other error', () => {
    expect(isStaleChunkError(new Error('Network Error'))).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('reloadOnceForStaleChunk', () => {
  it('reloads the first time', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleChunk(memory(), reload, 1000)).toBe(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not loop: a second failure within a minute is left alone', () => {
    const reload = vi.fn()
    const storage = memory()
    reloadOnceForStaleChunk(storage, reload, 1000)
    expect(reloadOnceForStaleChunk(storage, reload, 20_000)).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads again for a later deployment', () => {
    const reload = vi.fn()
    const storage = memory()
    reloadOnceForStaleChunk(storage, reload, 1000)
    expect(reloadOnceForStaleChunk(storage, reload, 200_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('still reloads once when storage is unavailable', () => {
    const reload = vi.fn()
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(reloadOnceForStaleChunk(broken, reload)).toBe(true)
  })
})
