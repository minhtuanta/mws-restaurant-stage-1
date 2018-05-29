import DBHelper from './dbhelper';

let restaurant;
var map;
let isBreadcrumbFilled = false;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            const map = document.getElementById('map');
            map.classList.remove('hidden');
            self.map = new google.maps.Map(map, {
                zoom: 16,
                center: restaurant.latlng,
                scrollwheel: false
            });
            if (!isBreadcrumbFilled) {
                fillBreadcrumb();
                isBreadcrumbFilled = true;
            }
            DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
        }
    });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant)
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        error = 'No restaurant id in URL'
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            resetRestaurant();
            fillRestaurantHTML();
            callback(null, restaurant)
        });
    }
}

function resetRestaurant() {
    const hours = document.getElementById('restaurant-hours');
    hours.innerHTML = '';

    const reviewContainer = document.getElementById('reviews-container');
    reviewContainer.innerHTML = '';
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.alt = restaurant.name;
    image.title = restaurant.name;
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const contentContainer = document.createElement('div');
    contentContainer.className = 'reviews-content-container';
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    contentContainer.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        contentContainer.appendChild(noReviews);
        return;
    }
    const ul = document.createElement('ul');
    ul.id = 'reviews-list';
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    contentContainer.appendChild(ul);

    container.appendChild(contentContainer);
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
    const li = document.createElement('li');
    const name = document.createElement('div');
    name.className = 'reviewer-name';
    name.innerHTML = review.name;

    const date = document.createElement('div');
    date.className = 'review-date';
    date.innerHTML = review.date;

    const reviewHeader = document.createElement('div');
    reviewHeader.className = 'review-header';
    reviewHeader.appendChild(name);
    reviewHeader.appendChild(date);
    li.appendChild(reviewHeader);

    const rating = document.createElement('div');
    rating.className = 'review-rating';
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('div');
    comments.className = 'comments';
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

fetchRestaurantFromURL((error) => {
    if (error) { // Got an error!
        console.error(error);
    } else {
        if (!isBreadcrumbFilled) {
            fillBreadcrumb();
            isBreadcrumbFilled = true;
        }
    }
});