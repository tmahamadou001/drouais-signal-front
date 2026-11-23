import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * Un agent ne règle rien de la commune : la section « Collectivité » ne doit pas lui montrer un titre
 * au-dessus de rien. Un administrateur, lui, y trouve ses écrans.
 */
const auth = vi.hoisted(() => ({ isAdmin: false, isSuperAdmin: false, user: { email: 'agent@exemple.fr' } }))

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/admin/signalements' }), RouterLink: { props: ['to'], template: '<a><slot /></a>' } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/stores/tenant', () => ({ useTenantStore: () => ({ name: 'Dreux', config: { city_name: 'Dreux' }, features: { heatmap: true, weeklyReport: true } }) }))

import AdminSidebar from './AdminSidebar.vue'

const sidebar = () => mount(AdminSidebar, { global: { stubs: { AppIcon: true, BrandWordmark: true, RouterLink: { props: ['to'], template: '<a><slot /></a>' } } } })

describe('AdminSidebar — Collectivité', () => {
  it('is hidden, title included, when the role has nothing to set', () => {
    auth.isAdmin = false
    auth.isSuperAdmin = false
    expect(sidebar().find('[data-testid="collectivity-title"]').exists()).toBe(false)
  })

  it('is there for an administrator', () => {
    auth.isAdmin = true
    const wrapper = sidebar()
    expect(wrapper.find('[data-testid="collectivity-title"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Équipe')
  })
})
