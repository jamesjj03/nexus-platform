import { ManagerApp } from "@/components/v2/ManagerApp";
export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  return <ManagerApp view="work" companySlug={company} />;
}
