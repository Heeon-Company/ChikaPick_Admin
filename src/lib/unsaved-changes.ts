const fileIds = new WeakMap<File, number>();
let nextFileId = 0;

export function formSnapshot(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (typeof File !== "undefined" && item instanceof File) {
      if (!fileIds.has(item)) fileIds.set(item, ++nextFileId);
      return { selectedFile: fileIds.get(item) };
    }
    return item;
  });
}

export class UnsavedChanges {
  private baseline: string | null = null;
  dirty = false;

  observe(snapshot: string, ready: boolean) {
    if (!ready) this.baseline = null;
    else this.baseline ??= snapshot;
    this.dirty = ready && snapshot !== this.baseline;
  }

  saved() {
    this.baseline = null;
    this.dirty = false;
  }
}
