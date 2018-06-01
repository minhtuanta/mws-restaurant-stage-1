import DBHelper from './dbhelper';

let restaurants,
    neighborhoods,
    cuisines;
var map;
var markers = [];
let lazyImageObserver = undefined;
let showedRestaurants = false;
let loadedMapScript = false;

if ("IntersectionObserver" in window) {
    lazyImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const lazyImage = entry.target;
                lazyImage.src = lazyImage.dataset.src;
                lazyImageObserver.unobserve(lazyImage);
            }
        })
    });
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) { // Got an error
            console.error(error);
        } else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    const map = document.getElementById('map');
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false
    });
    map.classList.remove('hidden');
    if (!showedRestaurants) {
        updateRestaurants();
    } else {
        addMarkersToMap();
    }
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
    showedRestaurants = true;
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        }
    })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    ul.classList.add('hidden');

    const loading = (document.getElementsByClassName('loading'))[0];
    loading.classList.remove('hidden');

    // Remove all map markers
    if (self.markers) {
        self.markers.forEach(m => m.setMap(null));
    }
    self.markers = [];
    self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    const loading = (document.getElementsByClassName('loading'))[0];
    loading.classList.add('hidden');
    ul.classList.remove('hidden');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    if (loadedMapScript) {
        addMarkersToMap();
    }
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
    image.alt = restaurant.name;
    image.title = restaurant.name;
    if (lazyImageObserver) {
        lazyImageObserver.observe(image);
    }
    li.append(image);

    const restaurantDetails = document.createElement('div');
    restaurantDetails.className = 'restaurant-details';

    const name = document.createElement('h1');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    neighborhood.className = 'neighborhood';
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    address.className = 'address';
    li.append(address);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);

    restaurantDetails.appendChild(name);
    restaurantDetails.appendChild(neighborhood);
    restaurantDetails.appendChild(address);
    restaurantDetails.appendChild(more);

    li.append(restaurantDetails);

    return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    if (self.map && restaurants && google) {
        restaurants.forEach(restaurant => {
            // Add marker to the map
            const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
            google.maps.event.addListener(marker, 'click', () => {
                window.location.href = marker.url
            });
            self.markers.push(marker);
        });
    }
}

const showMapBtn = document.getElementById('show-map-btn');
const hideMapBtn = document.getElementById('hide-map-btn');

showMapBtn.addEventListener('click', () => {
    const mapContainer = document.getElementById('map-container');

    if (!loadedMapScript) {
        let script = document.createElement('script');
        script.setAttribute('type', 'text/javascript')
        script.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=initMap';
        document.head.appendChild(script);
        loadedMapScript = true;
    }

    mapContainer.className = 'map-expanded';
    showMapBtn.className = 'map-btn hidden';
    hideMapBtn.className = 'map-btn';
});

hideMapBtn.addEventListener('click', () => {
    const mapContainer = document.getElementById('map-container');
    mapContainer.className = 'map-collapsed';
    showMapBtn.className = 'map-btn';
    hideMapBtn.className = 'map-btn hidden';
});

updateRestaurants();