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

/** The sections, in the order the site renders them (AD-8). */
export const SECTION_PT: Record<string, string> = {
  hero: 'Abertura',
  our_story: 'Nossa história',
  big_day: 'O grande dia',
  rsvp: 'Confirmação de presença',
  getting_there: 'Como chegar',
  stay: 'Onde ficar',
  gifts_intro: 'Presentes',
  dress_code: 'Dress code',
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
  /**
   * Opens as soon as the section does.
   *
   * Where a section is one block of writing, folding it away costs a click to
   * see the thing the tab was clicked for. Where it is several parts, the
   * folds are what makes the shape readable, and only the first opens.
   */
  open?: boolean
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
  hero: [
    { title: 'Abertura', keys: ['event_date', 'city_label', 'hero_image_url'], open: true },
  ],
  big_day: [
    { title: 'Textos', keys: ['title', 'body', 'venue_notes'], open: true },
    { title: 'Programação', keys: ['programme'] },
  ],
  getting_there: [
    // The address leads on the page, in large olive type above the
    // sentence — so it leads here too. The panel reading in one order while
    // the preview beside it reads in another is the panel arguing with
    // itself.
    { title: 'Textos', keys: ['title', 'address', 'body', 'parking_notes'], open: true },
    { title: 'Mapas', keys: ['map_embed_url', 'maps_url', 'maps_logo_url', 'waze_url', 'waze_logo_url'] },
  ],
  stay: [
    { title: 'Textos', keys: ['title', 'body'], open: true },
    { title: 'Hospedagens', keys: ['lodgings'] },
  ],
  dress_code: [
    { title: 'Textos', keys: ['title', 'body', 'attire'], open: true },
    { title: 'Referências', keys: ['looks'] },
  ],
  // These three are a heading and a paragraph each. They had no groups at all,
  // so their fields sat loose while every other section arrived folded — the
  // panel looked like it had forgotten to draw them.
  rsvp: [{ title: 'Textos', keys: ['title', 'body', 'deadline'], open: true }],
  gifts_intro: [{ title: 'Textos', keys: ['title', 'body'], open: true }],
  messages_intro: [{ title: 'Textos', keys: ['title', 'body'], open: true }],
}

/**
 * Where each editable thing lives on the page.
 *
 * Opening "O noivo" should put his chapter on screen; without this the preview
 * stays wherever it was and the couple scrolls a second window by hand to find
 * what they just opened.
 *
 * Keys are FULL PATHS, section included, and that is not decoration. Half the
 * sections own a `title` and a `body`. Keyed by the bare field name, every one
 * of them resolved to the album's — so opening "Textos" in Como chegar scrolled
 * the site up to "Vamos te mostrar um pouco da nossa história". A field only
 * knows where it lives once you say which section is asking.
 */
export const FIELD_ANCHOR: Record<string, string> = {
  'our_story.bride': 'chapter-bride',
  'our_story.groom': 'chapter-groom',
  'our_story.bride.bio': 'chapter-bride-bio',
  'our_story.groom.bio': 'chapter-groom-bio',
  'our_story.moments': 'story_album',
  'our_story.title': 'story-album-title',
  'our_story.letter_from_groom': 'letters',
  'our_story.letter_from_bride': 'letters',
  'our_story.body': 'invitation',
  'our_story.announcement': 'announcement',
  'big_day.programme': 'big_day',
  'stay.lodgings': 'stay',
  'dress_code.looks': 'dress_code',
  // The name and the portrait share a scene, and it is not the bio's — click
  // back into the name and the preview should come back with you.
  'our_story.bride.name': 'chapter-bride',
  'our_story.groom.name': 'chapter-groom',
  'our_story.bride.photo_url': 'chapter-bride',
  'our_story.groom.photo_url': 'chapter-groom',
  'our_story.bride.instagram': 'chapter-bride',
  'our_story.groom.instagram': 'chapter-groom',
}

/**
 * Lists whose entries are addressable one by one, and the id prefix the site
 * gives them.
 *
 * Without an entry here a list points at its section, which is right for a
 * block that reads as one thing and wrong for a column of separate ones —
 * opening "Para eles" landed on the top of Dress code, showing "Para elas".
 */
export const LIST_ITEM_ANCHOR: Record<string, string> = {
  'our_story.moments': 'moment',
  'dress_code.looks': 'look',
  'big_day.programme': 'programme',
  'stay.lodgings': 'lodging',
}

/**
 * Fields that only mean something while a sibling is on.
 *
 * A hotel card never draws a logo — only the search platforms do. Offering the
 * field anyway invites the couple to upload one and watch nothing happen.
 */
export const FIELD_ONLY_IF: Record<string, string> = {
  'stay.lodgings.logo_url': 'platform',
}
