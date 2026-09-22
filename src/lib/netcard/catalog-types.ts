export type NetcardThemeId = 'brand' | 'odoo' | 'teal' | 'navy';

export interface CatalogKindItem {
  id: string;
  name: string;
  code?: string;
}

export interface TemplateCatalogMeta {
  name?: string;
  typeId?: string | null;
  walletId?: string | null;
  groupName?: string;
  featured?: boolean;
}

export interface CatalogTemplateItem {
  id: string;
  name: string;
  typeId: string | null;
  typeName: string;
  walletId: string | null;
  walletName: string;
  groupName: string;
  isBuiltin: boolean;
  isCustom?: boolean;
  featured?: boolean;
  imageFilename?: string;
}

export interface NetcardCatalogState {
  types: CatalogKindItem[];
  wallets: CatalogKindItem[];
  /** overrides + custom template meta */
  templateMeta: Record<string, TemplateCatalogMeta>;
}

export interface NetcardCatalogSnapshot {
  types: CatalogKindItem[];
  wallets: CatalogKindItem[];
  templates: CatalogTemplateItem[];
}
