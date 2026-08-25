/**
 * The API speaks a storage vocabulary; the couple speaks Portuguese. Every
 * translation lives here so no screen invents its own word for "child".
 */

export const CATEGORY_PT: Record<string, string> = {
  adult: 'adultos',
  teen: 'adolescentes',
  child: 'crianças',
  baby: 'bebês',
  elderly: 'idosos',
}

/** Singular, for a cell in a row rather than a count. */
export const CATEGORY_ONE: Record<string, string> = {
  adult: 'Adulto',
  teen: 'Adolescente',
  child: 'Criança',
  baby: 'Bebê',
  elderly: 'Idoso',
}

export const CATEGORIES = ['adult', 'teen', 'child', 'baby', 'elderly'] as const

export const ATTENDING_PT: Record<string, string> = {
  pending: 'Sem resposta',
  yes: 'Vai',
  no: 'Não vai',
}

export const SIDE_PT: Record<string, string> = {
  bride: 'Jade',
  groom: 'João',
  both: 'Os dois',
}

export const SIDES = ['bride', 'groom', 'both'] as const

export const GENDER_PT: Record<string, string> = {
  female: 'Feminino',
  male: 'Masculino',
}

export const GENDERS = ['female', 'male'] as const

export const MESSAGE_STATUS_PT: Record<string, string> = {
  pending: 'Esperando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

export const CONTRIBUTION_STATUS_PT: Record<string, string> = {
  declared: 'Declarado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

export function money(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function shortDate(iso: string | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
