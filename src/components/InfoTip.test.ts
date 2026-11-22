import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoTip from './InfoTip.vue'

const make = (props = {}) => mount(InfoTip, { props: { text: 'Part des signalements résolus.', title: 'Taux', ...props }, attachTo: document.body })

describe('InfoTip', () => {
  it('stays closed until asked: a page full of definitions is noise', () => {
    expect(make().find('[role="tooltip"]').exists()).toBe(false)
  })

  it('opens on click — touch screens have no hover — and says what it is for', async () => {
    const tip = make()
    await tip.get('button').trigger('click')
    expect(tip.get('[role="tooltip"]').text()).toContain('Part des signalements résolus.')
    expect(tip.get('button').attributes('aria-expanded')).toBe('true')
    expect(tip.get('button').attributes('aria-label')).toContain('Taux')
  })

  it('a click after the hover keeps it open: hover then click must not toggle it shut', async () => {
    const tip = make()
    await tip.trigger('mouseenter')
    await tip.get('button').trigger('click')
    expect(tip.find('[role="tooltip"]').exists()).toBe(true)
  })

  it('opens on keyboard focus and on hover, closes when the pointer leaves', async () => {
    const tip = make()
    await tip.get('button').trigger('focus')
    expect(tip.find('[role="tooltip"]').exists()).toBe(true)
    await tip.get('button').trigger('blur')
    expect(tip.find('[role="tooltip"]').exists()).toBe(false)
    await tip.trigger('mouseenter')
    expect(tip.find('[role="tooltip"]').exists()).toBe(true)
    await tip.trigger('mouseleave')
    expect(tip.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('closes on Escape and on a click elsewhere', async () => {
    const tip = make()
    await tip.get('button').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await tip.vm.$nextTick()
    expect(tip.find('[role="tooltip"]').exists()).toBe(false)

    await tip.get('button').trigger('click')
    document.body.click()
    await tip.vm.$nextTick()
    expect(tip.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('flips to the right when the left side would run off the screen — the last column of cards', async () => {
    const tip = make()
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
    tip.element.getBoundingClientRect = () => ({ left: 900, right: 916, top: 0, bottom: 16, width: 16, height: 16, x: 900, y: 0, toJSON: () => ({}) })
    await tip.get('button').trigger('click')
    expect(tip.get('[role="tooltip"]').classes()).toContain('right-0')
  })

  it('stays on the left when there is room, and never lets a nowrap header squeeze the text', async () => {
    const tip = make()
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
    tip.element.getBoundingClientRect = () => ({ left: 100, right: 116, top: 0, bottom: 16, width: 16, height: 16, x: 100, y: 0, toJSON: () => ({}) })
    await tip.get('button').trigger('click')
    expect(tip.get('[role="tooltip"]').classes()).toContain('left-0')
    expect(tip.get('[role="tooltip"]').classes()).toContain('whitespace-normal')
  })

  it('anchors to the right edge when asked, so a card at the edge does not push it off-screen', async () => {
    const tip = make({ align: 'right' })
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
    tip.element.getBoundingClientRect = () => ({ left: 500, right: 516, top: 0, bottom: 16, width: 16, height: 16, x: 500, y: 0, toJSON: () => ({}) })
    await tip.get('button').trigger('click')
    expect(tip.get('[role="tooltip"]').classes()).toContain('right-0')
  })
})
