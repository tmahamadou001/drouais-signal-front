import { describe, it, expect } from 'vitest'
import { describeMetadata, fieldLabel, fieldValue } from './auditMetadata'

describe('fieldLabel', () => {
  it('translates the keys the audit service writes', () => {
    expect(fieldLabel('new_status')).toBe('Nouveau statut')
    expect(fieldLabel('report_title')).toBe('Signalement')
  })

  /**
   * An unknown key is not a bug — a route may log something new. Showing it
   * readably beats hiding it.
   */
  it('makes an unknown key readable rather than dropping it', () => {
    expect(fieldLabel('some_new_key')).toBe('Some new key')
  })
})

describe('fieldValue', () => {
  it('reads a status in the language of the screen', () => {
    expect(fieldValue('new_status', 'pris_en_charge')).toBe('Pris en charge')
    expect(fieldValue('old_status', 'resolu')).toBe('Résolu')
  })

  it('reads a role the same way', () => {
    expect(fieldValue('new_role', 'super_admin')).toBe('Super administrateur')
  })

  it('answers oui or non, not true or false', () => {
    expect(fieldValue('has_photo', true)).toBe('oui')
    expect(fieldValue('is_anonymous', false)).toBe('non')
  })

  it('counts a list of ids instead of printing them', () => {
    expect(fieldValue('report_ids', ['a', 'b', 'c'])).toBe('3 éléments')
  })

  it('joins a short list', () => {
    expect(fieldValue('category_slugs', ['voirie', 'eau'])).toBe('voirie, eau')
  })

  it('shortens an identifier, which nobody reads whole', () => {
    expect(fieldValue('report_id', '4f21a0b9-64c0-9419-9900-209312345678')).toBe('4f21a0b9…')
  })

  it('says so when there is nothing', () => {
    expect(fieldValue('comment', null)).toBe('—')
    expect(fieldValue('comment', '')).toBe('—')
    expect(fieldValue('category_slugs', [])).toBe('aucun')
  })
})

describe('describeMetadata', () => {
  it('turns the raw object into labelled pairs', () => {
    expect(describeMetadata({ new_status: 'resolu', old_status: 'en_attente' })).toEqual([
      { key: 'new_status', label: 'Nouveau statut', value: 'Résolu', primary: true },
      { key: 'old_status', label: 'Ancien statut', value: 'En attente', primary: true },
    ])
  })

  /**
   * The column only has room for the first two, so what matters has to come
   * first.
   */
  it('puts what matters first', () => {
    const fields = describeMetadata({ has_photo: true, new_status: 'resolu' })

    expect(fields[0].key).toBe('new_status')
  })

  it('drops what was never recorded', () => {
    expect(describeMetadata({ comment: null, new_status: 'resolu' })).toHaveLength(1)
  })

  it('survives an entry with no metadata at all', () => {
    expect(describeMetadata(null)).toEqual([])
    expect(describeMetadata({})).toEqual([])
  })
})
