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
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}/restaurants/`;
    }

    // Open idb promise
    static openDatabase() {
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('restaurant-review', 1, upgradeDb => {
            const store = upgradeDb.createObjectStore('restaurants', {
                keyPath: 'id'
            });
        });
    }

    /**
     * Retrieve idb Promise
     */
    static get IDB_PROMISE() {
        if (!DBHelper._idbPromise) {
            DBHelper._idbPromise = DBHelper.openDatabase();
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
                fetch(DBHelper.DATABASE_URL)
                    .then(response => {
                        if (response.status === 200) {
                            response.json()
                                .then(data => {
                                    // Only retrieve db store if the browser supports indexed db
                                    let tx, store = undefined;
                                    if (db) {
                                        tx = db.transaction('restaurants', 'readwrite');
                                        store = tx.objectStore('restaurants')
                                    }

                                    data.forEach(restaurant => {
                                        restaurant.photograph = (restaurant.photograph ? restaurant.photograph : restaurant.id) + '.jpg';
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
                                })
                        } else {
                            callback(`Request failed. Returned status of ${response.status}`, null);
                        }
                    });

                // if db doesn't exist then there's no point to access db
                if (!db) return;

                db.transaction('restaurants', 'readonly')
                    .objectStore('restaurants')
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
                fetch(DBHelper.DATABASE_URL + id)
                    .then(response => {
                        if (response.status === 200) {
                            response.json()
                                .then(restaurant => {
                                    // Only retrieve db store if the browser supports indexed db
                                    let tx, store = undefined;
                                    if (db) {
                                        tx = db.transaction('restaurants', 'readwrite');
                                        store = tx.objectStore('restaurants')
                                    }

                                    restaurant.photograph = (restaurant.photograph ? restaurant.photograph : restaurant.id) + '.jpg';

                                    if (store) {
                                        store.put(restaurant);
                                    }

                                    callback(null, restaurant);
                                    callbackCalled = true;
                                    if (tx) {
                                        return tx.complete;
                                    }
                                })
                        } else {
                            callback(`Request failed. Returned status of ${response.status}`, null);
                        }
                    });

                // if db doesn't exist then there's no point to access db
                if (!db) return;

                db.transaction('restaurants', 'readonly')
                    .objectStore('restaurants')
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