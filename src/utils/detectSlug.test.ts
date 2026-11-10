import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectSlug } from './detectSlug'

/** Place le test sur une adresse donnée. */
function at(hostname: string) {
  vi.stubGlobal('window', { location: { hostname } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('detectSlug', () => {
  it('reads the commune from the subdomain', () => {
    at('dreux.onsignale.fr')

    expect(detectSlug()).toBe('dreux')
  })

  /**
   * Le défaut d'origine, et il n'était pas cosmétique : le repli valait
   * `'dreux'`, donc l'adresse principale du produit servait l'espace d'une
   * commune cliente à qui tapait le nom de domaine.
   */
  it('names no commune on the apex', () => {
    at('onsignale.fr')

    expect(detectSlug()).toBeNull()
  })

  it('names no commune on www, which serves the public site', () => {
    at('www.onsignale.fr')

    expect(detectSlug()).toBeNull()
  })

  it('does not take the API host for a commune', () => {
    at('api.onsignale.fr')

    expect(detectSlug()).toBeNull()
  })

  // L'hôte Vercel a trois étiquettes : il est lu comme un sous-domaine, donc
  // comme une commune — qui n'existe pas, et l'écran « commune non
  // configurée » s'affiche. C'est le comportement voulu : mieux vaut le dire
  // que servir celle d'à côté.
  it('reads a deployment host as a commune, which will simply not exist', () => {
    at('drouais-signal-front.vercel.app')

    expect(detectSlug()).toBe('drouais-signal-front')
  })

  // Le repli tient à l'hôte, pas à l'absence d'une variable : une
  // `VITE_DEV_TENANT` oubliée dans l'environnement de production ne doit pas
  // ressusciter le défaut d'origine.
  it('ignores the development fallback in production', () => {
    at('onsignale.fr')
    vi.stubEnv('VITE_DEV_TENANT', 'dreux')

    expect(detectSlug()).toBeNull()
  })

  it('falls back to the configured commune in development', () => {
    at('localhost')
    vi.stubEnv('VITE_DEV_TENANT', 'la-loupe')

    expect(detectSlug()).toBe('la-loupe')
  })
})
