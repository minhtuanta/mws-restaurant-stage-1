import DBHelper from './js/dbhelper';

const siteStaticCache = 'restaurant-review-static-v2';
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
                'js/restaurant-info.js',
                'icons/icon144.png',
                'css/main.css',
                'css/restaurant.css'
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

self.addEventListener('sync', event => {
    switch (event.tag) {
        case 'sync-favorite':
            event.waitUntil(DBHelper.readAllRecords(DBHelper.SYNC_FAVORITE_STORE_NAME)
                .then(favoriteRequests => {
                    favoriteRequests.forEach(request => {
                        DBHelper.updateRestaurantFavorability(request.restaurantId, request.isFavorite, (error, isFavorite) => {
                            if (!error) {
                                DBHelper.deleteRecord(DBHelper.SYNC_FAVORITE_STORE_NAME, request.restaurantId);
                                self.clients.matchAll().then(clients => {
                                    clients.forEach(client => {
                                        client.postMessage({
                                            action: 'update-favorite',
                                            restaurantId: request.restaurantId,
                                            isFavorite: isFavorite
                                        })
                                    });
                                });
                            }
                        });
                    })
                }));
            break;
        case 'sync-review':
            event.waitUntil(DBHelper.readAllRecords(DBHelper.SYNC_REVIEW_STORE_NAME)
                .then(addReviewRequests => {
                    addReviewRequests.forEach(request => {
                        DBHelper.createReview(request.review, (error, newReview) => {
                            if (error) {
                                console.error(error);
                            } else {
                                DBHelper.deleteRecord(DBHelper.SYNC_REVIEW_STORE_NAME, request.id);
                                self.clients.matchAll().then(clients => {
                                    clients.forEach(client => {
                                        client.postMessage({
                                            action: 'add-review',
                                            review: newReview
                                        })
                                    });
                                });
                            }
                        });
                    });
                }));
            break;
    }
});