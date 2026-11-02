import React from 'react';
import GalaxyBackground, { GalaxyBackgroundProps } from './GalaxyBackground';
import ShootingStars, { ShootingStarsProps } from './ShootingStars';
import CursorGlow, { CursorGlowProps } from './CursorGlow';

export interface AmbientEffectsProps {
  /** Enable or customize Galaxy background (deep base, nebula clouds, Milky Way, 3 star layers) */
  galaxy?: boolean | GalaxyBackgroundProps;
  /** Enable or customize Shooting Stars */
  shootingStars?: boolean | ShootingStarsProps;
  /** Enable or customize Mouse Cursor Glow */
  cursorGlow?: boolean | CursorGlowProps;
}

/**
 * Ambient background container mounting the animated galaxy backdrop,
 * correctly oriented shooting stars, and cursor glow behind page content (z-0).
 */
export const AmbientEffects: React.FC<AmbientEffectsProps> = ({
  galaxy = true,
  shootingStars = true,
  cursorGlow = true,
}) => {
  const galaxyProps = typeof galaxy === 'object' ? galaxy : {};
  const shootingStarsProps = typeof shootingStars === 'object' ? shootingStars : {};
  const cursorGlowProps = typeof cursorGlow === 'object' ? cursorGlow : {};

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {galaxy && <GalaxyBackground {...galaxyProps} />}
      {shootingStars && <ShootingStars {...shootingStarsProps} />}
      {cursorGlow && <CursorGlow {...cursorGlowProps} />}
    </div>
  );
};

export default AmbientEffects;
