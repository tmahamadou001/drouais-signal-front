import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'

const { login, replace, state, query } = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
  state: {} as Record<string, any>,
  query: { value: {} as Record<string, string> },
}))

state.user = ref<unknown>(null)
state.tenantRole = ref<string | null>(null)
state.loading = ref(false)
state.error = ref<string | null>(null)

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login,
    get loading() { return state.loading.value },
    get error() { return state.error.value },
    get isAuthenticated() { return state.user.value !== null },
    get isAdmin() { return state.tenantRole.value === 'admin' || state.tenantRole.value === 'super_admin' },
    get isTeamMember() {
      return ['observer', 'agent', 'admin', 'super_admin'].includes(state.tenantRole.value ?? '')
    },
  }),
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRouter: () => ({ replace }),
    useRoute: () => ({ query: query.value }),
    RouterLink: { template: '<a><slot /></a>' },
  }
})

vi.mock('@/components/auth/AuthShell.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

import AuthView from './AuthView.vue'

const DENIED = 'n’a pas accès'

function view() {
  return mount(AuthView, { global: { stubs: { AppIcon: true } } })
}

async function fillAndSubmit(wrapper: ReturnType<typeof view>) {
  await wrapper.find('#email').setValue('agent@mairie.fr')
  await wrapper.find('#password').setValue('motdepasse')
  await wrapper.find('form').trigger('submit')
}

beforeEach(() => {
  vi.clearAllMocks()
  state.user.value = null
  state.tenantRole.value = null
  state.loading.value = false
  state.error.value = null
  query.value = {}
})

describe('signing in', () => {
  /**
   * `login()` opens the session before it fetches the role, so "authenticated
   * but not admin" is true for the whole of that request. Inferring the refusal
   * from it flashed "this account has no access" on every normal sign-in.
   */
  it('shows no refusal while the role is still being fetched', async () => {
    login.mockImplementation(async () => {
      state.user.value = { id: 'u1' }
      await Promise.resolve()
      state.tenantRole.value = 'admin'
      return { success: true }
    })

    const wrapper = view()
    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(wrapper.text()).not.toContain(DENIED)
    expect(replace).toHaveBeenCalledWith('/admin')
  })

  /**
   * Le défaut qui a renvoyé un agent à la porte.
   *
   * La connexion exigeait `isAdmin` alors que le serveur venait de répondre
   * `role: "agent"`. Les gardes des écrans acceptaient agents et
   * observateurs ; l'entrée, elle, ne les laissait pas passer — et elle
   * annulait tout le reste.
   */
  for (const role of ['agent', 'observer', 'admin', 'super_admin']) {
    it(`lets a ${role} in`, async () => {
      login.mockImplementation(async () => {
        state.user.value = { id: 'u1' }
        state.tenantRole.value = role
        return { success: true }
      })

      const wrapper = view()
      await fillAndSubmit(wrapper)
      await flushPromises()

      expect(wrapper.text()).not.toContain(DENIED)
      expect(replace).toHaveBeenCalledWith('/admin')
    })
  }

  /** Un habitant n'a rien à faire dans le back-office : la règle tient. */
  it('says so when the account really has no access', async () => {
    login.mockImplementation(async () => {
      state.user.value = { id: 'u1' }
      state.tenantRole.value = 'citizen'
      return { success: true }
    })

    const wrapper = view()
    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain(DENIED)
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows what the store reported when the credentials are wrong', async () => {
    login.mockResolvedValue({ success: false })
    state.error.value = 'Identifiants incorrects'

    const wrapper = view()
    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Identifiants incorrects')
  })

  it('explains the refusal the router guard already made', () => {
    query.value = { denied: '1' }

    expect(view().text()).toContain(DENIED)
  })

  /**
   * `?redirect=` comes from the URL: it may only point back into the admin.
   */
  it('follows a redirect inside the admin', async () => {
    query.value = { redirect: '/admin/equipe' }
    login.mockImplementation(async () => {
      state.user.value = { id: 'u1' }
      state.tenantRole.value = 'admin'
      return { success: true }
    })

    await fillAndSubmit(view())
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/admin/equipe')
  })

  it('ignores a redirect that points anywhere else', async () => {
    query.value = { redirect: 'https://ailleurs.example' }
    login.mockImplementation(async () => {
      state.user.value = { id: 'u1' }
      state.tenantRole.value = 'admin'
      return { success: true }
    })

    await fillAndSubmit(view())
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/admin')
  })
})
