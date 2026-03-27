import { ref } from 'vue'

export function useGeolocation() {
  const latitude = ref<number | null>(null)
  const longitude = ref<number | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) {
      error.value = 'La géolocalisation n\'est pas supportée par votre navigateur.'
      return null
    }

    loading.value = true
    error.value = null

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude.value = position.coords.latitude
          longitude.value = position.coords.longitude
          loading.value = false
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        (err) => {
          loading.value = false
          switch (err.code) {
            case err.PERMISSION_DENIED:
              error.value = 'Vous avez refusé l\'accès à votre position. Placez le marqueur sur la carte.'
              break
            case err.POSITION_UNAVAILABLE:
              error.value = 'Position indisponible. Placez le marqueur sur la carte.'
              break
            case err.TIMEOUT:
              error.value = 'Délai dépassé. Placez le marqueur sur la carte.'
              break
            default:
              error.value = 'Erreur de géolocalisation. Placez le marqueur sur la carte.'
          }
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      )
    })
  }

  return {
    latitude,
    longitude,
    error,
    loading,
    getCurrentPosition,
  }
}
