"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { fetchDeviceSession, routeForRole } from "@/lib/fieldflow/deviceAuth";
import { resolveCompanySlug, setActiveCompanySlug, applyCompanyTheme } from "@/lib/fieldflow/companyConfig";

export function CompanySlugGate({ slug, target = "login" }: { slug: string; target?: "login" | "dashboard" | "tools" | "crew" | "admin" }) {
  const router = useRouter();
  const { companies, loading } = useCompanies();

  useEffect(() => {
    if (loading) return;
    const resolved = resolveCompanySlug(slug, companies);
    const company = companies.find((c) => c.slug === resolved) ?? companies[0];
    if (company) {
      setActiveCompanySlug(company.slug);
      applyCompanyTheme(company);
    }

    fetchDeviceSession().then((session) => {
    if (session?.remember && session.slug === resolved && target === "login") {
      router.replace(routeForRole(session.role, resolved));
      return;
    }

    if (target === "dashboard") router.replace("/dashboard");
    else if (target === "tools") router.replace("/tools");
    else if (target === "crew") router.replace("/crew");
    else if (target === "admin") router.replace("/admin");
    else router.replace("/");
    }).catch(() => router.replace("/"));
  }, [loading, companies, slug, target, router]);

  return (
    <main className="ff-lock-page">
      <section className="ff-lock-shell">
        <article className="ff-lock-card" style={{ textAlign: "center" }}>
          <div className="nexus-loading-logo"><img src="/brand/nexus-app-icon.png" alt="Nexus" /></div>
          <p className="micro">Nexus Secure</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: 34, letterSpacing: "-.06em", lineHeight: .95 }}>Opening company</h1>
          <p style={{ color: "var(--muted)", fontWeight: 800, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Loader2 className="nexus-spin" size={17}/> /{slug}</p>
        </article>
      </section>
    </main>
  );
}
