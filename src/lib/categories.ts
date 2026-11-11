/**
 * Slug de catégorie → glyphe. **La seule table de correspondance du client web.**
 *
 * `tenant_categories.icon` porte un emoji, et c'est ce qui était affiché
 * jusqu'ici. Trois raisons de ne plus s'en servir : les emoji se dessinent
 * différemment d'un système à l'autre, ne prennent pas la couleur de la commune,
 * et jurent au milieu d'un jeu d'icônes au trait. Surtout, ils venaient de la
 * base : deux communes pouvaient afficher deux images pour la même catégorie
 * nationale, ce que la migration 026 cherchait précisément à supprimer.
 *
 * Le nom rendu est un nom d'icône lucide, que `AppIcon` résout. Pour les cas où
 * un composant Vue ne peut pas être monté — les marqueurs Leaflet, qui veulent
 * une chaîne HTML — `categoryGlyphMarkup` produit le même dessin en SVG.
 *
 * L'équivalent mobile est `mobile/src/lib/categories.ts`. Les deux listes
 * doivent rester d'accord : c'est le même produit vu par deux publics.
 */
import { createApp, h } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

/** Les onze slugs de la taxonomie nationale (migration 026). */
const BY_SLUG: Record<string, string> = {
  encombrants:   'Armchair',
  graffitis:     'SprayCan',
  proprete:      'Trash2',
  stationnement: 'Car',
  mobilier:      'Lightbulb',
  voirie:        'Construction',
  commerce:      'Store',
  vegetation:    'Trees',
  eau:           'Droplets',
  local:         'MapPin',
  autre:         'CircleHelp',
}

/**
 * Slug → libellé national, en version courte.
 *
 * Les libellés par défaut de la taxonomie (migration 026) sont des phrases —
 * « Objets abandonnés et encombrants » — faites pour un habitant qui choisit
 * une catégorie. Ici on les met dans une pastille à côté d'un nombre, pour dire
 * de quoi parlent les habitants d'une commune : c'est la version courte qui
 * convient.
 *
 * Ce repli ne sert que là où aucune commune ne décide — l'écran des communes
 * sans mairie. Partout ailleurs, c'est le libellé choisi par la mairie qui fait
 * foi, et il vient du serveur.
 */
const LABELS: Record<string, string> = {
  encombrants:   'Encombrants',
  graffitis:     'Graffitis',
  proprete:      'Propreté',
  stationnement: 'Stationnement',
  mobilier:      'Mobilier et éclairage',
  voirie:        'Voirie',
  commerce:      'Commerces',
  vegetation:    'Végétation',
  eau:           'Eau',
  local:         'Spécificité locale',
  autre:         'Autre',
}

export function categoryLabel(slug: string): string {
  return LABELS[slug] ?? slug
}

/**
 * Mot-clé → glyphe, essayé dans l'ordre sur un slug ou un libellé inconnu.
 *
 * Deux cas le rendent nécessaire : les communes installées avant la migration
 * 026, dont les anciens slugs locaux (`eclairage`, `dechets`…) survivent dans
 * de vieilles lignes, et le libellé que la mairie choisit librement pour la
 * catégorie `local`.
 */
const BY_KEYWORD: [string, string][] = [
  ['voir',       'Construction'],
  ['chausse',    'Construction'],
  ['route',      'Construction'],
  ['travaux',    'Construction'],
  ['eclair',     'Lightbulb'],
  ['lumi',       'Lightbulb'],
  ['urbanis',    'Building2'],
  ['batiment',   'Building2'],
  ['dechet',     'Trash2'],
  ['proprete',   'Trash2'],
  ['ordure',     'Trash2'],
  ['encombrant', 'Armchair'],
  ['mobilier',   'Armchair'],
  ['banc',       'Armchair'],
  ['tag',        'SprayCan'],
  ['graffiti',   'SprayCan'],
  ['stationn',   'Car'],
  ['vehicule',   'Car'],
  ['vert',       'Trees'],
  ['arbre',      'Trees'],
  ['parc',       'Trees'],
  ['vegeta',     'Trees'],
  ['commerce',   'Store'],
  ['terrasse',   'Store'],
  ['eau',        'Droplets'],
  ['fuite',      'Droplets'],
  ['inondation', 'Droplets'],
]

/** Accents retirés, pour que « propreté » rencontre le mot-clé en ASCII. */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function categoryGlyph(slug: string, label?: string): string {
  const known = BY_SLUG[slug]
  if (known) return known

  const words = fold(`${slug} ${label ?? ''}`).split(/[^a-z0-9]+/).filter(Boolean)

  // Comparé en *préfixe de mot*, jamais en sous-chaîne : « eau » se trouve dans
  // « nouveau », « réseau » et « bureau », et un test de sous-chaîne classerait
  // la moitié du dictionnaire sous une conduite d'eau. Le préfixe attrape
  // quand même les flexions utiles — « eclairage » depuis « eclair ».
  for (const [keyword, name] of BY_KEYWORD) {
    if (words.some((word) => word.startsWith(keyword))) return name
  }

  return 'Pin'
}

/**
 * Le même glyphe, en SVG, pour les marqueurs Leaflet.
 *
 * Leaflet veut une chaîne HTML : aucun composant Vue ne peut y être monté. Le
 * composant est donc rendu une fois dans un élément détaché, et c'est son
 * balisage qui part sur la carte. Le détour vaut mieux que la seule autre
 * option — une deuxième table de correspondance, en SVG à la main, qui
 * divergerait de celle-ci à la première catégorie ajoutée.
 */
export function categoryGlyphMarkup(
  slug: string,
  options: { size?: number; color?: string; label?: string } = {}
): string {
  const { size = 16, color = '#FFFFFF', label } = options
  const component = (LucideIcons as any)[categoryGlyph(slug, label)]
  if (!component) return ''

  const host = document.createElement('div')
  const app = createApp({
    render: () => h(component, { size, color, 'stroke-width': 2 }),
  })

  app.mount(host)
  const markup = host.innerHTML
  app.unmount()

  return markup
}
