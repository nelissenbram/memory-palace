/**
 * Promise-based branded confirmation dialog. Replaces window.confirm (which WKWebView
 * renders as an origin-prefixed system alert — a "wrapped website" tell, Apple 4.0/4.2).
 * A single <ConfirmHost/> (mounted in the root layout) subscribes and renders the modal.
 * Falls back to window.confirm if no host is mounted, so a confirmation is never lost.
 */
export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface ConfirmRequest {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const listeners = new Set<(req: ConfirmRequest) => void>();

export function subscribeConfirm(fn: (req: ConfirmRequest) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function confirmDialog(input: ConfirmOptions | string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const opts = typeof input === "string" ? { message: input } : input;
  return new Promise<boolean>((resolve) => {
    if (listeners.size === 0) {
      // No host mounted — never block the user; fall back to the system dialog.
      resolve(window.confirm(opts.message));
      return;
    }
    listeners.forEach((fn) => fn({ opts, resolve }));
  });
}
