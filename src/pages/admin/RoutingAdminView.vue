<script setup lang="ts">
/**
 * L'aiguillage : à qui arrive un signalement neuf, selon sa catégorie.
 *
 * Chaque ligne se règle et s'enregistre **d'elle-même** : choisir une personne
 * ou un service suffit. Sans règle, le signalement reste « à assigner » et un
 * membre l'attribue à la main — c'est le cas de départ, et il est annoncé.
 *
 * Le service destinataire (adresse e-mail extérieure) reste réglé dans les
 * Paramètres : on y *transmet* au dehors, ici on *confie* au dedans. Les deux
 * coexistent, et la colonne de droite rappelle ce qui est configuré côté
 * transmission pour ne pas faire croire qu'il manque quelque chose.
 */
import { onMounted } from 'vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useRouting } from '@/composables/useRouting'
import { useServices } from '@/composables/useServices'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import { memberLabel } from '@/lib/members'
import { useTenantCategories } from '@/composables/useTenantCategories'

const routing = useRouting()
const servicesStore = useServices()
const directory = useTeamDirectory()
const { categories, getServiceEmails } = useTenantCategories()

onMounted(() => {
  void routing.load()
  void servicesStore.load()
  void directory.load()
})

const valueOf = (category: string, field: 'assigneeId' | 'serviceId'): string =>
  routing.ruleOf(category)?.[field] ?? ''

async function change(category: string, field: 'assigneeId' | 'serviceId', value: string) {
  const current = routing.ruleOf(category)
  await routing.save(category, {
    assigneeId: field === 'assigneeId' ? value || null : current?.assigneeId ?? null,
    serviceId: field === 'serviceId' ? value || null : current?.serviceId ?? null,
  })
}
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader />

    <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 py-[22px]">
      <p class="max-w-[68ch] text-[13px] leading-[1.55] text-muted">
        Pour chaque catégorie, choisissez qui reçoit les nouveaux signalements : une personne, un service,
        ou les deux. Une catégorie sans règle laisse le signalement « à assigner ». Cela ne change rien
        aux signalements déjà là, et n’empêche jamais de les réassigner à la main.
      </p>

      <p v-if="servicesStore.services.value.length === 0" class="flex max-w-[68ch] items-start gap-2 rounded-[10px] bg-status-pending-bg px-3.5 py-3 text-[13px] leading-[1.5] text-ink">
        <AppIcon name="Info" :size="16" class="mt-0.5 flex-none text-muted" />
        <span>Vous n’avez pas encore créé de service. Vous pouvez aiguiller vers une personne, ou
          <RouterLink to="/admin/services" class="font-semibold text-brand-700 hover:underline">créer un service</RouterLink> d’abord.</span>
      </p>

      <div class="overflow-x-auto rounded-[14px] border border-line bg-white">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr class="border-b border-line">
              <th class="px-4 py-3 text-[11px] font-semibold tracking-[0.08em] text-muted">CATÉGORIE</th>
              <th class="px-4 py-3 text-[11px] font-semibold tracking-[0.08em] text-muted">PERSONNE</th>
              <th class="px-4 py-3 text-[11px] font-semibold tracking-[0.08em] text-muted">SERVICE</th>
              <th class="px-4 py-3 text-[11px] font-semibold tracking-[0.08em] text-muted">TRANSMISSION EXTÉRIEURE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="category in categories" :key="category.slug" class="border-b border-line/60 last:border-0" :data-testid="`rule-${category.slug}`">
              <td class="px-4 py-3 text-[13px] font-semibold text-ink">{{ category.label }}</td>
              <td class="px-4 py-3">
                <select
                  :value="valueOf(category.slug, 'assigneeId')" :aria-label="`Personne pour ${category.label}`"
                  class="h-9 w-full rounded-[10px] border border-line bg-white px-2.5 text-[13px] text-ink outline-none focus:border-brand-700"
                  @change="change(category.slug, 'assigneeId', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">— Personne —</option>
                  <option v-for="member in directory.assignable.value" :key="member.userId" :value="member.userId">{{ memberLabel(member, 'Membre sans nom') }}</option>
                </select>
              </td>
              <td class="px-4 py-3">
                <select
                  :value="valueOf(category.slug, 'serviceId')" :aria-label="`Service pour ${category.label}`"
                  class="h-9 w-full rounded-[10px] border border-line bg-white px-2.5 text-[13px] text-ink outline-none focus:border-brand-700"
                  @change="change(category.slug, 'serviceId', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">— Aucun —</option>
                  <option v-for="service in servicesStore.services.value" :key="service.id" :value="service.id">{{ service.name }}</option>
                </select>
              </td>
              <td class="px-4 py-3 text-xs text-muted">
                <template v-if="getServiceEmails(category.slug).length > 0">{{ getServiceEmails(category.slug).join(', ') }}</template>
                <template v-else>—</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
