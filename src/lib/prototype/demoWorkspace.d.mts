export interface DemoCollection<T extends { id: string }> {
  getAll(): T[];
  replace(items: T[]): T[];
  add(item: T): T[];
  update(id: string, updater: (item: T) => T): boolean;
  remove(id: string): boolean;
  reset(): T[];
  subscribe(
    callback: (items: T[]) => void,
    onError?: (error: unknown) => void
  ): () => void;
}

export class DemoWorkspaceStorageError extends Error {}

export function createDemoCollection<T extends { id: string }>(
  key: string,
  fixtures: T[],
  storage?: Storage | null
): DemoCollection<T>;

export function resetDemoWorkspace(storage?: Storage | null): void;
export function createDemoId(prefix: string): string;
export function runDemoWrite<T, D = false>(
  isDemoMode: boolean,
  write: () => T,
  deniedResult?: D
): T | D;
