type FireAtmosphereProps = {
  density?: 'subtle' | 'cinematic';
};

/** Decorative, non-interactive background effects. Respects reduced motion in CSS. */
export function FireAtmosphere({ density = 'subtle' }: FireAtmosphereProps) {
  return (
    <div className={`jf-fire-atmosphere jf-fire-atmosphere--${density}`} aria-hidden="true">
      <span className="jf-meteor jf-meteor--one" />
      <span className="jf-meteor jf-meteor--two" />
      <span className="jf-meteor jf-meteor--three" />
      <span className="jf-meteor jf-meteor--four" />
      <span className="jf-ember jf-ember--one" />
      <span className="jf-ember jf-ember--two" />
      <span className="jf-ember jf-ember--three" />
      <span className="jf-ember jf-ember--four" />
    </div>
  );
}
