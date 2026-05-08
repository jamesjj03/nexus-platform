import { CompanySlugGate } from "@/components/v2/CompanySlugGate";
export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  return <CompanySlugGate slug={company} target="admin" />;
}
