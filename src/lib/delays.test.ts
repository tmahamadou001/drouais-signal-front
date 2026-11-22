import { describe, it, expect } from 'vitest'
import { splitDelay, formatDelay } from './delays'

describe('splitDelay', () => {
  it('says hours under a day', () => {
    expect(splitDelay(5.4)).toEqual({ value: '5', unit: 'h' })
  })
  it('switches to days past 24 h, with the hours that remain', () => {
    expect(splitDelay(156)).toEqual({ value: '6 j 12', unit: 'h' })
    expect(splitDelay(25)).toEqual({ value: '1 j 01', unit: 'h' })
  })
  it('drops « 00 h » on a whole number of days', () => {
    expect(splitDelay(168)).toEqual({ value: '7 j', unit: '' })
  })
  it('shows a dash when nothing was measured', () => {
    expect(splitDelay(null)).toEqual({ value: '—', unit: '' })
    expect(splitDelay(undefined)).toEqual({ value: '—', unit: '' })
  })
})

describe('formatDelay', () => {
  it('puts it on one line', () => {
    expect(formatDelay(156)).toBe('6 j 12 h')
    expect(formatDelay(168)).toBe('7 j')
    expect(formatDelay(3)).toBe('3 h')
    expect(formatDelay(null)).toBe('—')
  })
})
