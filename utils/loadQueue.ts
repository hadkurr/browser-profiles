import {
  isCookieIsolationAvailable,
  restoreProfileCookies,
  saveProfileCookies,
} from "./cookieManager";

interface QueueJob {
  profileId: string;
  url: string;
  resolve: () => void;
}

class ProfileLoadQueue {
  private queue: QueueJob[] = [];
  private running = false;
  private waitMap = new Map<string, () => void>();

  enqueue(profileId: string, url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!isCookieIsolationAvailable()) {
        resolve();
        return;
      }
      this.queue.push({ profileId, url, resolve });
      this.tick();
    });
  }

  signalLoaded(profileId: string): void {
    const cb = this.waitMap.get(profileId);
    if (cb) {
      this.waitMap.delete(profileId);
      cb();
    }
  }

  private async tick(): Promise<void> {
    if (this.running || this.queue.length === 0) return;
    this.running = true;

    const job = this.queue.shift()!;
    try {
      await restoreProfileCookies(job.profileId);
    } catch {}
    job.resolve();

    await new Promise<void>((res) => {
      const timeout = setTimeout(() => {
        this.waitMap.delete(job.profileId);
        res();
      }, 6000);
      this.waitMap.set(job.profileId, () => {
        clearTimeout(timeout);
        res();
      });
    });

    try {
      await saveProfileCookies(job.profileId, job.url);
    } catch {}

    this.running = false;
    this.tick();
  }

  clear(): void {
    this.queue = [];
    this.waitMap.clear();
    this.running = false;
  }
}

export const loadQueue = new ProfileLoadQueue();
