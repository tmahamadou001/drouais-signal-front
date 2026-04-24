import { defineStore } from 'pinia'

interface AiResult {
  category: string
  title: string
  description: string
  confidence: 'fort' | 'moyen' | 'faible'
}

export const useReportStore = defineStore('report', {
  state: () => ({
    // Photo
    photoFile: null as File | null,
    photoPreviewUrl: null as string | null,

    // Résultat IA
    aiResult: null as AiResult | null,
    aiLoading: false,
    aiError: false,

    // Valeurs finales (éditées ou validées)
    category: '' as string,
    title: '' as string,
    description: '' as string,

    // Géolocalisation
    lat: null as number | null,
    lng: null as number | null,
    addressApprox: '' as string,

    // Mode authentification
    isAnonymous: false as boolean,
    anonymousEmail: '' as string,

    // Navigation
    currentScreen: 1 as 1 | 2 | 3 | 4 | 5,
  }),

  actions: {
    setPhoto(file: File, previewUrl: string) {
      this.photoFile = file
      this.photoPreviewUrl = previewUrl
      this.currentScreen = 3
    },

    setAiResult(result: AiResult) {
      this.aiResult = result
      // Pré-remplir les valeurs finales avec le résultat IA
      this.category = result.category
      this.title = result.title
      this.description = result.description
      this.aiLoading = false
      this.aiError = false
      this.currentScreen = 4
    },

    setAiError() {
      this.aiError = true
      this.aiLoading = false
      this.aiResult = null
      // Passer en mode manuel avec champs vides
      this.category = ''
      this.title = ''
      this.description = ''
      this.currentScreen = 4
    },

    updateCategory(category: string) {
      this.category = category
    },

    updateTitle(title: string) {
      this.title = title
    },

    updateDescription(description: string) {
      this.description = description
    },

    setLocation(lat: number, lng: number, addressApprox: string) {
      this.lat = lat
      this.lng = lng
      this.addressApprox = addressApprox
    },

    validateAndGeolocate() {
      console.log('validateAndGeolocate')
      this.currentScreen = 5
    },

    goToScreen(screen: 1 | 2 | 3 | 4 | 5) {
      this.currentScreen = screen
    },

    setAuthMode(isAnonymous: boolean, email?: string) {
      this.isAnonymous = isAnonymous
      this.anonymousEmail = email || ''
      this.currentScreen = 2
    },

    reset() {
      this.$reset()
    },
  },
})
