import { Database, Home } from "lucide-react";
import { Breadcrumbs, Header } from "@plane/ui";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { PageHead } from "@/components/core/page-title";
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { HubDataAssets } from "@/components/home/hub-data-assets";
import type { Route } from "./+types/page";
export default function HubDataPage({ params }: Route.ComponentProps) {
  return <><AppHeader header={<Header><Header.LeftItem><Breadcrumbs><Breadcrumbs.Item component={<BreadcrumbLink href={`/${params.workspaceSlug}/`} label="Hub 首页" icon={<Home size={16}/>} />} /><Breadcrumbs.Item component={<BreadcrumbLink label="数据资产" icon={<Database size={16}/>} />} /></Breadcrumbs></Header.LeftItem></Header>} /><ContentWrapper><PageHead title="数据资产 · Han Work Hub" /><div className="h-full overflow-auto"><HubDataAssets workspaceSlug={params.workspaceSlug} /></div></ContentWrapper></>;
}
