const siteAssetsCache = 'restaurant-review-assets-v1';

const allCaches = [
    siteAssetsCache
];

self.addEventListener('install', event => {
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('restaurant-review-') &&
                        !allCaches.includes(cacheName);
                })
                .map(cacheName => caches.delete(cacheName))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {
        event.respondWith(serveSiteAsset(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

function serveSiteAsset(request) {
    return caches.open(siteAssetsCache)
        .then(cache => {
            return cache.match(request.url).then(response => {
                if (response) return response;

                return fetch(request).then(response => {
                    cache.put(request.url, response.clone());
                    return response;
                })
                .catch(error => console.log(error));
            });
        });
}