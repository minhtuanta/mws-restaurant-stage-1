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

    // Open idb promise
    static openRestaurantsDatabase() {
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('restaurants', 1, upgradeDb => {
            upgradeDb.createObjectStore(DBHelper.RESTAURANTS_STORE_NAME, {
                keyPath: 'id'
            });
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
                        if (!callbackCalled) {
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
                        if (!callbackCalled) {
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
}

module.exports = DBHelper;