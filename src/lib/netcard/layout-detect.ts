import { normalizeDesignLayers } from './normalize-layer';
import type { DesignLayer } from './types';

const SLOT_ORDER = ['code', 'name', 'phone'] as const;
const SLOT_COLORS: Record<(typeof SLOT_ORDER)[number], string> = {
  name: '#111827',
  code: '#111827',
  phone: '#111827',
};

type SlotBox = { x: number; y: number; width: number; height: number; area: number };

function connectedBoxes(mask: boolean[][], width: number, height: number) {
  const visited = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  const boxes: [number, number, number, number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y]![x] || visited[y]![x]) continue;
      const stack: [number, number][] = [[x, y]];
      visited[y]![x] = true;
      let minx = x;
      let maxx = x;
      let miny = y;
      let maxy = y;
      let count = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        count++;
        if (cx < minx) minx = cx;
        else if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy;
        else if (cy > maxy) maxy = cy;
        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ] as const) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny]![nx] && !visited[ny]![nx]) {
            visited[ny]![nx] = true;
            stack.push([nx, ny]);
          }
        }
      }
      boxes.push([minx, miny, maxx, maxy, count]);
    }
  }
  return boxes;
}

function detectSlotBoxes(source: CanvasImageSource, origW: number, origH: number): SlotBox[] {
  const scale = Math.min(1, 520 / Math.max(origW, origH));
  const mw = Math.max(1, Math.round(origW * scale));
  const mh = Math.max(1, Math.round(origH * scale));

  const work = document.createElement('canvas');
  work.width = mw;
  work.height = mh;
  const wctx = work.getContext('2d');
  if (!wctx) return [];
  wctx.drawImage(source, 0, 0, origW, origH, 0, 0, mw, mh);
  const pixels = wctx.getImageData(0, 0, mw, mh).data;
  const bright: boolean[][] = Array.from({ length: mh }, () => Array<boolean>(mw).fill(false));
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = (y * mw + x) * 4;
      const red = pixels[i]!;
      const green = pixels[i + 1]!;
      const blue = pixels[i + 2]!;
      const brightest = Math.max(red, green, blue);
      const dullest = Math.min(red, green, blue);
      if (brightest >= 198 && brightest - dullest <= 60) {
        bright[y]![x] = true;
      }
    }
  }

  const components = connectedBoxes(bright, mw, mh);
  const slots: SlotBox[] = [];
  for (const [minx, miny, maxx, maxy, count] of components) {
    const boxW = maxx - minx + 1;
    const boxH = maxy - miny + 1;
    if (boxW < mw * 0.12 || boxH < mh * 0.035) continue;
    if (boxW > mw * 0.62 || boxH > mh * 0.28) continue;
    const ratio = boxW / boxH;
    if (ratio < 2.1 || ratio > 14) continue;
    const fill = count / (boxW * boxH);
    if (fill < 0.42) continue;
    if (minx < mw * 0.12 && boxH > mh * 0.18) continue;
    slots.push({
      x: ((minx + maxx) / 2) / scale,
      y: ((miny + maxy) / 2) / scale,
      width: boxW / scale,
      height: boxH / scale,
      area: (boxW * boxH) / (scale * scale),
    });
  }

  if (slots.length < 3) return [];
  slots.sort((a, b) => b.area - a.area || a.y - b.y);
  const refW = slots[0]!.width;
  const similar = slots.filter((item) => Math.abs(item.width - refW) <= refW * 0.35);
  const chosen = similar.length >= 3 ? similar.slice(0, 3) : slots.slice(0, 3);
  chosen.sort((a, b) => a.y - b.y || a.x - b.x);
  return chosen;
}

function layerFromBox(
  slot: (typeof SLOT_ORDER)[number],
  box: SlotBox,
  _canvasWidth: number,
  canvasHeight: number
): Partial<DesignLayer> {
  const fontSize = Math.max(26, Math.min(Math.round(box.height * 0.55), Math.round(canvasHeight * 0.08)));
  return {
    id: `slot-${slot}`,
    type: slot,
    x: Math.round(box.x * 10) / 10,
    y: Math.round(box.y * 10) / 10,
    fontSize,
    color: SLOT_COLORS[slot],
    fontFamily: 'Arial',
    fontWeight: '700',
    rotation: 0,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    shadowOn: false,
    boxEnabled: false,
    boxWidth: Math.round(box.width * 0.92 * 10) / 10,
    boxHeight: Math.round(box.height * 0.82 * 10) / 10,
    boxColor: '#ffffff',
    textAlign: 'center',
  };
}

function fallbackLayers(width: number, height: number): Partial<DesignLayer>[] {
  const positions: Record<(typeof SLOT_ORDER)[number], number> = { code: 0.42, name: 0.55, phone: 0.68 };
  return SLOT_ORDER.map((slot) =>
    layerFromBox(
      slot,
      {
        x: width * 0.42,
        y: height * positions[slot],
        width: width * 0.28,
        height: height * 0.08,
        area: 0,
      },
      width,
      height
    )
  );
}

/** التعرف على مناطق الكود/الاسم/الهاتف (نفس خوارزمية Odoo PIL) */
export function detectLayersFromImage(
  source: CanvasImageSource,
  width: number,
  height: number
): DesignLayer[] {
  const boxes = detectSlotBoxes(source, width, height);
  const raw =
    boxes.length >= 3
      ? SLOT_ORDER.map((slot, i) => layerFromBox(slot, boxes[i]!, width, height))
      : fallbackLayers(width, height);
  return normalizeDesignLayers(raw, width, height);
}

export function detectLayersFromHtmlImage(img: HTMLImageElement): DesignLayer[] {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return [];
  return detectLayersFromImage(img, w, h);
}
