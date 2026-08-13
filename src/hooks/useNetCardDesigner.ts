import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultLayer,
  sanitizeFilename,
} from '../lib/netcard/constants';
import { drawTextLayer, layerDisplayText, measureTextLayer } from '../lib/netcard/draw-text-layer';
import { loadTemplateImage } from '../lib/netcard/templates';
import { loadTemplateStore, saveTemplateEntry, getSavedTemplateSummary } from '../lib/netcard/storage';
import { isTextLayerType, resolveTemplateLayers } from '../lib/netcard/template-layout';
import type { DesignLayer, LayerType, NetworkFields } from '../lib/netcard/types';

function getLayerText(layer: DesignLayer, fields: NetworkFields, preview: boolean, guestMode: boolean): string {
  return layerDisplayText(layer, fields, preview || guestMode);
}

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'rotate' | null;

export function useNetCardDesigner(
  fields: NetworkFields,
  options: {
    guestMode?: boolean;
  } = {}
) {
  const guestMode = options.guestMode ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const layersRef = useRef<DesignLayer[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const previewModeRef = useRef(false);
  const templateIdRef = useRef<string | null>(null);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [savedSummary, setSavedSummary] = useState<Record<string, number>>({});
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  layersRef.current = layers;
  selectedIdRef.current = selectedId;
  previewModeRef.current = previewMode;
  templateIdRef.current = templateId;

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    layer?: DesignLayer;
    startRot?: number;
  }>({ mode: null, startX: 0, startY: 0, ox: 0, oy: 0 });

  const isDraggingRef = useRef(false);
  const undoRef = useRef<string[]>([]);

  const fitCanvasDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !canvas.width || !canvas.height) return;
    // CSS max-width + height:auto يحافظ على النسبة — نُفرّغ الأبعاد المضبوطة يدوياً
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    // ابدأ من الأعلى حتى يظهر رأس القالب مباشرة (لا توسيط عمودي يقصّ الحافة)
    container.scrollTop = 0;
    container.scrollLeft = 0;
  }, []);

  const syncCanvasFromBackground = useCallback(() => {
    const canvas = canvasRef.current;
    const bg = bgImageRef.current;
    if (!canvas || !bg?.complete || !bg.naturalWidth) return false;
    if (canvas.width !== bg.naturalWidth || canvas.height !== bg.naturalHeight) {
      canvas.width = bg.naturalWidth;
      canvas.height = bg.naturalHeight;
      setCanvasSize({ w: bg.naturalWidth, h: bg.naturalHeight });
    }
    fitCanvasDisplay();
    return true;
  }, [fitCanvasDisplay]);

  const pushHistory = useCallback(() => {
    undoRef.current.push(JSON.stringify(layersRef.current));
    if (undoRef.current.length > 40) undoRef.current.shift();
  }, []);

  const refreshSavedSummary = useCallback(async () => {
    const summary = await getSavedTemplateSummary();
    setSavedSummary(summary);
  }, []);

  useEffect(() => {
    refreshSavedSummary();
  }, [refreshSavedSummary]);

  const persistLayers = useCallback(
    (next: DesignLayer[], bg?: string) => {
      const id = templateIdRef.current;
      if (!id || guestMode) return;
      const entry = {
        layers: JSON.parse(JSON.stringify(next)),
        background: bg || bgImageRef.current?.src,
      };
      saveTemplateEntry(id, entry)
        .then(() => {
          setLastSavedAt(Date.now());
          setSavedSummary((prev) => ({ ...prev, [id]: next.length }));
        })
        .catch((e) => console.warn('persistLayers', e));
    },
    [guestMode]
  );

  const flushSave = useCallback(async () => {
    const id = templateIdRef.current;
    if (!id || guestMode || !layersRef.current.length) return;
    await saveTemplateEntry(id, {
      layers: JSON.parse(JSON.stringify(layersRef.current)),
      background: bgImageRef.current?.src,
      updatedAt: Date.now(),
    });
    setLastSavedAt(Date.now());
    setSavedSummary((prev) => ({ ...prev, [id]: layersRef.current.length }));
  }, [guestMode]);

  const measureText = useCallback((ctx: CanvasRenderingContext2D, layer: DesignLayer, text: string) => {
    return measureTextLayer(ctx, layer, text);
  }, []);

  const getBounds = useCallback(
    (layer: DesignLayer, preview: boolean) => {
      if (layer.type === 'image') {
        return { w: layer.width, h: layer.height, left: layer.x - layer.width / 2, top: layer.y - layer.height / 2 };
      }
      const canvas = canvasRef.current;
      if (!canvas) return { w: 0, h: 0, left: 0, top: 0 };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { w: 0, h: 0, left: 0, top: 0 };
      const text = getLayerText(layer, fieldsRef.current, preview, guestMode);
      const { w, h } = measureText(ctx, layer, text);
      return { w, h, left: layer.x - w / 2, top: layer.y - h / 2 };
    },
    [measureText, guestMode]
  );

  const drawLayer = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      layer: DesignLayer,
      preview: boolean,
      isExport: boolean,
      selId: string | null,
      prevMode: boolean
    ) => {
      if (!layer.visible) return;

      if (layer.type !== 'image') {
        const text = getLayerText(layer, fieldsRef.current, preview, guestMode);
        drawTextLayer(ctx, layer, text);
      } else {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        const img = imageCacheRef.current[layer.id];
        if (img?.complete) {
          ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
        ctx.restore();
      }

      if (!isExport && !prevMode && layer.id === selId) {
        const b = getBounds(layer, preview);
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.setLineDash([]);
        const hs = 12;
        [
          [-b.w / 2, -b.h / 2],
          [b.w / 2, -b.h / 2],
          [-b.w / 2, b.h / 2],
          [b.w / 2, b.h / 2],
        ].forEach(([hx, hy]) => {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#0f766e';
          ctx.lineWidth = 2;
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
          ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
        });
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -b.h / 2 - 22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    [getBounds, guestMode]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const bg = bgImageRef.current;
    if (!canvas || !bg?.complete || !bg.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    layersRef.current.forEach((l) =>
      drawLayer(ctx, l, previewModeRef.current, false, selectedIdRef.current, previewModeRef.current)
    );
  }, [drawLayer]);

  useEffect(() => {
    redraw();
  }, [redraw, layers, fields, previewMode, selectedId, canvasSize]);

  useEffect(() => {
    if (!bgLoaded) return;
    syncCanvasFromBackground();
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      syncCanvasFromBackground();
      redraw();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [bgLoaded, fitCanvasDisplay, syncCanvasFromBackground, redraw]);

  const loadBackgroundFromSrc = useCallback(
    async (id: string, src: string) => {
      setLoading(true);
      setBgLoaded(false);
      try {
        const prevId = templateIdRef.current;
        if (prevId && prevId !== id && !guestMode && layersRef.current.length) {
          await saveTemplateEntry(prevId, {
            layers: JSON.parse(JSON.stringify(layersRef.current)),
            background: bgImageRef.current?.src,
            updatedAt: Date.now(),
          });
        }

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('image load'));
          img.src = src;
        });
        bgImageRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          setCanvasSize({ w: img.naturalWidth, h: img.naturalHeight });
        } else {
          setCanvasSize({ w: img.naturalWidth, h: img.naturalHeight });
        }
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const store = await loadTemplateStore();
        const hadSaved = (store[id]?.layers?.length ?? 0) > 0;
        const initial = await resolveTemplateLayers(id, w, h);
        setLayers(JSON.parse(JSON.stringify(initial)));
        if (initial.length > 0 && !hadSaved && !guestMode) {
          saveTemplateEntry(id, { layers: initial, background: src }).catch(() => {});
        }
        setSelectedId(null);
        undoRef.current = [];
        setTemplateId(id);
        setBgLoaded(true);
        setSavedSummary((prev) => ({ ...prev, [id]: initial.length }));
        setTimeout(() => fitCanvasDisplay(), 50);
      } finally {
        setLoading(false);
      }
    },
    [fitCanvasDisplay, guestMode]
  );

  const loadBackground = useCallback(
    async (id: string) => {
      const src = await loadTemplateImage(id);
      await loadBackgroundFromSrc(id, src);
    },
    [loadBackgroundFromSrc]
  );

  const setLayersAndPersist = useCallback(
    (next: DesignLayer[]) => {
      layersRef.current = next;
      setLayers(next);
      persistLayers(next);
      redraw();
    },
    [persistLayers, redraw]
  );

  const addLayer = useCallback(
    (type: LayerType) => {
      if (!bgLoaded || !canvasRef.current) return;
      pushHistory();
      const l = defaultLayer(type, canvasRef.current.width, canvasRef.current.height, templateId ?? undefined);
      const next = [...layersRef.current, l];
      setLayersAndPersist(next);
      setSelectedId(l.id);
    },
    [bgLoaded, persistLayers, pushHistory, setLayersAndPersist]
  );

  const addImageLayer = useCallback(
    (file: File) => {
      if (!bgLoaded || !canvasRef.current) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        pushHistory();
        const l = defaultLayer('image', canvasRef.current!.width, canvasRef.current!.height);
        l.imageSrc = dataUrl;
        l.x = canvasRef.current!.width / 2;
        l.y = canvasRef.current!.height / 2;
        const img = new Image();
        img.onload = () => {
          l.width = Math.min(img.width, canvasRef.current!.width * 0.3);
          l.height = (img.height / img.width) * l.width;
          imageCacheRef.current[l.id] = img;
          const next = [...layersRef.current, l];
          setLayersAndPersist(next);
          setSelectedId(l.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [bgLoaded, pushHistory, setLayersAndPersist]
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => {
      const next = layersRef.current.map((l) => (l.id === id ? { ...l, ...patch } : l));
      setLayersAndPersist(next);
    },
    [setLayersAndPersist]
  );

  const deleteLayer = useCallback(() => {
    if (!selectedIdRef.current) return;
    pushHistory();
    const id = selectedIdRef.current;
    const next = layersRef.current.filter((l) => l.id !== id);
    delete imageCacheRef.current[id];
    setLayersAndPersist(next);
    setSelectedId(null);
  }, [pushHistory, setLayersAndPersist]);

  const toggleVisible = useCallback(
    (id: string) => {
      pushHistory();
      const next = layersRef.current.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
      setLayersAndPersist(next);
    },
    [pushHistory, setLayersAndPersist]
  );

  const undo = useCallback(() => {
    if (!undoRef.current.length) return;
    const prev = JSON.parse(undoRef.current.pop()!) as DesignLayer[];
    setLayersAndPersist(prev);
  }, [setLayersAndPersist]);

  const renderToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, rowFields: NetworkFields) => {
      const bg = bgImageRef.current;
      if (!bg?.complete) return;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(bg, 0, 0, ctx.canvas.width, ctx.canvas.height);
      const saved = fieldsRef.current;
      fieldsRef.current = rowFields;
      layersRef.current.forEach((l) => drawLayer(ctx, l, true, true, null, false));
      fieldsRef.current = saved;
    },
    [drawLayer]
  );

  const getExportBlob = useCallback(
    (rowOverride?: NetworkFields): { blob: Blob; filename: string; row: NetworkFields } | null => {
      const canvas = canvasRef.current;
      const bg = bgImageRef.current;
      if (!canvas || !bg?.complete) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const row = rowOverride ?? fieldsRef.current;
      renderToCanvas(ctx, row);
      const dataUrl = canvas.toDataURL('image/png');
      redraw();
      const bin = atob(dataUrl.split(',')[1] ?? '');
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const name = sanitizeFilename(row.name || fields.name || 'بطاقة');
      return { blob: new Blob([arr], { type: 'image/png' }), filename: `${name}.png`, row };
    },
    [fields.name, renderToCanvas, redraw]
  );

  const exportImage = useCallback(
    (rowOverride?: NetworkFields) => {
      const result = getExportBlob(rowOverride);
      if (!result) return;
      const link = document.createElement('a');
      link.download = result.filename;
      link.href = URL.createObjectURL(result.blob);
      link.click();
      URL.revokeObjectURL(link.href);
    },
    [getExportBlob]
  );

  const exportAll = useCallback(
    async (rows: NetworkFields[]) => {
      if (!rows.length) return;
      for (let i = 0; i < rows.length; i++) {
        exportImage(rows[i]);
        await new Promise((r) => setTimeout(r, 450));
      }
    },
    [exportImage]
  );

  const canvasPoint = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const getHandleHit = useCallback(
    (x: number, y: number, layer: DesignLayer): DragMode => {
      if (layer.id !== selectedIdRef.current || previewModeRef.current) return null;
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const scale = canvas && rect?.width ? canvas.width / rect.width : 1;
      const hitR = Math.max(14, 18 * scale);

      const b = getBounds(layer, previewModeRef.current);
      const cx = layer.x;
      const cy = layer.y;
      const rad = (layer.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const localX = (x - cx) * cos + (y - cy) * sin;
      const localY = -(x - cx) * sin + (y - cy) * cos;

      const corners: { id: DragMode; lx: number; ly: number }[] = [
        { id: 'resize-nw', lx: -b.w / 2, ly: -b.h / 2 },
        { id: 'resize-ne', lx: b.w / 2, ly: -b.h / 2 },
        { id: 'resize-sw', lx: -b.w / 2, ly: b.h / 2 },
        { id: 'resize-se', lx: b.w / 2, ly: b.h / 2 },
      ];
      for (const c of corners) {
        if (Math.hypot(localX - c.lx, localY - c.ly) < hitR) return c.id;
      }
      if (Math.hypot(localX, localY + b.h / 2 + 22) < hitR) return 'rotate';
      return null;
    },
    [getBounds]
  );

  const hitTest = useCallback(
    (x: number, y: number) => {
      for (let i = layersRef.current.length - 1; i >= 0; i--) {
        const l = layersRef.current[i];
        if (!l.visible) continue;
        const b = getBounds(l, previewModeRef.current);
        if (x >= b.left && x <= b.left + b.w && y >= b.top && y <= b.top + b.h) return l.id;
      }
      return null;
    },
    [getBounds]
  );

  const applyDrag = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || !dragRef.current.mode || !selectedIdRef.current) return;
      const { x, y } = canvasPoint(e);
      const d = dragRef.current;
      const mode = d.mode;
      const id = selectedIdRef.current;
      const l = layersRef.current.find((layer) => layer.id === id);
      if (!l || !d.layer) return;

      let patch: Partial<DesignLayer> = {};

      if (mode === 'move') {
        patch = { x: d.ox + (x - d.startX), y: d.oy + (y - d.startY) };
      } else if (mode && mode.startsWith('resize')) {
        const dist = Math.hypot(x - l.x, y - l.y);
        const base = Math.hypot(d.startX - l.x, d.startY - l.y) || 1;
        const ratio = dist / base;
        if (l.type === 'image') {
          patch = {
            width: Math.max(20, Math.round(d.layer.width * ratio)),
            height: Math.max(20, Math.round(d.layer.height * ratio)),
          };
        } else {
          patch = {
            fontSize: Math.max(8, Math.min(300, Math.round(d.layer.fontSize * ratio))),
          };
        }
      } else if (mode === 'rotate') {
        const startAngle = Math.atan2(d.startY - l.y, d.startX - l.x);
        const curAngle = Math.atan2(y - l.y, x - l.x);
        patch = {
          rotation: (d.startRot ?? 0) + ((curAngle - startAngle) * 180) / Math.PI,
        };
      }

      const next = layersRef.current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
      layersRef.current = next;
      setLayers(next);
      redraw();
    },
    [canvasPoint, redraw]
  );

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const hadDrag = !!dragRef.current.mode;
    dragRef.current.mode = null;
    document.removeEventListener('pointermove', applyDrag, true);
    document.removeEventListener('pointerup', endDrag, true);
    document.removeEventListener('pointercancel', endDrag, true);
    if (hadDrag) {
      persistLayers(layersRef.current);
    }
  }, [applyDrag, persistLayers]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!bgLoaded || previewModeRef.current || e.button !== 0) return;
      e.preventDefault();
      const { x, y } = canvasPoint(e);
      const sel = layersRef.current.find((l) => l.id === selectedIdRef.current);

      if (sel) {
        const handle = getHandleHit(x, y, sel);
        if (handle) {
          pushHistory();
          dragRef.current = {
            mode: handle,
            startX: x,
            startY: y,
            ox: sel.x,
            oy: sel.y,
            layer: JSON.parse(JSON.stringify(sel)),
            startRot: sel.rotation,
          };
          isDraggingRef.current = true;
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          document.addEventListener('pointermove', applyDrag, true);
          document.addEventListener('pointerup', endDrag, true);
          document.addEventListener('pointercancel', endDrag, true);
          return;
        }
      }

      const hit = hitTest(x, y);
      if (hit) {
        const l = layersRef.current.find((layer) => layer.id === hit)!;
        if (guestMode && isTextLayerType(l.type)) {
          setSelectedId(null);
          return;
        }
        setSelectedId(hit);
        pushHistory();
        dragRef.current = { mode: 'move', startX: x, startY: y, ox: l.x, oy: l.y, layer: JSON.parse(JSON.stringify(l)) };
        isDraggingRef.current = true;
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        document.addEventListener('pointermove', applyDrag, true);
        document.addEventListener('pointerup', endDrag, true);
        document.addEventListener('pointercancel', endDrag, true);
      } else {
        setSelectedId(null);
        redraw();
      }
    },
    [bgLoaded, canvasPoint, getHandleHit, hitTest, pushHistory, applyDrag, endDrag, redraw, guestMode]
  );

  const onPointerMoveHover = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current || previewModeRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = canvasPoint(e);
      const sel = layersRef.current.find((l) => l.id === selectedIdRef.current);
      if (sel) {
        const h = getHandleHit(x, y, sel);
        const cursors: Record<string, string> = {
          'resize-nw': 'nwse-resize',
          'resize-se': 'nwse-resize',
          'resize-ne': 'nesw-resize',
          'resize-sw': 'nesw-resize',
          rotate: 'grab',
          move: 'move',
        };
        canvas.style.cursor = h ? cursors[h] || 'default' : hitTest(x, y) === sel.id ? 'move' : 'crosshair';
      }
    },
    [canvasPoint, getHandleHit, hitTest]
  );

  useEffect(() => {
    layers.filter((l) => l.type === 'image' && l.imageSrc).forEach((l) => {
      if (!imageCacheRef.current[l.id]) {
        const img = new Image();
        img.src = l.imageSrc!;
        img.onload = () => redraw();
        imageCacheRef.current[l.id] = img;
      }
    });
  }, [layers, redraw]);

  const selectLayerByType = useCallback(
    (type: LayerType) => {
      const layer = layersRef.current.find((l) => l.type === type);
      if (layer) {
        setSelectedId(layer.id);
        redraw();
      }
    },
    [redraw]
  );

  const reloadCurrentTemplate = useCallback(async () => {
    if (!templateId) return;
    await loadBackground(templateId);
  }, [templateId, loadBackground]);

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;

  return {
    canvasRef,
    containerRef,
    templateId,
    loading,
    bgLoaded,
    layers,
    selectedId,
    selectedLayer,
    previewMode,
    setPreviewMode,
    canvasSize,
    savedSummary,
    lastSavedAt,
    refreshSavedSummary,
    loadBackground,
    loadBackgroundFromSrc,
    addLayer,
    addImageLayer,
    updateLayer,
    deleteLayer,
    toggleVisible,
    setSelectedId,
    undo,
    exportImage,
    getExportBlob,
    exportAll,
    onPointerDown,
    onPointerMove: onPointerMoveHover,
    onPointerUp: endDrag,
    selectLayerByType,
    reloadCurrentTemplate,
    flushSave,
  };
}
