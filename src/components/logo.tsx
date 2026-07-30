/**
 * Marque de l'outil : la tuile du calendrier, et une pastille par marque dans
 * les couleurs déjà utilisées dans l'app (Studio By KM, Bornia, Vumos, KMI).
 *
 * Les proportions sont volontairement épaisses : à 16 px dans un onglet, des
 * pastilles plus fines et une barre plus claire deviennent illisibles.
 * Même géométrie que `src/app/icon.svg` — garder les deux en phase.
 */
export function Logo({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Calendrier Éditorial KMI"
    >
      <rect width="32" height="32" rx="7.5" fill="#18181b" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.12"
      />
      <rect
        x="8"
        y="5"
        width="16"
        height="3"
        rx="1.5"
        fill="#ffffff"
        fillOpacity="0.6"
      />
      <circle cx="11.3" cy="14.8" r="3.7" fill="#e11d48" />
      <circle cx="20.7" cy="14.8" r="3.7" fill="#0ea5e9" />
      <circle cx="11.3" cy="23.6" r="3.7" fill="#f59e0b" />
      <circle cx="20.7" cy="23.6" r="3.7" fill="#6366f1" />
    </svg>
  );
}
