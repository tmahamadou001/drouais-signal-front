export interface StatusConfig {
  label: string
  tailwindBg: string
  tailwindText: string
  dotColor: string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  en_attente: {
    label: 'En attente',
    tailwindBg: 'bg-neutral-200',
    tailwindText: 'text-neutral-700',
    dotColor: '#A3A3A3',
  },
  pris_en_charge: {
    label: 'Pris en charge',
    tailwindBg: 'bg-warning-50',
    tailwindText: 'text-warning-700',
    dotColor: '#EF9F27',
  },
  resolu: {
    label: 'Résolu',
    tailwindBg: 'bg-success-50',
    tailwindText: 'text-success-700',
    dotColor: '#1D9E75',
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
      tailwindBg: 'bg-neutral-200',
      tailwindText: 'text-neutral-700',
      dotColor: '#A3A3A3',
    }
  }

  return { STATUS_CONFIG, STATUS_OPTIONS, getStatusConfig }
}
