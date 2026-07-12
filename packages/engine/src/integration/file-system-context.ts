export interface FileAccess {
  path: string;
  name: string;
  lastAccessed: number;
  accessCount: number;
}

export class FileSystemContext {
  private recentFiles: FileAccess[] = [];

  recordAccess(path: string, name: string): void {
    const existing = this.recentFiles.find((f) => f.path === path);
    if (existing) {
      existing.lastAccessed = Date.now();
      existing.accessCount++;
    } else {
      this.recentFiles.unshift({ path, name, lastAccessed: Date.now(), accessCount: 1 });
    }

    if (this.recentFiles.length > 50) {
      this.recentFiles = this.recentFiles.slice(0, 50);
    }
  }

  getRecentFiles(limit = 10): FileAccess[] {
    return [...this.recentFiles].sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, limit);
  }

  getTopFiles(limit = 5): FileAccess[] {
    return [...this.recentFiles].sort((a, b) => b.accessCount - a.accessCount).slice(0, limit);
  }
}
