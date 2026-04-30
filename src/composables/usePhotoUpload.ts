import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

export function usePhotoUpload() {
  const { apiFetch } = useApi()
  const uploading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Compresse une image avant upload
   */
  async function compressImage(
    file: File,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img

          // Calculer les nouvelles dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context error'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Compression failed'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('Image load error'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('File read error'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Upload une photo de résolution vers le backend
   */
  async function uploadResolutionPhoto(
    file: File,
    reportId: string
  ): Promise<string | null> {
    uploading.value = true
    error.value = null

    try {
      // Compression de l'image
      const compressedBlob = await compressImage(file)

      // Créer FormData
      const formData = new FormData()
      formData.append('photo', compressedBlob, 'resolution.jpg')
      formData.append('reportId', reportId)

      // Upload via apiFetch avec isFormData: true
      const data = await apiFetch<{ url: string; filePath: string }>(
        '/api/upload/resolution-photo',
        {
          method: 'POST',
          body: formData,
          isFormData: true,
        }
      )

      return data.url
    } catch (err: any) {
      error.value = err.message || 'Erreur lors de l\'upload'
      console.error('Upload error:', err)
      return null
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading,
    error,
    uploadResolutionPhoto,
  }
}
