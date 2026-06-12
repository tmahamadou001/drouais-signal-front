const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920
const QUALITY = 0.85
const MAX_SIZE_BYTES = 4.5 * 1024 * 1024 // 4.5 MB — marge sous la limite serveur de 5 MB

export async function compressImage(file: File): Promise<File> {
  // Pas une image ou déjà assez petite → on retourne tel quel
  if (!file.type.startsWith('image/') || file.size <= MAX_SIZE_BYTES) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Calcul du ratio pour ne pas dépasser MAX_WIDTH x MAX_HEIGHT
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas non disponible'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression échouée'))
            return
          }
          // Conserver le nom d'origine avec extension .jpg
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }))
        },
        'image/jpeg',
        QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Impossible de lire l\'image'))
    }

    img.src = objectUrl
  })
}
