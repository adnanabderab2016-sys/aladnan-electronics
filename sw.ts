/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />

const CACHE_NAME = 'enjaz-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg'];

(self as any).addEventListener('install', (event: any) => {
  event.waitUntil(
    (caches as any).open(CACHE_NAME).then((cache: any) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  (self as any).skipWaiting();
});

(self as any).addEventListener('activate', (event: any) => {
  event.waitUntil(
    (caches as any).keys().then((keys: string[]) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => (caches as any).delete(k)))
    )
  );
  (self as any).clients.claim();
});

(self as any).addEventListener('fetch', (event: any) => {
  const request: Request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.pathname.includes('supabase')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res: Response) => {
          const copy = res.clone();
          (caches as any).open(CACHE_NAME).then((c: any) => c.put(request, copy));
          return res;
        })
        .catch(() => (caches as any).match(request).then((r: Response | undefined) => r ?? (caches as any).match('/index.html')))
    );
    return;
  }

  event.respondWith(
    (caches as any).match(request).then((cached: Response | undefined) => {
      if (cached) return cached;
      return fetch(request).then((res: Response) => {
        if (res.ok && url.origin === (self as any).location.origin) {
          const copy = res.clone();
          (caches as any).open(CACHE_NAME).then((c: any) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached as Response);
    })
  );
});
