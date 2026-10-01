import './distribution-panel.css';
import {
  getDistributionViewModel,
  renderDistributionPanelMarkup,
  type DistributionActionKey,
  type DistributionProgress,
  type DistributionSnapshot,
} from './distribution-panel-model.ts';

type MaybePromise<T> = T | Promise<T>;

export interface DistributionActionContext {
  getSnapshot: () => DistributionSnapshot;
  setSnapshot: (snapshot: DistributionSnapshot) => void;
  updateProgress: (progress: DistributionProgress) => void;
}

export interface DistributionPanelActions {
  enterGame?: (context: DistributionActionContext) => MaybePromise<void>;
  downloadFullPack?: (context: DistributionActionContext) => MaybePromise<void>;
  importFullPack?: (file: File, context: DistributionActionContext) => MaybePromise<void>;
  checkUpdate?: (context: DistributionActionContext) => MaybePromise<void>;
  applyUpdate?: (context: DistributionActionContext) => MaybePromise<void>;
  repair?: (context: DistributionActionContext) => MaybePromise<void>;
}

export interface InstallDistributionPanelOptions {
  root?: HTMLElement;
  initial: DistributionSnapshot;
  actions: DistributionPanelActions;
  hidden?: boolean;
}

export interface DistributionPanelController {
  element: HTMLElement;
  getSnapshot: () => DistributionSnapshot;
  setSnapshot: (snapshot: DistributionSnapshot) => void;
  updateProgress: (progress: DistributionProgress) => void;
  open: () => void;
  close: () => void;
  destroy: () => void;
}

function copySnapshot(snapshot: DistributionSnapshot): DistributionSnapshot {
  return {
    ...snapshot,
    progress: snapshot.progress ? { ...snapshot.progress } : undefined,
  };
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return '操作没有完成，请稍后重试。';
}

export function installDistributionPanel(
  options: InstallDistributionPanelOptions,
): DistributionPanelController {
  const root = options.root ?? document.body;
  const layer = document.createElement('div');
  layer.className = 'lapis-distribution-layer';
  layer.dataset.component = 'distribution-panel';

  let snapshot = copySnapshot(options.initial);
  let hidden = options.hidden === true;
  let busy = false;
  let destroyed = false;

  const hasAction = (action: DistributionActionKey): boolean =>
    typeof (options.actions as Record<string, unknown>)[action] === 'function';

  const context: DistributionActionContext = {
    getSnapshot: () => copySnapshot(snapshot),
    setSnapshot: (next) => setSnapshot(next),
    updateProgress: (progress) => updateProgress(progress),
  };

  const render = (): void => {
    if (destroyed) return;
    const view = getDistributionViewModel(snapshot);
    const disabledActions = view.actions.filter((action) => !hasAction(action));
    layer.hidden = hidden;
    layer.innerHTML = renderDistributionPanelMarkup(snapshot, { busy, disabledActions });

    const fileInput = layer.querySelector<HTMLInputElement>('[data-role="pack-file"]');
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void perform('importFullPack', file);
    });

    for (const button of layer.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      button.addEventListener('click', () => {
        const action = button.dataset.action as DistributionActionKey | undefined;
        if (!action || busy || !hasAction(action)) return;
        if (action === 'importFullPack') {
          fileInput?.click();
          return;
        }
        void perform(action);
      });
    }
  };

  const setSnapshot = (next: DistributionSnapshot): void => {
    snapshot = copySnapshot(next);
    render();
  };

  const updateProgress = (progress: DistributionProgress): void => {
    snapshot = {
      ...snapshot,
      progress: {
        ...snapshot.progress,
        ...progress,
      },
    };
    render();
  };

  const perform = async (action: DistributionActionKey, file?: File): Promise<void> => {
    if (busy || !hasAction(action)) return;
    busy = true;
    render();
    try {
      switch (action) {
        case 'enterGame':
          await options.actions.enterGame?.(context);
          break;
        case 'downloadFullPack':
          await options.actions.downloadFullPack?.(context);
          break;
        case 'importFullPack':
          if (file) await options.actions.importFullPack?.(file, context);
          break;
        case 'checkUpdate':
          await options.actions.checkUpdate?.(context);
          break;
        case 'applyUpdate':
          await options.actions.applyUpdate?.(context);
          break;
        case 'repair':
          await options.actions.repair?.(context);
          break;
      }
    } catch (error) {
      const message = readableError(error);
      snapshot = {
        ...snapshot,
        state: 'ERROR',
        message,
        progress: {
          ...snapshot.progress,
          failure: message,
        },
      };
    } finally {
      busy = false;
      render();
    }
  };

  const open = (): void => {
    hidden = false;
    render();
    queueMicrotask(() => {
      layer.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    });
  };

  const close = (): void => {
    hidden = true;
    layer.hidden = true;
  };

  const destroy = (): void => {
    destroyed = true;
    layer.remove();
  };

  root.append(layer);
  render();

  return {
    element: layer,
    getSnapshot: () => copySnapshot(snapshot),
    setSnapshot,
    updateProgress,
    open,
    close,
    destroy,
  };
}
