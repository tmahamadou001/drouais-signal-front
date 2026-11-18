import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * La politique de sécurité de `vercel.json` doit autoriser ce que le code appelle.
 *
 * Un hôte retiré de `connect-src` ne fait aucun bruit au build ni aux tests :
 * le navigateur refuse l'appel en production, et la fonction concernée cesse
 * simplement de marcher — c'est ce qui est arrivé à la recherche d'adresse du
 * back-office. Ce test relie les deux.
 */
const config = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8')) as {
  headers: { headers: { key: string; value: string }[] }[]
}

const csp =
  config.headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === 'Content-Security-Policy')?.value ?? ''

const directive = (name: string) =>
  csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? ''

describe('Content-Security-Policy', () => {
  it('lets the back-office search addresses (lib/ban.ts)', () => {
    expect(directive('connect-src')).toContain('https://api-adresse.data.gouv.fr')
  })

  it('lets the API and Supabase answer', () => {
    expect(directive('connect-src')).toContain('https://api.onsignale.fr')
    expect(directive('connect-src')).toContain('https://*.supabase.co')
  })

  it('lets the map draw its tiles', () => {
    expect(directive('img-src')).toContain('https://*.tile.openstreetmap.org')
  })
})
