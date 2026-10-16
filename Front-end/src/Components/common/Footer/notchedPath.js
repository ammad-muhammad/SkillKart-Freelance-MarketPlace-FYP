/**
 * Generates an SVG path string for a notched card with:
 * - Top-right notch: steps down by notchDepth at topTabRatio (~46% width)
 * - Bottom-left notch: steps up by notchDepth at botTabRatio (~24% width)
 * - Rounded joins and corner radii that stay undistorted at any width/height
 */
export function generateNotchedPath(width, height, options = {}) {
  const {
    radius = 28,
    notchDepth = 26,
    topTabRatio = 0.46,
    botTabRatio = 0.24,
    chamfer = 24,
  } = options;

  const w = Math.round(width);
  const h = Math.round(height);

  if (w <= 0 || h <= 0) return '';

  const r = Math.min(radius, Math.floor(h / 4));
  const d = Math.min(notchDepth, Math.floor(h / 4));

  // Clamped tab transition points
  const topTab = Math.round(Math.min(Math.max(w * topTabRatio, 240), w - 200));
  const botTab = Math.round(Math.min(Math.max(w * botTabRatio, 160), w - 240));

  let p = `M 0,${r} `;
  // 1. Top-left corner
  p += `A ${r} ${r} 0 0 1 ${r},0 `;
  // 2. High top edge
  p += `L ${topTab - chamfer},0 `;
  // 3. Chamfer step down to y = d
  p += `C ${topTab - chamfer / 2},0 ${topTab},${d} ${topTab + chamfer / 2},${d} `;
  // 4. Low top edge running right
  p += `L ${w - r},${d} `;
  // 5. Top-right corner
  p += `A ${r} ${r} 0 0 1 ${w},${d + r} `;
  // 6. Right edge running down
  p += `L ${w},${h - r} `;
  // 7. Bottom-right corner
  p += `A ${r} ${r} 0 0 1 ${w - r},${h} `;
  // 8. Low bottom edge running left
  p += `L ${botTab + chamfer / 2},${h} `;
  // 9. Chamfer step up to y = h - d
  p += `C ${botTab},${h} ${botTab - chamfer / 2},${h - d} ${botTab - chamfer},${h - d} `;
  // 10. High bottom edge running left
  p += `L ${r},${h - d} `;
  // 11. Bottom-left corner
  p += `A ${r} ${r} 0 0 1 0,${h - d - r} `;
  // 12. Left edge back up to start
  p += `L 0,${r} Z`;

  return p;
}

/**
 * Generates an SVG path string that clips the footer root into ONE continuous
 * surface with the 3-step silhouette top boundary:
 * LOW (~64px) -> MID (~33px) -> HIGH (0px) -> LOW (~64px)
 */
export function generateFooterSilhouettePath(width, height, silhouetteHeight = 64) {
  const w = Math.round(width);
  const h = Math.round(height);
  if (w <= 0 || h <= 0) return '';

  const H = silhouetteHeight;
  const H_MID = Math.round(H * 0.51);

  const x1 = Math.round(w * 0.255);
  const x2 = Math.round(w * 0.318);
  const x3 = Math.round(w * 0.548);
  const x4 = Math.round(w * 0.608);
  const x5 = Math.round(w * 0.821);
  const x6 = Math.round(w * 0.938);

  const mid1 = Math.round((x1 + x2) / 2);
  const mid2 = Math.round((x3 + x4) / 2);
  const mid3 = Math.round((x5 + x6) / 2);

  return [
    `M 0,${H}`,
    `L ${x1},${H}`,
    `C ${mid1},${H} ${mid1},${H_MID} ${x2},${H_MID}`,
    `L ${x3},${H_MID}`,
    `C ${mid2},${H_MID} ${mid2},0 ${x4},0`,
    `L ${x5},0`,
    `C ${mid3},0 ${mid3},${H} ${x6},${H}`,
    `L ${w},${H}`,
    `L ${w},${h}`,
    `L 0,${h}`,
    `Z`,
  ].join(' ');
}
