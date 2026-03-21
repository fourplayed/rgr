/**
 * Asset marker pin icon for the fleet map.
 * Renders a needle with a glowing sphere on top to OffscreenCanvas for Mapbox symbol image.
 * One pin per category: neon cyan (trailer), neon purple (dolly).
 * Each has a normal and hover (2x height) variant.
 */

const ICON_W = 28;
const NORMAL_H = 56;
const HOVER_H = 104;

const BALL_R = 7;

const PIN_COLORS = {
  trailer: '#00e5ff', // neon cyan
  dolly:   '#e040fb', // neon purple
} as const;

/** Draw a pin: thin needle with a glowing sphere at the top */
function drawPin(ctx: OffscreenCanvasRenderingContext2D, color: string, w: number, h: number) {
  const cx = w / 2;
  const ballY = BALL_R + 4;

  // Needle
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, ballY + BALL_R);
  ctx.lineTo(cx, h - 1);
  ctx.stroke();

  // Glow behind sphere
  const glow = ctx.createRadialGradient(cx, ballY, 0, cx, ballY, BALL_R * 2.5);
  glow.addColorStop(0, color + '66');
  glow.addColorStop(0.5, color + '22');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, ballY, BALL_R * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Sphere base
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, ballY, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Sphere shading
  const shade = ctx.createRadialGradient(cx - 2, ballY - 2.5, 0, cx, ballY, BALL_R);
  shade.addColorStop(0, 'rgba(255,255,255,0.45)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  shade.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, ballY, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

/** Register normal + hover pin icons for each category */
export function registerAssetIcons(map: mapboxgl.Map, _isDark: boolean): void {
  for (const [category, color] of Object.entries(PIN_COLORS)) {
    // Normal pin
    const normalName = `${category}-pin`;
    const normalCanvas = new OffscreenCanvas(ICON_W, NORMAL_H);
    drawPin(normalCanvas.getContext('2d')!, color, ICON_W, NORMAL_H);
    if (map.hasImage(normalName)) map.removeImage(normalName);
    map.addImage(normalName, normalCanvas.getContext('2d')!.getImageData(0, 0, ICON_W, NORMAL_H), { pixelRatio: 2 });

    // Hover pin (2x needle height)
    const hoverName = `${category}-pin-hover`;
    const hoverCanvas = new OffscreenCanvas(ICON_W, HOVER_H);
    drawPin(hoverCanvas.getContext('2d')!, color, ICON_W, HOVER_H);
    if (map.hasImage(hoverName)) map.removeImage(hoverName);
    map.addImage(hoverName, hoverCanvas.getContext('2d')!.getImageData(0, 0, ICON_W, HOVER_H), { pixelRatio: 2 });
  }

}
