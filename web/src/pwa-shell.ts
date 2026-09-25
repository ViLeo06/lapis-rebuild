declare global {
  interface ImportMeta {
    readonly env: { readonly PROD: boolean };
  }
}

const PWA_UPDATE_EVENT = 'lapis-pwa-update-ready';

export function registerAppShellServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT));
            }
          });
        });
      })
      .catch((error) => {
        console.warn('PWA app-shell registration failed', error);
      });
  });
}

registerAppShellServiceWorker();
