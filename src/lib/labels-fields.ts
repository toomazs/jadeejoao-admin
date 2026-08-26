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
  event_date: 'Aparece no topo, no Grande Dia e no rodapé.',
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
  event_date: 'Data do casamento',
  city_label: 'Cidade',
  milestones: 'Marcos',
  date: 'Subtítulo',
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

/**
 * How a section's fields are ordered and bundled in the panel.
 *
 * The payload's key order comes from a Go struct, which is arranged for the
 * API's own reasons — `title` and `body` first because every section inherits
 * them. That is not the order somebody editing their own wedding thinks in:
 * the couple's chapters come first, and the album's heading belongs with the
 * album, not floating above everything.
 *
 * Anything not named here follows, in payload order — so a new API field still
 * shows up without being added to this map.
 */
export interface FieldGroup {
  title: string
  keys: string[]
}

export const SECTION_GROUPS: Record<string, FieldGroup[]> = {
  our_story: [
    { title: 'A noiva', keys: ['bride'] },
    { title: 'O noivo', keys: ['groom'] },
    { title: 'Momentos do álbum', keys: ['title', 'moments'] },
    { title: 'As cartas', keys: ['letter_from_groom', 'letter_from_bride'] },
    { title: 'Convite, entre os capítulos', keys: ['body'] },
    { title: 'O anúncio da Catarina', keys: ['announcement'] },
  ],
  hero: [{ title: 'Abertura', keys: ['event_date', 'city_label', 'hero_image_url'] }],
  big_day: [
    { title: 'Textos', keys: ['title', 'body', 'venue_notes'] },
    { title: 'Programação', keys: ['programme'] },
  ],
  getting_there: [
    { title: 'Textos', keys: ['title', 'body', 'address', 'parking_notes'] },
    { title: 'Mapas', keys: ['map_embed_url', 'maps_url', 'maps_logo_url', 'waze_url', 'waze_logo_url'] },
  ],
  stay: [
    { title: 'Textos', keys: ['title', 'body'] },
    { title: 'Hospedagens', keys: ['lodgings'] },
  ],
  dress_code: [
    { title: 'Textos', keys: ['title', 'body', 'attire'] },
    { title: 'Referências', keys: ['looks'] },
  ],
}

/**
 * Where each editable thing lives on the page.
 *
 * Opening "O noivo" should put his chapter on screen; without this the preview
 * stays wherever it was and the couple scrolls a second window by hand to find
 * what they just opened.
 */
export const FIELD_ANCHOR: Record<string, string> = {
  bride: 'chapter-bride',
  groom: 'chapter-groom',
  'bride.bio': 'chapter-bride-bio',
  'groom.bio': 'chapter-groom-bio',
  moments: 'story_album',
  title: 'story-album-title',
  letter_from_groom: 'letters',
  letter_from_bride: 'letters',
  body: 'invitation',
  announcement: 'announcement',
  programme: 'big_day',
  lodgings: 'stay',
  looks: 'dress_code',
}
