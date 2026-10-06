import { ResponseResource } from "@/data/demo/resources";
import { DEMO_RESOURCES } from "@/data/demo/resources";
import { createDemoCollection, runDemoWrite } from "@/lib/prototype/demoWorkspace.mjs";

const demoResources = createDemoCollection("isie-prototype-demo-resources", DEMO_RESOURCES);

export interface IResourceService {
  getResources(category?: string, isDemoMode?: boolean): Promise<ResponseResource[]>;
  getResourceById(id: string, isDemoMode?: boolean): Promise<ResponseResource | null>;
  simulateAllocation(id: string, delta: number, isDemoMode: boolean): Promise<boolean>;
}

export class ResourceService implements IResourceService {
  async getResources(category?: string, isDemoMode = false): Promise<ResponseResource[]> {
    if (!isDemoMode) return [];
    const resources = demoResources.getAll();
    return category && category !== "ALL" ? resources.filter((resource) => resource.category === category) : resources;
  }

  async getResourceById(id: string, isDemoMode = false): Promise<ResponseResource | null> {
    if (!isDemoMode) return null;
    return demoResources.getAll().find((resource) => resource.id === id) || null;
  }

  async simulateAllocation(id: string, delta: number, isDemoMode: boolean): Promise<boolean> {
    return runDemoWrite(isDemoMode && Number.isInteger(delta) && Math.abs(delta) === 1, () =>
      demoResources.update(id, (resource) => {
        const currentAllocated = Math.max(0, Math.min(resource.totalCapacity, resource.currentAllocated + delta));
        return {
          ...resource,
          currentAllocated,
          status: currentAllocated >= resource.totalCapacity ? "SATURATED" : resource.status === "SATURATED" ? "STANDBY" : resource.status,
          lastUpdated: "Updated in local demo workspace",
        };
      })
    );
  }

  subscribeDemoResources(callback: (items: ResponseResource[]) => void, onError?: (error: unknown) => void): () => void {
    let items: ResponseResource[];
    try {
      items = demoResources.getAll();
    } catch (error) {
      if (!onError) throw error;
      onError(error);
      return () => {};
    }
    callback(items);
    return demoResources.subscribe(callback, onError);
  }
}

export const resourceService = new ResourceService();
