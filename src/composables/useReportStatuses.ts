export interface StatusConfig {
  label: string
  icon: string // Lucide icon name
  tailwindBg: string
  tailwindText: string
  dotColor: string
  // Pour les stat cards
  iconBg: string
  iconColor: string
  valueColor: string
  // Pour la timeline
  ringColor: string
  bgColor: string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  en_attente: {
    label: 'En attente',
    icon: 'Clock',
    tailwindBg: 'bg-neutral-200',
    tailwindText: 'text-neutral-700',
    dotColor: '#A3A3A3',
    // Stat cards
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    valueColor: 'text-gray-900',
    // Timeline
    ringColor: 'ring-neutral-300/30',
    bgColor: 'bg-neutral-400',
  },
  /**
   * Transmis à un service extérieur, sans réponse de sa part (migration 034).
   *
   * Il s'intercale entre l'attente et la prise en charge parce que l'envoi d'un
   * e-mail n'est pas un traitement : tant que le service n'a pas répondu,
   * personne ne s'en occupe — et le dire autrement fausse à la fois la promesse
   * faite à l'habitant et le délai moyen affiché à la commune.
   */
  transmis: {
    label: 'Transmis',
    icon: 'Send',
    tailwindBg: 'bg-brand-50',
    tailwindText: 'text-brand-700',
    dotColor: '#1A56A0',
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    valueColor: 'text-brand-900',
    ringColor: 'ring-brand-700/20',
    bgColor: 'bg-brand-700',
  },
  pris_en_charge: {
    label: 'Pris en charge',
    icon: 'Wrench',
    tailwindBg: 'bg-warning-50',
    tailwindText: 'text-warning-700',
    dotColor: '#EF9F27',
    // Stat cards
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    valueColor: 'text-orange-900',
    // Timeline
    ringColor: 'ring-warning/20',
    bgColor: 'bg-warning',
  },
  resolu: {
    label: 'Résolu',
    icon: 'CheckCircle2',
    tailwindBg: 'bg-success-50',
    tailwindText: 'text-success-700',
    dotColor: '#1D9E75',
    // Stat cards
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    valueColor: 'text-green-900',
    // Timeline
    ringColor: 'ring-success/20',
    bgColor: 'bg-success',
  },
}

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

export const useReportStatuses = () => {
  const getStatusConfig = (status: string): StatusConfig => {
    return STATUS_CONFIG[status] ?? {
      label: status,
      icon: 'Circle',
      tailwindBg: 'bg-neutral-200',
      tailwindText: 'text-neutral-700',
      dotColor: '#A3A3A3',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
      ringColor: 'ring-neutral-300/30',
      bgColor: 'bg-neutral-400',
    }
  }

  const getTimelineSteps = () => {
    return [
      { key: 'en_attente' as const, ...STATUS_CONFIG.en_attente },
      { key: 'transmis' as const, ...STATUS_CONFIG.transmis },
      { key: 'pris_en_charge' as const, ...STATUS_CONFIG.pris_en_charge },
      { key: 'resolu' as const, ...STATUS_CONFIG.resolu },
    ]
  }

  return {
    STATUS_CONFIG,
    STATUS_OPTIONS,
    getStatusConfig,
    getTimelineSteps,
  }
}
