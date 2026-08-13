import { describe, it, expect } from 'vitest';

import { defaultLayer, sanitizeFilename, TEMPLATE_NAMES } from './constants';

import { buildPresetLayers } from './template-presets';



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

