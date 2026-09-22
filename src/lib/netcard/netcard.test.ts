import { describe, it, expect } from 'vitest';

import { defaultLayer, sanitizeFilename, TEMPLATE_NAMES } from './constants';

import { buildPresetLayers } from './template-presets';
import { normalizeDesignLayers } from './normalize-layer';
import { syncExtraCodeLayers } from './extra-code-layers';

describe('netcard constants', () => {

  it('has 17 builtin templates', () => {

    expect(TEMPLATE_NAMES).toHaveLength(17);

    expect(TEMPLATE_NAMES[0]).toBe('template1');

  });



  it('creates default text layer with size 48 and red color', () => {

    const l = defaultLayer('code', 1000, 800);

    expect(l.type).toBe('code');

    expect(l.fontSize).toBe(56);

    expect(l.color).toBe('#b91c1c');

    expect(l.textAlign).toBe('center');

  });



  it('builds preset layers for every builtin template', () => {

    for (const id of TEMPLATE_NAMES) {

      const layers = buildPresetLayers(id, 819, 1024);

      expect(layers).toHaveLength(3);

      expect(layers.map((l) => l.type)).toEqual(['name', 'code', 'phone']);

    }

  });



  it('sanitizes export filename', () => {

    expect(sanitizeFilename('شبكة/تجريب')).toBe('شبكة_تجريب');

    expect(sanitizeFilename('')).toBe('بطاقة');

  });

});

describe('Odoo layout detect & extra codes', () => {
  it('adds code layers for extraCodes', () => {
    const base = buildPresetLayers('template1', 800, 1000);
    const synced = syncExtraCodeLayers(base, 800, 1000, ['111', '222']);
    expect(synced.filter((l) => l.type === 'code').length).toBe(3);
  });
});

describe('Odoo layout normalize', () => {
  it('normalizes layers with box and scale from Odoo JSON shape', () => {
    const raw: Partial<import('./types').DesignLayer>[] = [
      {
        type: 'name',
        x: 100,
        y: 200,
        fontSize: 56,
        color: '#cc00bb',
        scaleX: 1.2,
        scaleY: 0.9,
        coverFill: '#f9f8f8',
        boxWidth: 300,
        boxHeight: 80,
      },
      { type: 'code', x: 1, y: 2, fontSize: 40, color: '#111111' },
      { type: 'phone', x: 3, y: 4, fontSize: 41, color: '#222222' },
    ];
    const layers = normalizeDesignLayers(raw, 819, 1024);
    expect(layers).toHaveLength(3);
    expect(layers[0].boxEnabled).toBe(true);
    expect(layers[0].boxColor).toBe('#f9f8f8');
    expect(layers[0].scaleX).toBe(1.2);
    expect(layers[0].scaleY).toBe(0.9);
  });
});

