import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import type { TeamRole } from '@/lib/roles'
import type { MemberStatus } from '@/lib/memberStatus'

/**
 * L'équipe d'une commune : la charger, et agir dessus.
 *
 * Les gestes vivent ici plutôt que dans l'écran parce qu'ils se ressemblent
 * tous — appeler, rafraîchir, dire ce qui s'est passé — et que la page en
 * comptait six écrits six fois, chacun avec son propre bandeau de succès et son
 * propre `setTimeout` pour le faire disparaître.
 */

export interface TeamMember {
  user_id: string
  tenant_id: string
  role: TeamRole
  first_name: string | null
  last_name: string | null
  job_title: string | null
  is_active: boolean
  invited_at: string | null
  email: string | null
  /** Calculé par le serveur : invité, actif, ou suspendu. */
  status: MemberStatus
  last_sign_in_at: string | null
  /** Changements de statut opérés par ce membre sur 30 jours. */
  handled_30d: number
}

export interface InvitePayload {
  email: string
  role: TeamRole
  firstName?: string
  lastName?: string
  jobTitle?: string
}

export function useTeam() {
  const { apiFetch } = useApi()
  const toast = useToast()

  const members = ref<TeamMember[]>([])
  const loading = ref(true)
  const acting = ref(false)

  const roleFilter = ref<'' | TeamRole>('')
  const statusFilter = ref<'' | MemberStatus>('')

  const visible = computed(() =>
    members.value.filter((member) => {
      if (roleFilter.value && member.role !== roleFilter.value) return false
      if (statusFilter.value && member.status !== statusFilter.value) return false
      return true
    })
  )

  const hasFilters = computed(() => Boolean(roleFilter.value || statusFilter.value))

  function resetFilters() {
    roleFilter.value = ''
    statusFilter.value = ''
  }

  async function load() {
    loading.value = true
    try {
      members.value = await apiFetch<TeamMember[]>('/api/tenant/users')
    } catch (err) {
      toast.error('Équipe indisponible', reason(err, 'Rechargez la page dans un instant.'))
    } finally {
      loading.value = false
    }
  }

  /**
   * Le message du serveur quand il en a un.
   *
   * « Cette commune n'aurait plus aucun administrateur » explique et dit quoi
   * faire ; « une erreur est survenue » ne fait ni l'un ni l'autre.
   */
  function reason(err: unknown, fallback: string): string {
    const message = (err as { message?: string })?.message
    return message && message !== 'Failed to fetch' ? message : fallback
  }

  /** Enveloppe commune : agir, recharger, annoncer. */
  async function run(
    action: () => Promise<unknown>,
    success: string,
    failure: string
  ): Promise<boolean> {
    acting.value = true
    try {
      await action()
      await load()
      toast.success(success)
      return true
    } catch (err) {
      toast.error(failure, reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      acting.value = false
    }
  }

  const invite = (payload: InvitePayload) =>
    run(
      () => apiFetch('/api/tenant/users/invite', { method: 'POST', body: payload }),
      `Invitation envoyée à ${payload.email}`,
      'Invitation impossible'
    )

  const changeRole = (member: TeamMember, role: TeamRole) =>
    run(
      () => apiFetch(`/api/tenant/users/${member.user_id}`, { method: 'PATCH', body: { role } }),
      'Rôle mis à jour',
      'Changement de rôle impossible'
    )

  const setActive = (member: TeamMember, isActive: boolean) =>
    run(
      () => apiFetch(`/api/tenant/users/${member.user_id}`, { method: 'PATCH', body: { isActive } }),
      isActive ? 'Accès rétabli' : 'Accès suspendu',
      isActive ? 'Réactivation impossible' : 'Suspension impossible'
    )

  const revoke = (member: TeamMember) =>
    run(
      () => apiFetch(`/api/tenant/users/${member.user_id}`, { method: 'DELETE' }),
      'Accès révoqué',
      'Révocation impossible'
    )

  const resendInvite = (member: TeamMember) =>
    run(
      () => apiFetch(`/api/tenant/users/${member.user_id}/resend-invite`, { method: 'POST' }),
      `Invitation renvoyée à ${member.email ?? 'ce membre'}`,
      'Renvoi impossible'
    )

  return {
    members, visible, loading, acting,
    roleFilter, statusFilter, hasFilters, resetFilters,
    load, invite, changeRole, setActive, revoke, resendInvite,
  }
}
