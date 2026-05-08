import { CrewPortal } from "@/components/v2/CrewPortal";
export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  return <CrewPortal companySlug={company} />;
}
