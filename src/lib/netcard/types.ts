export type LayerType = 'name' | 'code' | 'phone' | 'image';

export interface DesignLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: CanvasTextAlign;
  rotation: number;
  opacity: number;
  visible: boolean;
  shadowOn: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  width: number;
  height: number;
  imageSrc: string | null;
  /** تكبير/تصغير (مثل Odoo) */
  scaleX?: number;
  scaleY?: number;
  /** صندوق خلف النص */
  boxEnabled?: boolean;
  boxWidth?: number;
  boxHeight?: number;
  boxColor?: string;
  /** لون خلفية صندوق الإدخال (قديم — يُحوَّل إلى boxColor) */
  coverFill?: string;
  /** حجم حرف N/C/P الأصلي (نسبة) */
  markerWRatio?: number;
  markerHRatio?: number;
  /** حجم صندوق الإدخال الأبيض (نسبة) */
  boxWRatio?: number;
  boxHRatio?: number;
}

export interface TemplateThumb {
  name: string;
  thumb: string;
}

export interface NetworkFields {
  name: string;
  code: string;
  phone: string;
}

export interface TemplateStoreEntry {
  layers: DesignLayer[];
  background?: string;
  updatedAt?: number;
}

export interface CustomTemplate {
  id: string;
  label: string;
  base64: string;
  thumb: string;
  createdAt: number;
}

export interface TemplatePreview {
  id: string;
  label: string;
  src: string;
  isCustom?: boolean;
}
