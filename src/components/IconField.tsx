import {
  Baby,
  Bus,
  Cake,
  Camera,
  Car,
  Church,
  ClipboardCheck,
  Clock,
  Coffee,
  Disc3,
  Dog,
  DoorOpen,
  Flame,
  Flower,
  Flower2,
  Gem,
  Gift,
  GlassWater,
  Guitar,
  HandHeart,
  Heart,
  HeartHandshake,
  IceCreamCone,
  Images,
  Martini,
  Mic,
  Moon,
  Music,
  PartyPopper,
  Sparkles,
  Sunset,
  Users,
  Utensils,
  UtensilsCrossed,
  Waves,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The glyph beside an hour on the programme.
 *
 * The payload stores a word — `guests`, `cake` — and the site draws it. Which
 * meant the couple had to type a word from a list they could not see, in
 * English, and a typo drew nothing at all. Here they see the drawings.
 *
 * A grid rather than a dropdown: thirty-six of these are a thing to look at,
 * not a thing to read down. The names are kept in step with PROGRAMME_ICONS in
 * the site's BigDay — a key missing there simply draws nothing, which is why
 * choosing is safer than typing.
 */
const ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'guests', label: 'Convidados', Icon: Users },
  { key: 'checkin', label: 'Recepção', Icon: ClipboardCheck },
  { key: 'arrival', label: 'Chegada', Icon: DoorOpen },
  { key: 'welcome', label: 'Boas-vindas', Icon: HandHeart },
  { key: 'ceremony', label: 'Cerimônia', Icon: Church },
  { key: 'vows', label: 'Votos', Icon: Heart },
  { key: 'rings', label: 'Alianças', Icon: Gem },
  { key: 'blessing', label: 'Bênção', Icon: HeartHandshake },
  { key: 'bouquet', label: 'Buquê', Icon: Flower },
  { key: 'flowers', label: 'Flores', Icon: Flower2 },
  { key: 'children', label: 'Crianças', Icon: Baby },
  { key: 'pets', label: 'Pets', Icon: Dog },
  { key: 'photo', label: 'Foto', Icon: Camera },
  { key: 'photos', label: 'Álbum', Icon: Images },
  { key: 'speech', label: 'Discurso', Icon: Mic },
  { key: 'toast', label: 'Brinde', Icon: Martini },
  { key: 'drinks', label: 'Bebidas', Icon: Wine },
  { key: 'bar', label: 'Bar', Icon: GlassWater },
  { key: 'lunch', label: 'Almoço', Icon: Utensils },
  { key: 'dinner', label: 'Jantar', Icon: UtensilsCrossed },
  { key: 'cake', label: 'Bolo', Icon: Cake },
  { key: 'dessert', label: 'Doces', Icon: IceCreamCone },
  { key: 'coffee', label: 'Café', Icon: Coffee },
  { key: 'party', label: 'Festa', Icon: PartyPopper },
  { key: 'dance', label: 'Pista', Icon: Disc3 },
  { key: 'music', label: 'Música', Icon: Music },
  { key: 'band', label: 'Banda', Icon: Guitar },
  { key: 'candles', label: 'Velas', Icon: Flame },
  { key: 'sparklers', label: 'Estrelinhas', Icon: Sparkles },
  { key: 'sunset', label: 'Pôr do sol', Icon: Sunset },
  { key: 'night', label: 'Noite', Icon: Moon },
  { key: 'gifts', label: 'Presentes', Icon: Gift },
  { key: 'car', label: 'Carro', Icon: Car },
  { key: 'shuttle', label: 'Traslado', Icon: Bus },
  { key: 'clock', label: 'Horário', Icon: Clock },
  { key: 'farewell', label: 'Despedida', Icon: Waves },
]

export function IconField({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Ícone"
      className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1 border border-olive-line bg-cream p-1.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        title="Sem ícone"
        aria-label="Sem ícone"
        onClick={() => onChange('')}
        className={`flex aspect-square cursor-pointer items-center justify-center border font-body text-sm transition-colors ${
          !value
            ? 'border-olive bg-olive text-cream'
            : 'border-transparent text-dark-gray/50 hover:border-olive-line hover:text-olive'
        }`}
      >
        —
      </button>

      {ICONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          title={label}
          aria-label={label}
          onClick={() => onChange(key)}
          className={`flex aspect-square cursor-pointer items-center justify-center border transition-colors ${
            value === key
              ? 'border-olive bg-olive text-cream'
              : 'border-transparent text-dark-gray hover:border-olive-line hover:text-olive'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
