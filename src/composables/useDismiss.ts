import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Referme un menu au clic extérieur ou sur Échap.
 *
 * Chaque menu gère son propre dismiss : la page n'a plus à se promener avec un
 * `closeMenus()` à appeler depuis la racine, ce qui obligeait chaque nouveau menu
 * à s'y inscrire — et le premier oublié restait ouvert par-dessus le suivant.
 */
export function useDismiss(root: Ref<HTMLElement | null>, onDismiss: () => void) {
  const onClick = (event: MouseEvent) => {
    if (root.value && !root.value.contains(event.target as Node)) onDismiss()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onDismiss()
  }

  onMounted(() => {
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKey)
  })
}
