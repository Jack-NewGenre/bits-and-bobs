const BRIM = "#ffc21f";
const BRIM_EDGE = "#e39200";

/** Tipped to the right about the head's centre, so it stays perched on the crown. */
const WORN = "rotate(18 80 92)";

/** A tiny hard hat perched on top of the head: a small dome on a flat pill brim. */
export function MascotHat() {
  return (
    <g transform={WORN}>
      <defs>
        <linearGradient id="mascot-shell" x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset="1" stopColor="#f7b200" />
        </linearGradient>
      </defs>

      <path d="M60 44A20 18 0 0 1 100 44Z" fill="url(#mascot-shell)" />
      <rect x="57" y="44" width="46" height="6" rx="3" fill={BRIM_EDGE} />
      <rect x="57" y="42" width="46" height="6" rx="3" fill={BRIM} />
    </g>
  );
}
