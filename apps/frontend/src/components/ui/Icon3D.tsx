import { cn } from "@/lib/utils";

/**
 * Iconos 3D de Fluent Emoji (Microsoft, licencia MIT) servidos localmente desde /public/3d.
 * `float` los hace flotar suavemente; en hover dentro de un <a>/<button>/.group saltan y brillan.
 */
export type Icon3DName =
  | "bar_chart" | "chart_increasing" | "bullseye" | "busts_in_silhouette" | "bust_in_silhouette"
  | "check_mark_button" | "file_folder" | "left_speech_bubble" | "e_mail" | "mobile_phone"
  | "high_voltage" | "handshake" | "alarm_clock" | "gear" | "rocket" | "megaphone" | "light_bulb"
  | "crystal_ball" | "money_bag" | "trophy" | "fire" | "sparkles" | "robot"
  | "magnifying_glass_tilted_left" | "calendar" | "bell" | "locked_with_key" | "gem_stone"
  | "briefcase" | "clipboard" | "link" | "globe_showing_americas" | "laptop" | "camera" | "memo"
  | "package" | "hammer_and_wrench" | "artist_palette" | "movie_camera" | "credit_card" | "label"
  | "key" | "hourglass_done" | "inbox_tray" | "party_popper" | "brain" | "magic_wand" | "crown"
  | "loudspeaker" | "hundred_points" | "toolbox" | "satellite_antenna" | "coin" | "ledger"
  | "abacus" | "clapper_board" | "glowing_star" | "comet" | "identification_card" | "dizzy"
  | "shield" | "star" | "eyes" | "puzzle_piece" | "compass" | "telephone_receiver"
  | "envelope_with_arrow" | "card_index_dividers" | "balance_scale" | "wrapped_gift" | "bookmark_tabs";

export function Icon3D({ name, size = 28, float = false, className }: { name: Icon3DName; size?: number; float?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/3d/${name}.webp`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      loading="eager"
      decoding="async"
      className={cn("icon3d select-none", float && "icon3d-float", className)}
      style={{ width: size, height: size }}
    />
  );
}
