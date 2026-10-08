"use client";
import type { CSSProperties } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
// Imports NOMBRADOS (ver lib/bootstrap-icons.ts): el namespace metía los ~9.000 iconos en el bundle.
import {
  AddressBook, Alarm, Bell, Bookmarks, Brain, Briefcase, Broadcast, CalendarBlank, Calculator, Camera,
  Cards, ChartBar, ChartLineUp, ChatCircle, CheckSquare, ClipboardText, Coin, Coins, Compass, Confetti,
  Crown, CreditCard, DeviceMobile, Diamond, EnvelopeOpen, EnvelopeSimple, Eye, FilmSlate, FilmStrip, Fire,
  Folder, Gift, GearSix, GlobeHemisphereWest, Handshake, HourglassMedium, IdentificationCard, Key, Laptop,
  Lightbulb, Lightning, Link, LockKey, MagicWand, MagnifyingGlass, Megaphone, Notebook, NotePencil, Package,
  Palette, Percent, Phone, PuzzlePiece, Robot, RocketLaunch, Scales, Shield, ShootingStar, Sparkle,
  SpeakerHigh, Star, Tag, Target, Toolbox, Tray, User, UsersThree, Wrench,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Iconos 2D del CRM: Phosphor duotono dentro de una "ficha" con el tono de su sección.
 * Conserva los nombres del antiguo Icon3D (Fluent Emoji 3D) para que los usos no cambien de lógica.
 * Cada tono tiene dos variantes: `l` (brillante, para el menú/barra/modales oscuros) y `d` (intensa,
 * para el contenido claro de .app-main). Qué variante se usa lo decide el CSS (.app-icon en globals.css).
 */
const TONE = {
  orange: { d: "#e8581a", l: "#fb7f45" },
  blue: { d: "#2563eb", l: "#60a5fa" },
  violet: { d: "#7c3aed", l: "#a78bfa" },
  green: { d: "#16a34a", l: "#4ade80" },
  amber: { d: "#d97706", l: "#fbbf24" },
  rose: { d: "#e11d48", l: "#fb7185" },
  slate: { d: "#475569", l: "#cbd5e1" },
  cyan: { d: "#0891b2", l: "#22d3ee" },
  teal: { d: "#0d9488", l: "#2dd4bf" },
  pink: { d: "#db2777", l: "#f472b6" },
} as const;
type Tone = keyof typeof TONE;

const ICONS = {
  bar_chart: [ChartBar, "orange"],
  chart_increasing: [ChartLineUp, "green"],
  bullseye: [Target, "rose"],
  busts_in_silhouette: [UsersThree, "blue"],
  bust_in_silhouette: [User, "blue"],
  check_mark_button: [CheckSquare, "green"],
  file_folder: [Folder, "amber"],
  left_speech_bubble: [ChatCircle, "violet"],
  e_mail: [EnvelopeSimple, "blue"],
  mobile_phone: [DeviceMobile, "slate"],
  high_voltage: [Lightning, "amber"],
  handshake: [Handshake, "teal"],
  alarm_clock: [Alarm, "cyan"],
  gear: [GearSix, "slate"],
  rocket: [RocketLaunch, "orange"],
  megaphone: [Megaphone, "pink"],
  light_bulb: [Lightbulb, "amber"],
  crystal_ball: [Sparkle, "violet"],
  money_bag: [Coins, "green"],
  trophy: [Crown, "amber"],
  fire: [Fire, "orange"],
  sparkles: [Sparkle, "violet"],
  robot: [Robot, "cyan"],
  magnifying_glass_tilted_left: [MagnifyingGlass, "slate"],
  calendar: [CalendarBlank, "blue"],
  bell: [Bell, "amber"],
  locked_with_key: [LockKey, "slate"],
  gem_stone: [Diamond, "cyan"],
  briefcase: [Briefcase, "teal"],
  clipboard: [ClipboardText, "blue"],
  link: [Link, "slate"],
  globe_showing_americas: [GlobeHemisphereWest, "teal"],
  laptop: [Laptop, "slate"],
  camera: [Camera, "pink"],
  memo: [NotePencil, "blue"],
  package: [Package, "amber"],
  hammer_and_wrench: [Wrench, "slate"],
  artist_palette: [Palette, "pink"],
  movie_camera: [FilmSlate, "rose"],
  credit_card: [CreditCard, "blue"],
  label: [Tag, "violet"],
  key: [Key, "amber"],
  hourglass_done: [HourglassMedium, "amber"],
  inbox_tray: [Tray, "blue"],
  party_popper: [Confetti, "orange"],
  brain: [Brain, "pink"],
  magic_wand: [MagicWand, "violet"],
  crown: [Crown, "amber"],
  loudspeaker: [SpeakerHigh, "pink"],
  hundred_points: [Percent, "rose"],
  toolbox: [Toolbox, "orange"],
  satellite_antenna: [Broadcast, "violet"],
  coin: [Coin, "amber"],
  ledger: [Notebook, "teal"],
  abacus: [Calculator, "slate"],
  clapper_board: [FilmStrip, "rose"],
  glowing_star: [Star, "amber"],
  comet: [ShootingStar, "violet"],
  identification_card: [IdentificationCard, "blue"],
  dizzy: [Sparkle, "slate"],
  shield: [Shield, "teal"],
  star: [Star, "amber"],
  eyes: [Eye, "cyan"],
  puzzle_piece: [PuzzlePiece, "violet"],
  compass: [Compass, "teal"],
  telephone_receiver: [Phone, "green"],
  envelope_with_arrow: [EnvelopeOpen, "blue"],
  card_index_dividers: [Cards, "blue"],
  balance_scale: [Scales, "slate"],
  wrapped_gift: [Gift, "pink"],
  bookmark_tabs: [Bookmarks, "blue"],
  address_book: [AddressBook, "blue"],
} satisfies Record<string, [PhosphorIcon, Tone]>;

export type AppIconName = keyof typeof ICONS;

/** Variables CSS de un tono; `.app-icon` (globals.css) elige la variante según la superficie. */
export function toneVars(d: string, l: string, size: number): CSSProperties {
  return { "--ic-d": d, "--ic-l": l, width: size, height: size, borderRadius: Math.round(size * 0.3) } as CSSProperties;
}

export function AppIcon({
  name, size = 28, bare = false, active = false, className,
}: {
  name: AppIconName;
  size?: number;
  /** Solo el glifo, sin ficha (dentro de botones o textos). */
  bare?: boolean;
  /** Ficha con el tono pleno y glifo blanco (elemento seleccionado). */
  active?: boolean;
  className?: string;
}) {
  const [Glyph, tone] = ICONS[name];
  const { d, l } = TONE[tone];
  if (bare) {
    return (
      <span className={cn("app-icon-bare inline-flex shrink-0", className)} style={{ "--ic-d": d, "--ic-l": l } as CSSProperties} aria-hidden>
        <Glyph size={size} weight="duotone" />
      </span>
    );
  }
  return (
    <span
      className={cn("app-icon inline-flex items-center justify-center shrink-0", className)}
      data-active={active || undefined}
      style={toneVars(d, l, size)}
      aria-hidden
    >
      <Glyph size={Math.round(size * 0.58)} weight={active ? "fill" : "duotone"} />
    </span>
  );
}
