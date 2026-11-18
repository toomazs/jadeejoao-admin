import { describe, expect, it } from 'vitest'

import { fieldsAtFault, validationHint } from './validation-hint'

/** The refusal the couple met for days, exactly as Huma sends it. */
const encerramento = {
  status: 422,
  title: 'Unprocessable Entity',
  detail: 'validation failed',
  errors: [
    {
      message: 'expected value to be one of "guests", "ceremony", …',
      location: 'body.big_day.programme[3].icon',
      value: 'night',
    },
  ],
}

describe('qual campo o painel acusa', () => {
  it('aponta a linha e o campo dentro da programação', () => {
    expect(fieldsAtFault(encerramento)).toEqual(['Programação, item 4 → Ícone'])
  })

  // The section wrapper is the screen already open; repeating it buries the
  // field that failed at the end of the sentence.
  it('não repete o nome da seção', () => {
    expect(fieldsAtFault(encerramento)[0]).not.toContain('grande dia')
    expect(fieldsAtFault(encerramento)[0]).not.toContain('big_day')
  })

  it('nomeia um campo simples da seção', () => {
    expect(fieldsAtFault({ errors: [{ location: 'body.rsvp.deadline' }] })).toEqual(['Prazo'])
  })

  it('conta as listas a partir de 1, como o painel mostra', () => {
    expect(fieldsAtFault({ errors: [{ location: 'body.gifts[0].quota_centavos' }] })).toEqual([
      'Presentes, item 1 → Valor da cota',
    ])
  })

  it('junta campos distintos e não repete o mesmo', () => {
    const many = {
      errors: [
        { location: 'body.big_day.programme[3].icon' },
        { location: 'body.big_day.programme[3].icon' },
        { location: 'body.big_day.programme[0].time' },
      ],
    }
    expect(fieldsAtFault(many)).toEqual([
      'Programação, item 4 → Ícone',
      'Programação, item 1 → Horário',
    ])
  })

  it('cai fora quando o erro não traz localização', () => {
    expect(fieldsAtFault({ detail: 'Prazo inválido.' })).toEqual([])
    expect(fieldsAtFault(null)).toEqual([])
    expect(fieldsAtFault({ errors: 'nope' })).toEqual([])
    expect(validationHint({ detail: 'Prazo inválido.' })).toBe('')
  })

  it('monta a frase que o painel mostra', () => {
    expect(validationHint(encerramento)).toBe(' Confira: Programação, item 4 → Ícone.')
  })

  // A field with no translation still names itself rather than disappearing.
  it('usa a própria chave quando não há tradução', () => {
    expect(fieldsAtFault({ errors: [{ location: 'body.hero.algo_novo' }] })).toEqual(['algo_novo'])
  })
})
