/**
 * Payload keys, in Portuguese.
 *
 * The editor humanizes anything missing here (`event_datetime` becomes "Event
 * datetime"), so this is a courtesy rather than a contract — a new field in the
 * API shows up in the panel with or without a translation, which is the point.
 */
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
