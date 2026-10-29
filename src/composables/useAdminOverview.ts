import { ref, readonly } from 'vue'

/**
 * Les deux chiffres que la barre latérale affiche et que seule la page des
 * signalements connaît : le nombre total de signalements, et le délai moyen
 * avant prise en charge.
 *
 * Un état de module plutôt qu'un store Pinia : il n'y a ni action, ni règle
 * métier, ni persistance — deux valeurs qu'un écran publie et qu'un autre lit.
 * Et plutôt qu'un `provide`/`inject`, parce que la barre latérale est montée
 * par le layout, donc *au-dessus* de la page qui produit les chiffres : elle ne
 * pourrait pas les injecter vers le haut.
 *
 * Les données restent en place d'un écran à l'autre. C'est voulu : la barre
 * latérale est visible partout, et la vider en changeant de page ferait
 * clignoter le bloc « Délai moyen » à chaque navigation.
 */

const reportCount = ref<number | null>(null)
const avgAckHours = ref<number | null>(null)

export function useAdminOverview() {
  return {
    reportCount: readonly(reportCount),
    avgAckHours: readonly(avgAckHours),

    setReportCount: (value: number | null) => { reportCount.value = value },
    setAvgAckHours: (value: number | null) => { avgAckHours.value = value },
  }
}
