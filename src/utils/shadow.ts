/**
 * Builds CSS `boxShadow` values from theme colours.
 *
 * React Native's legacy shadow props (shadowColor/shadowOffset/shadowOpacity/
 * shadowRadius plus Android `elevation`) are deprecated on the New
 * Architecture in favour of the CSS `boxShadow` shorthand. `boxShadow` takes a
 * single colour, so the opacity that used to live in `shadowOpacity` has to be
 * folded into that colour.
 *
 * That fold is the whole reason this helper exists: theme colours arrive in
 * more than one format. Some are hex (`#000000`), others are already
 * `rgba(120, 120, 128, 0.32)` and carry an alpha of their own, which has to be
 * multiplied rather than replaced — otherwise a subtle separator shadow would
 * come out far heavier than it was.
 */

/** Fold an opacity into a colour, preserving any alpha the colour already has. */
export const withOpacity = (color: string, opacity: number): string => {
  if (typeof color !== 'string' || color === '') {
    return color;
  }

  const clamped = Math.max(0, Math.min(1, opacity));

  // #RGB / #RRGGBB / #RRGGBBAA
  const hex = color.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let body = hex[1];
    if (body.length === 3) {
      body = body.split('').map((c) => c + c).join('');
    }
    if (body.length === 6 || body.length === 8) {
      const r = parseInt(body.slice(0, 2), 16);
      const g = parseInt(body.slice(2, 4), 16);
      const b = parseInt(body.slice(4, 6), 16);
      // An 8-digit hex already carries alpha — compound rather than discard it.
      const existing = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
      return `rgba(${r}, ${g}, ${b}, ${round(existing * clamped)})`;
    }
  }

  // rgb(...) / rgba(...)
  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      const existing = parts.length >= 4 ? Number(parts[3]) : 1;
      const alpha = Number.isFinite(existing) ? existing : 1;
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${round(alpha * clamped)})`;
    }
  }

  // Named colours and anything unrecognised: return unchanged rather than
  // emitting a malformed value. The shadow renders at full strength, which is
  // wrong but visible — better than a style the platform silently drops.
  return color;
};

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Compose a `boxShadow` string.
 *
 * @param color   Theme colour, any format `withOpacity` understands.
 * @param opacity What used to be `shadowOpacity`.
 * @param radius  What used to be `shadowRadius` (the blur).
 * @param offsetY What used to be `shadowOffset.height`.
 * @param offsetX What used to be `shadowOffset.width`.
 */
export const boxShadow = (
  color: string,
  opacity: number,
  radius: number,
  offsetY: number,
  offsetX: number = 0,
): string => `${offsetX}px ${offsetY}px ${radius}px ${withOpacity(color, opacity)}`;
