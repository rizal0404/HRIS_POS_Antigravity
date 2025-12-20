const CACHE_VERSION = "v2";
const CACHE_NAME = `hris-pwa-${CACHE_VERSION}`;
const STATIC_CACHE = `hris-static-${CACHE_VERSION}`;

// Assets to pre-cache for offline access
const PRE_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// API routes that should use Network First strategy
const API_ROUTES = [
  "/api/",
  "supabase.co"
];

// Install event - pre-cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log("[SW] Pre-caching essential assets");
      await cache.addAll(PRE_CACHE);
    })()
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STATIC_CACHE) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
          return null;
        })
      );
      await self.clients.claim();
      console.log("[SW] Activated and claimed clients");
    })()
  );
});

// Helper: Check if request is an API call
function isApiRequest(request) {
  return API_ROUTES.some(route => request.url.includes(route));
}

// Helper: Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/.test(url.pathname);
}

// Fetch event - apply different strategies based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (except for allowed APIs)
  const requestURL = new URL(request.url);
  if (requestURL.origin !== self.location.origin && !isApiRequest(request)) {
    return;
  }

  // API requests: Network First with timeout
  if (isApiRequest(request)) {
    event.respondWith(networkFirstWithTimeout(request, 5000));
    return;
  }

  // Static assets: Stale While Revalidate
  if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation & other requests: Network First with cache fallback
  event.respondWith(networkFirstWithFallback(request));
});

// Strategy: Network First with timeout
async function networkFirstWithTimeout(request, timeout) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return cached version if available
    const cached = await cache.match(request);
    if (cached) {
      console.log("[SW] Serving from cache (network failed):", request.url);
      return cached;
    }
    throw error;
  }
}

// Strategy: Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Fetch fresh version in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached version immediately, or wait for network
  return cached || fetchPromise;
}

// Strategy: Network First with cache fallback
async function networkFirstWithFallback(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log("[SW] Serving from cache:", request.url);
      return cached;
    }

    // For navigation requests, return cached index.html (SPA fallback)
    if (request.mode === "navigate") {
      const fallback = await cache.match("/");
      if (fallback) {
        console.log("[SW] Serving SPA fallback for navigation");
        return fallback;
      }
    }

    throw error;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
