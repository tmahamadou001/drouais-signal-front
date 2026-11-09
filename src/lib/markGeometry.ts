/**
 * La marque OnSignale — « le O qui signale ».
 *
 * Un anneau, la vie ordinaire de la commune, interrompu par un point ambre :
 * le problème qu'on remarque. Le point prend la place du morceau manquant.
 * Posé dans le nom, cet anneau devient le « O » de OnSignale — le logo et le
 * nom ne font qu'un.
 *
 * Valeurs recopiées de `logo/logo-geometry.json`, jamais redessinées : refermer
 * l'anneau ou rétrécir l'ouverture en ferait un « O » banal ou un « Q ».
 *
 * `LENGTH` est la longueur de l'arc. Elle ne sert pas à dessiner mais à
 * animer : c'est le `stroke-dashoffset` de départ, celui qui fait que l'anneau
 * s'écrit depuis le bord droit de l'ouverture.
 */

export const VIEW_BOX = '12.5 12.5 75 75'

export const RING = {
  d: "M80.7 45.7 A31 31 0 1 1 54.3 19.3",
  strokeWidth: 13,
  /** Longueur de l'arc, pour le tracé animé. */
  length: 156.9,
} as const

export const DOT = { cx: 71.9, cy: 28.1, r: 9 } as const

/**
 * La version longue : l'anneau **remplace** le O, et le texte reprend à « n ».
 *
 * Les proportions sont en em de la taille du nom, donc indépendantes de la
 * taille d'affichage. `baselineOffsetEm` corrige l'optique : un disque posé sur
 * la ligne de base paraît flotter si on l'y aligne géométriquement.
 *
 * La charte l'exige en Instrument Sans Bold et interdit toute autre police :
 * recomposer le nom ailleurs casserait l'alignement de l'anneau sur le « n ».
 */
export const WORDMARK = {
  text: "nSignale",
  fontFamily: 'InstrumentSans-Bold',
  letterSpacingEm: -0.02,
  markSizeEm: 0.74,
  gapEm: 0.035,
  baselineOffsetEm: 0.014,
} as const

/**
 * Métriques d'Instrument Sans Bold, lues dans la police elle-même
 * (`unitsPerEm` 1000, `hhea` : ascendante 970, descendante −250).
 *
 * Elles servent à retrouver **la ligne de base**, qui est la seule référence
 * correcte pour poser l'anneau — et la seule que les boîtes de mise en page ne
 * donnent pas directement.
 */
const FONT_ASCENDER_EM = 0.97
const FONT_DESCENDER_EM = 0.25

/**
 * Où tombe la ligne de base dans une boîte de texte dont l'interligne vaut
 * exactement la taille de police.
 *
 * Le dessin de la police mesure 1,22 em de haut pour 1 em d'interligne : il
 * déborde donc, et le moteur le centre — d'où le `/2`. La ligne de base est
 * ensuite à une ascendante du haut de ce dessin.
 */
const BASELINE_FROM_TOP_EM = (1 - (FONT_ASCENDER_EM + FONT_DESCENDER_EM)) / 2 + FONT_ASCENDER_EM

/**
 * Décalage du haut de l'anneau par rapport au haut de la boîte de texte, en em.
 *
 * React Native n'aligne pas sur la ligne de base — `flex-end` aligne sur le bas
 * de la boîte, **descendante comprise**. L'anneau se retrouvait donc un quart
 * de cadratin trop bas, et ne s'alignait plus sur le « S ». On le pose ici par
 * le haut, à une position calculée depuis la ligne de base.
 *
 * Vérifiable sur `logo/svg/wordmark-navy.svg`, où la ligne de base est à
 * `y = 0` : le groupe de la marque y est posé à `translate(0 -72.6)` pour une
 * taille de police de 100, soit un haut à 0,726 em au-dessus de la ligne de
 * base et un bas à 0,014 em en dessous — le débord optique d'une lettre ronde.
 */
export const MARK_TOP_EM =
  BASELINE_FROM_TOP_EM - (WORDMARK.markSizeEm - WORDMARK.baselineOffsetEm)

export type MarkTone = 'navy' | 'white' | 'mono-black' | 'mono-white'

/**
 * Le logo ne prend **jamais** la couleur de la commune. Une commune remplace
 * `brand-700` sur ses boutons et ses en-têtes ; la marque reste marine ou
 * blanche, avec son point ambre. D'où un jeu fermé plutôt qu'une couleur libre.
 */
export const MARK_TONES: Record<MarkTone, { fg: string; dot: string }> = {
  navy: { fg: '#0F2B4A', dot: '#EF9F27' },
  white: { fg: '#FFFFFF', dot: '#EF9F27' },
  /** Impression noir et blanc, tampon, fax. */
  'mono-black': { fg: '#111827', dot: '#111827' },
  /** Icône monochrome Android, fond photo, fond coloré tiers. */
  'mono-white': { fg: '#FFFFFF', dot: '#FFFFFF' },
}

/** Charte §1 : en dessous, l'ouverture n'est plus lisible. */
export const MIN_MARK_PX = 16
