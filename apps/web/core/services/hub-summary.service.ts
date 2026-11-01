import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import type { HubSummary } from "@/components/home/hub-summary.helpers";

export class HubSummaryService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }
  async getSummary(workspaceSlug: string): Promise<HubSummary> {
    return this.get(`/api/workspaces/${workspaceSlug}/hub-summary/`).then(
      (response) => response.data,
    );
  }
}
