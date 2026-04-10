import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'

export function useTenantCategories() {
  const tenantStore = useTenantStore()

  const categories = computed(() => tenantStore.activeCategories)

  const getCategoryLabel = (slug: string): string => {
    return tenantStore.activeCategories.find((c) => c.slug === slug)?.label ?? slug
  }

  const getCategoryIcon = (slug: string): string => {
    return tenantStore.activeCategories.find((c) => c.slug === slug)?.icon ?? '📌'
  }

  const getCategoryColor = (slug: string): string => {
    return tenantStore.activeCategories.find((c) => c.slug === slug)?.color ?? '#6B7280'
  }

  const getCategoryDisplay = (slug: string): string => {
    const cat = tenantStore.activeCategories.find((c) => c.slug === slug)
    return cat ? `${cat.icon} ${cat.label}` : slug
  }

  return { categories, getCategoryLabel, getCategoryIcon, getCategoryColor, getCategoryDisplay }
}
