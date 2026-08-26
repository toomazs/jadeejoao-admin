/**
 * Payload keys, in Portuguese.
 *
 * The editor humanizes anything missing here (`event_datetime` becomes "Event
 * datetime"), so this is a courtesy rather than a contract — a new field in the
 * API shows up in the panel with or without a translation, which is the point.
 */
/**
 * Where a field actually shows up, for the ones whose name suggests otherwise.
 *
 * Both of these had already fooled somebody: the hero's names are the brand
 * wordmark, an image, so editing `couple_names` changes nothing there — it is
 * the footer signature. And the ceremony time is never printed anywhere, but
 * the countdown counts to it, so blanking it would move the target fifteen
 * hours earlier without a single visible clue.
 */
export const FIELD_HINT: Record<string, string> = {
  couple_names:
    'Aparece na assinatura do rodapé. No topo do site quem aparece é a arte do logo, que não muda por aqui.',
  event_datetime:
    'A data aparece no topo, no Grande Dia e no rodapé. A hora não aparece em lugar nenhum, mas é até ela que a contagem regressiva conta.',
  hero_image_url: 'A foto grande de abertura, atrás do logo.',
  eye_x: 'Posição do olho da Catarina na foto, de onde saem as estrelinhas.',
  eye_y: 'Posição do olho da Catarina na foto, de onde saem as estrelinhas.',
}

export const FIELD_PT: Record<string, string> = {
  title: 'Título',
  body: 'Texto',
  label: 'Rótulo',
  name: 'Nome',
  bio: 'Bio',
  notes: 'Observação',
  description: 'Descrição',
  image_url: 'Imagem',
  photo_url: 'Foto',
  logo_url: 'Logo',
  hero_image_url: 'Foto principal',
  images: 'Imagens',
  couple_names: 'Nome do casal',
  event_datetime: 'Data e hora',
  city_label: 'Cidade',
  milestones: 'Marcos',
  date: 'Data',
  time: 'Horário',
  icon: 'Ícone',
  programme: 'Programação',
  deadline: 'Prazo',
  address: 'Endereço',
  map_embed_url: 'Mapa embutido',
  maps_url: 'Link do Google Maps',
  maps_logo_url: 'Logo do Google Maps',
  waze_url: 'Link do Waze',
  waze_logo_url: 'Logo do Waze',
  parking_notes: 'Sobre estacionamento',
  lodgings: 'Hospedagens',
  area: 'Região',
  link: 'Link',
  platform: 'É plataforma de busca',
  shuttle_served: 'Atendido pelo traslado',
  attire: 'Traje',
  looks: 'Referências',
  bride: 'Noiva',
  groom: 'Noivo',
  instagram: 'Instagram',
  moments: 'Momentos do álbum',
  announcement: 'Anúncio da Catarina',
  eye_x: 'Olho — posição horizontal (%)',
  eye_y: 'Olho — posição vertical (%)',
  letter_from_bride: 'Carta da Jade',
  letter_from_groom: 'Carta do João',
  enabled: 'Seção visível no site',
}

/** The nine sections, in the order the site renders them (AD-8). */
export const SECTION_PT: Record<string, string> = {
  hero: 'Abertura',
  our_story: 'Nossa história',
  big_day: 'O grande dia',
  rsvp: 'Confirmação de presença',
  getting_there: 'Como chegar',
  stay: 'Onde ficar',
  gifts_intro: 'Presentes',
  dress_code: 'Dress code',
  good_practices: 'Boas práticas',
  messages_intro: 'Recado aos noivos',
}
