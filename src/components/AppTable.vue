<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed } from 'vue'
import AppCheckbox from './AppCheckbox.vue'

interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  hidden?: 'sm' | 'md' | 'lg'
  sortable?: boolean
  render?: (row: T) => string
}

interface Props {
  columns: Column<T>[]
  data: T[]
  rowKey: string
  selectable?: boolean
  loading?: boolean
  emptyMessage?: string
  highlightRow?: (row: T) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  loading: false,
  emptyMessage: 'Aucune donnée disponible',
})

const emit = defineEmits<{
  rowClick: [row: T]
  selectionChange: [selectedIds: string[]]
}>()

const selectedIds = ref<Set<string>>(new Set())

const allSelected = computed(() => {
  if (props.data.length === 0) return false
  return props.data.every(row => selectedIds.value.has(row[props.rowKey]))
})

const someSelected = computed(() => {
  return selectedIds.value.size > 0 && !allSelected.value
})

const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.value.clear()
  } else {
    props.data.forEach(row => {
      selectedIds.value.add(row[props.rowKey])
    })
  }
  emitSelectionChange()
}

const toggleRow = (row: T) => {
  const id = row[props.rowKey]
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  emitSelectionChange()
}

const emitSelectionChange = () => {
  emit('selectionChange', Array.from(selectedIds.value))
}

const handleRowClick = (row: T, event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.closest('input[type="checkbox"]') || target.closest('[data-no-row-click]')) {
    return
  }
  emit('rowClick', row)
}

const getHiddenClass = (hidden?: 'sm' | 'md' | 'lg') => {
  if (!hidden) return ''
  const map = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
  }
  return map[hidden]
}

const getAlignClass = (align?: 'left' | 'center' | 'right') => {
  const map = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  return map[align || 'left']
}

const clearSelection = () => {
  selectedIds.value.clear()
  emitSelectionChange()
}

defineExpose({
  clearSelection,
  selectedIds: computed(() => Array.from(selectedIds.value)),
})
</script>

<template>
  <div class="bg-white rounded-ds-xl border border-neutral-200 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-neutral-50 border-b border-neutral-200">
            <th v-if="selectable" class="px-4 py-3 w-12">
              <AppCheckbox
                :model-value="allSelected"
                :indeterminate="someSelected"
                @update:model-value="toggleAll"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'px-4 py-3 font-semibold text-neutral-600',
                getAlignClass(column.align),
                getHiddenClass(column.hidden),
              ]"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody v-if="!loading && data.length > 0">
          <tr
            v-for="row in data"
            :key="row[rowKey]"
            :class="[
              'border-b border-neutral-100 cursor-pointer transition-colors',
              highlightRow?.(row) ? 'bg-blue-50' : 'bg-white hover:bg-neutral-50',
            ]"
            @click="handleRowClick(row, $event)"
          >
            <td v-if="selectable" class="px-4 py-3" @click.stop>
              <AppCheckbox
                :model-value="selectedIds.has(row[rowKey])"
                @update:model-value="toggleRow(row)"
              />
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[
                'px-4 py-3',
                getAlignClass(column.align),
                getHiddenClass(column.hidden),
              ]"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ column.render ? column.render(row) : row[column.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="loading" class="py-12 text-center">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p class="text-sm text-neutral-500 mt-3">Chargement...</p>
      </div>
      
      <div v-else-if="data.length === 0" class="py-12 text-center">
        <p class="text-sm text-neutral-500">{{ emptyMessage }}</p>
      </div>
    </div>
    
    <slot name="footer" />
  </div>
</template>
