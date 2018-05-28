const siteStaticCache = 'restaurant-review-static-v1';
const siteImgsCache = 'restaurant-review-imgs';

const allCaches = [
    siteStaticCache,
    siteImgsCache
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(siteStaticCache).then(cache => {
            return cache.addAll([
                '/',
                '/restaurant.html',
                'js/app.js',
                'js/main.js',
                'js/restaurant_info.js',
                'css/main.css',
                'css/restaurant.css',
                'icons/icon144.png'
            ]);
        })
    );
});

self.addEventListener('activate', event => {

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('restaurant-review-') &&
                        !allCaches.includes(cacheName);
                }).map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/restaurant.html')) {
            event.respondWith(caches.match('/restaurant.html'));
            return;
        }
        if (requestUrl.pathname.startsWith('/img')) {
            event.respondWith(serveImg(event.request));
            return;
        }
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

function serveImg(request) {
    return caches.open(siteImgsCache)
        .then(cache => {
            return cache.match(request.url).then(response => {
                const fetchResponse = fetch(request).then(response => {
                    cache.put(request.url, response.clone());
                    return response;
                });

                return response || fetchResponse;
            });
        });
}