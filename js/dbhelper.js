import idb from 'idb';

// idb Promise instance
let _idbPromise;

/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get API_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}/`;
    }

    static get RESTAURANT_API_URL() {
        return `${DBHelper.API_URL}restaurants/`;
    }

    static get REVIEW_API_URL() {
        return `${DBHelper.API_URL}reviews/`;
    }

    static get RESTAURANTS_STORE_NAME() {
        return 'restaurants';
    }

    static get SYNC_FAVORITE_STORE_NAME() {
        return 'sync-favorite';
    }

    static get SYNC_REVIEW_STORE_NAME() {
        return 'sync-review';
    }

    // Open idb promise
    static openRestaurantsDatabase() {
        return idb.open('restaurants', 1, upgradeDb => {
            if (!upgradeDb.objectStoreNames.contains(DBHelper.RESTAURANTS_STORE_NAME)) {
                upgradeDb.createObjectStore(DBHelper.RESTAURANTS_STORE_NAME, {
                    keyPath: 'id'
                });
            }
            if (!upgradeDb.objectStoreNames.contains(DBHelper.SYNC_FAVORITE_STORE_NAME)) {
                upgradeDb.createObjectStore(DBHelper.SYNC_FAVORITE_STORE_NAME, {
                    keyPath: 'restaurantId'
                });
            }
            if (!upgradeDb.objectStoreNames.contains(DBHelper.SYNC_REVIEW_STORE_NAME)) {
                upgradeDb.createObjectStore(DBHelper.SYNC_REVIEW_STORE_NAME, {
                    keyPath: 'id'
                });
            }
        });
    }

    /**
     * Retrieve idb Promise
     */
    static get IDB_PROMISE() {
        if (!DBHelper._idbPromise) {
            DBHelper._idbPromise = DBHelper.openRestaurantsDatabase();
        }

        return DBHelper._idbPromise;
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {
        let callbackCalled = false;

        DBHelper.IDB_PROMISE
            .then(db => {
                // always fetch the new restaurants info. However, we will display cache items (if any).
                // If there's no restaurants in cached indexedDB, the fetch will return restaurants and cache them.
                fetch(DBHelper.RESTAURANT_API_URL)
                    .then(restaurantsResponse => {
                        if (restaurantsResponse.status === 200) {
                            restaurantsResponse.json()
                                .then(data => {
                                    fetch(DBHelper.REVIEW_API_URL)
                                        .then(reviewsResponse => {
                                            if (reviewsResponse.status === 200) {
                                                return reviewsResponse.json();
                                            }
                                            else {
                                                return [];
                                            }
                                        })
                                        .then(reviews => {
                                            // Only retrieve db store if the browser supports indexed db
                                            let tx = undefined, store = undefined;
                                            if (db) {
                                                tx = db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite');
                                                store = tx.objectStore(DBHelper.RESTAURANTS_STORE_NAME)
                                            }

                                            data.forEach(restaurant => {
                                                restaurant.photograph = (restaurant.photograph ? restaurant.photograph : restaurant.id) + '.webp';
                                                restaurant.reviews = reviews.filter(review => review.restaurant_id === restaurant.id);
                                                if (typeof restaurant.is_favorite === 'string') {
                                                    restaurant.is_favorite = restaurant.is_favorite === 'true';
                                                }

                                                // only cache restaurant if the browser supports indexed DB.
                                                if (store) {
                                                    store.put(restaurant);
                                                }
                                            });

                                            callback(null, data);
                                            callbackCalled = true;
                                            if (tx) {
                                                return tx.complete;
                                            }
                                        });
                                })
                        } else {
                            callback(`Request failed. Returned status of ${restaurantsResponse.status}`, null);
                        }
                    });

                // if db doesn't exist then there's no point to access db
                if (!db) return;

                db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readonly')
                    .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
                    .getAll().then(restaurants => {
                        if (!callbackCalled && restaurants) {
                            callbackCalled = true;
                            callback(null, restaurants);
                        }
                    });
            });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        let callbackCalled = false;

        DBHelper.IDB_PROMISE
            .then(db => {
                // always fetch the new restaurant info. However, we will display cache items (if any).
                // If there's no restaurants in cached indexedDB, the fetch will return the requested
                // restaurant and cache it.
                fetch(DBHelper.RESTAURANT_API_URL + id)
                    .then(restaurantsResponse => {
                        if (restaurantsResponse.status === 200) {
                            restaurantsResponse.json()
                                .then(restaurant => {
                                    fetch(`${DBHelper.REVIEW_API_URL}?restaurant_id=${restaurant.id}`)
                                        .then(reviewsResponse => {
                                           if (reviewsResponse.status === 200) {
                                               return reviewsResponse.json();
                                           }
                                           else {
                                               return [];
                                           }
                                        })
                                        .then(reviews => {
                                            // Only retrieve db store if the browser supports indexed db
                                            let tx, store = undefined;
                                            if (db) {
                                                tx = db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite');
                                                store = tx.objectStore(DBHelper.RESTAURANTS_STORE_NAME)
                                            }

                                            restaurant.photograph = (restaurant.photograph ? restaurant.photograph : restaurant.id) + '.webp';
                                            restaurant.reviews = reviews;
                                            if (typeof restaurant.is_favorite === 'string') {
                                                restaurant.is_favorite = restaurant.is_favorite === 'true';
                                            }

                                            if (store) {
                                                store.put(restaurant);
                                            }

                                            callback(null, restaurant);
                                            callbackCalled = true;
                                            if (tx) {
                                                return tx.complete;
                                            }
                                        });
                                })
                        } else {
                            callback(`Request failed. Returned status of ${restaurantsResponse.status}`, null);
                        }
                    });

                // if db doesn't exist then there's no point to access db
                if (!db) return;

                db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readonly')
                    .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
                    .get(+id).then(restaurant => {
                        if (!callbackCalled && restaurant) {
                            callback(null, restaurant);
                            callbackCalled = true;
                        }
                    });
            });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
                position: restaurant.latlng,
                title: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant),
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
        return marker;
    }

    /**
     * Create review
     */
    static createReview(review, callback) {
        fetch(DBHelper.REVIEW_API_URL, {
            method: 'POST',
            body: JSON.stringify(review)
        }).then(response => {
            if (response.status === 201) {
                response.json().then(newReview => {
                    DBHelper.IDB_PROMISE
                        .then(db => {
                            let tx, store = undefined;
                            if (db) {
                                tx = db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite');
                                store = tx.objectStore(DBHelper.RESTAURANTS_STORE_NAME);
                            }

                            if (store) {
                                store.get(newReview.restaurant_id).then(restaurant => {
                                    restaurant.reviews.push(newReview);
                                    store.put(restaurant);

                                    if (tx) {
                                        return tx.complete;
                                    }
                                })
                            }
                        })

                    if (callback) callback(null, newReview);
                });
            }
            else {
                if (callback) callback(`Can't create review. Returned status of ${response.status}`, null);
            }
        });
    }

    /**
     * Update restaurant's favorite
     */
    static updateRestaurantFavorability(restaurantId, isFavorite, callback) {
        fetch(`${DBHelper.RESTAURANT_API_URL}${restaurantId}/?is_favorite=${isFavorite ? 'true' : 'false'}`, {
            method: 'PUT'
        }).then(response => {
            if (response.status === 200) {
                DBHelper.IDB_PROMISE
                    .then(db => {
                        let tx = undefined, store = undefined;
                        if (db) {
                            tx = db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite');
                            store = tx.objectStore(DBHelper.RESTAURANTS_STORE_NAME);
                        }

                        if (store) {
                            store.get(+restaurantId).then(restaurant => {
                                restaurant.is_favorite = isFavorite;
                                store.put(restaurant);

                                if (tx) {
                                    return tx.complete;
                                }
                            })
                        }
                    });

                if (callback) {
                    callback(null, isFavorite);
                }
            } else {
                if (callback) {
                    callback(`Can't update restaurant's favorability. Returned status of ${response.status}`, null);
                }
            }
        })
    }

    static syncFavorite(sw, restaurantId, isFavorite, callback) {
        let favoriteRequest = {
            restaurantId: restaurantId,
            isFavorite: isFavorite
        };
        DBHelper.IDB_PROMISE
            .then(db => {
                let tx = undefined, store = undefined;
                if (db) {
                    tx = db.transaction(DBHelper.SYNC_FAVORITE_STORE_NAME, 'readwrite');
                    store = tx.objectStore(DBHelper.SYNC_FAVORITE_STORE_NAME);
                }

                if (store) {
                    store.put(favoriteRequest);
                    sw.sync.register('sync-favorite');
                    if (callback) {
                        callback();
                    }
                    if (tx) {
                        return tx.complete;
                    }
                }
            });
    }

    static syncReview(sw, review, callback) {
        let addReviewRequest = {
            id: new Date().toISOString(),
            review: review
        };
        DBHelper.IDB_PROMISE
            .then(db => {
                let tx = undefined, store = undefined;
                if (db) {
                    tx = db.transaction(DBHelper.SYNC_REVIEW_STORE_NAME, 'readwrite');
                    store = tx.objectStore(DBHelper.SYNC_REVIEW_STORE_NAME);
                }

                if (store) {
                    store.put(addReviewRequest);
                    sw.sync.register('sync-review');
                    if (callback) {
                        callback();
                    }
                    if (tx) {
                        return tx.complete;
                    }
                }
            });
    }

    static readAllRecords(storeName) {
        return DBHelper.IDB_PROMISE.then(db => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);

            return store.getAll();
        });
    }

    static deleteRecord(storeName, id) {
        DBHelper.IDB_PROMISE.then(db => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            return tx.complete;
        });
    }
}

module.exports = DBHelper;