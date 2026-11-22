import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportConversation from './ReportConversation.vue'

const msg = (over: Record<string, unknown> = {}) => ({ id: 'm1', authorType: 'agent', content: 'Bonjour', createdAt: '2026-11-22T10:00:00Z', ...over })
const mountConv = (messages: unknown[]) => mount(ReportConversation, { props: { messages: messages as never, loading: false }, global: { stubs: { AppIcon: true } } })

describe('ReportConversation — précision et e-mail', () => {
  it('flags a question from the commune', () => {
    const wrapper = mountConv([msg({ isQuestion: true })])
    expect(wrapper.find('[data-testid="question-badge"]').text()).toBe('Précision demandée')
  })

  it('says a reply came by e-mail', () => {
    const wrapper = mountConv([msg({ id: 'm2', authorType: 'citizen', via: 'email' })])
    expect(wrapper.find('[data-testid="email-badge"]').text()).toBe('Par e-mail')
  })

  it('shows no badge on an ordinary exchange', () => {
    const wrapper = mountConv([msg(), msg({ id: 'm2', authorType: 'citizen', via: 'app' })])
    expect(wrapper.find('[data-testid="question-badge"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="email-badge"]').exists()).toBe(false)
  })
})
