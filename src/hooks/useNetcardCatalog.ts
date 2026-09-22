import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCatalogKind,
  buildCatalogTemplates,
  type CatalogPersistResult,
  fetchCatalogState,
  filterCatalogTemplates,
  removeCatalogKind,
  setTemplateMeta,
  templateGroups,
} from '../lib/netcard/catalog';
import type { NetcardCatalogState, TemplateCatalogMeta } from '../lib/netcard/catalog-types';
import type { CustomTemplate } from '../lib/netcard/types';

export function useNetcardCatalog(customTemplates: CustomTemplate[]) {
  const [state, setState] = useState<NetcardCatalogState | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [walletFilter, setWalletFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [templateQuery, setTemplateQuery] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await fetchCatalogState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const allTemplates = useMemo(
    () => (state ? buildCatalogTemplates(state, customTemplates) : []),
    [state, customTemplates]
  );

  const groups = useMemo(() => templateGroups(allTemplates), [allTemplates]);

  const filterOpts = useMemo(
    () => ({
      typeId: typeFilter || undefined,
      walletId: walletFilter || undefined,
      groupName: groupFilter || undefined,
      query: templateQuery || undefined,
    }),
    [typeFilter, walletFilter, groupFilter, templateQuery]
  );

  const filteredTemplates = useMemo(
    () => filterCatalogTemplates(allTemplates, filterOpts),
    [allTemplates, filterOpts]
  );

  const filteredBuiltin = useMemo(
    () => filteredTemplates.filter((t) => t.isBuiltin),
    [filteredTemplates]
  );

  const filteredCustom = useMemo(
    () => filteredTemplates.filter((t) => t.isCustom),
    [filteredTemplates]
  );

  const addKind = useCallback(
    async (kind: 'type' | 'wallet', name: string): Promise<CatalogPersistResult> => {
      if (!state) return 'local-no-server';
      const result = await addCatalogKind(state, kind, name);
      setState(result.state);
      return result.persist;
    },
    [state]
  );

  const removeKind = useCallback(
    async (kind: 'type' | 'wallet', id: string): Promise<CatalogPersistResult> => {
      if (!state) return 'local-no-server';
      const result = await removeCatalogKind(state, kind, id);
      setState(result.state);
      return result.persist;
    },
    [state]
  );

  const updateTemplateMeta = useCallback(
    async (templateId: string, meta: TemplateCatalogMeta): Promise<CatalogPersistResult> => {
      if (!state) return 'local-no-server';
      const result = await setTemplateMeta(state, templateId, meta);
      setState(result.state);
      return result.persist;
    },
    [state]
  );

  const getTemplateDisplayName = useCallback(
    (id: string, fallback: string) => {
      const item = allTemplates.find((t) => t.id === id);
      return item?.name ?? fallback;
    },
    [allTemplates]
  );

  return {
    state,
    loading,
    reload,
    types: state?.types ?? [],
    wallets: state?.wallets ?? [],
    groups,
    allTemplates,
    filteredTemplates,
    filteredBuiltin,
    filteredCustom,
    typeFilter,
    setTypeFilter,
    walletFilter,
    setWalletFilter,
    groupFilter,
    setGroupFilter,
    templateQuery,
    setTemplateQuery,
    addKind,
    removeKind,
    updateTemplateMeta,
    getTemplateDisplayName,
  };
}
