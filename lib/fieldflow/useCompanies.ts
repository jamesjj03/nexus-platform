"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FieldFlowCompanyConfig,
  applyCompanyTheme,
  defaultCompanyConfig,
  getActiveCompanySlug,
  loadCompanies,
  setActiveCompanySlug,
  resolveCompanySlug,
} from "./companyConfig";

export function useCompanies() {
  const [companies, setCompanies] = useState<FieldFlowCompanyConfig[]>([defaultCompanyConfig]);
  const [activeSlug, setActiveSlug] = useState(defaultCompanyConfig.slug);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    async function run() {
      const savedSlug = getActiveCompanySlug();
      setActiveSlug(savedSlug);
      const loaded = await loadCompanies();
      if (!live) return;
      setCompanies(loaded);
      const active = loaded.find((c) => c.slug === savedSlug) ?? loaded[0] ?? defaultCompanyConfig;
      setActiveSlug(active.slug);
      setActiveCompanySlug(active.slug);
      applyCompanyTheme(active);
      setLoading(false);
    }
    run();
    return () => { live = false; };
  }, []);

  const activeCompany = useMemo(
    () => companies.find((c) => c.slug === activeSlug) ?? companies[0] ?? defaultCompanyConfig,
    [companies, activeSlug]
  );

  function selectCompany(slug: string) {
    const resolvedSlug = resolveCompanySlug(slug, companies);
    const selected = companies.find((c) => c.slug === resolvedSlug) ?? defaultCompanyConfig;
    setActiveSlug(selected.slug);
    setActiveCompanySlug(selected.slug);
    applyCompanyTheme(selected);
  }

  function replaceCompanies(next: FieldFlowCompanyConfig[]) {
    setCompanies(next.length ? next : [defaultCompanyConfig]);
  }

  return { companies, activeCompany, activeSlug, loading, selectCompany, replaceCompanies };
}
