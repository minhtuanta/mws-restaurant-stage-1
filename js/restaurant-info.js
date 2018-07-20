import DBHelper from './dbhelper';

let isBreadcrumbFilled = false;
let loadedMapScript = false;
let restaurantId;

const nameInput = document.getElementById('reviewer-name');
const ratingInput = document.getElementById('review-rating');
const commentInput = document.getElementById('review-comments');
const errorMessageElement = document.getElementById('error-message');
const successMessageElement = document.getElementById('success-message');
const requestSavedMessage = document.getElementById('request-saved-message');

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
    restaurantId = getParameterByName('id');
    if (!restaurantId) { // no id found in URL
        const error = 'No restaurant id in URL'
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(restaurantId, (error, restaurant) => {
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
};

function resetRestaurant() {
    const hours = document.getElementById('restaurant-hours');
    hours.innerHTML = '';

    resetReviews();
}

function resetReviews() {
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
function fillReviewsHTML(reviews = self.restaurant.reviews) {
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
    const updatedDate = new Date(review.updatedAt);
    date.innerHTML = `${updatedDate.getMonth()}/${updatedDate.getDay()}/${updatedDate.getFullYear()}`;

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
};

function addReview() {
    const review = {
        "restaurant_id": +restaurantId,
        "name": nameInput.value,
        "rating": +ratingInput.value,
        "comments": commentInput.value
    };

    if (isReviewValid(review)) {
        errorMessageElement.className = 'hidden';
        DBHelper.createReview({
            "restaurant_id": +restaurantId,
            "name": review.name,
            "rating": +review.rating,
            "comments": review.comments
        }, (error, newReview) => {
            if (error) {
                console.error(error);
            } else {
                self.restaurant.reviews.push(newReview);
                resetReviews();
                fillReviewsHTML();
                successMessageElement.className = '';
            }
        });
    }
    else {
        errorMessageElement.className = '';
        successMessageElement.className = 'hidden';
    }
}

function isReviewValid(review) {
    if (review.name && review.name.length > 0 && review.comments && review.comments.length > 0) {
        return true;
    }
    return false;
}

function showRequestSavedMessage() {
    requestSavedMessage.className = 'show';

    setTimeout(() => {
        requestSavedMessage.className = 'hide';
    }, 3000);
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
};

const showMapBtn = document.getElementById('show-map-btn');
const hideMapBtn = document.getElementById('hide-map-btn');
const mapContainer = document.getElementById('map-container');
const mainContent = document.getElementsByClassName('main-content');
const breadcrumb = document.getElementById('breadcrumb');
const footer = document.getElementById('footer');
const submitReviewBtn = document.getElementById('submit-review-btn');
const restaurantFavorability = document.getElementById('restaurant-favorability');

showMapBtn.addEventListener('click', () => {
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
    for (let element of mainContent) {
        element.className = 'main-content content-shrunk'
    }
    breadcrumb.className = 'breadcrumb-shrunk';
    footer.className = 'footer-shrunk';
});

hideMapBtn.addEventListener('click', () => {
    mapContainer.className = 'map-collapsed';
    showMapBtn.className = 'map-btn';
    hideMapBtn.className = 'map-btn hidden';
    for (let element of mainContent) {
        element.className = 'main-content content-expanded'
    }
    breadcrumb.className = 'breadcrumb-expanded';
    footer.className = 'footer-expanded';
});

submitReviewBtn.addEventListener('click', event => {
    event.preventDefault();
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
            .then(sw => {
                const review = {
                    "restaurant_id": +restaurantId,
                    "name": nameInput.value,
                    "rating": +ratingInput.value,
                    "comments": commentInput.value
                };

                if (isReviewValid(review)) {
                    errorMessageElement.className = 'hidden';
                    DBHelper.syncReview(sw, review, () => {
                        showRequestSavedMessage();
                    });
                }
                else {
                    errorMessageElement.className = '';
                    successMessageElement.className = 'hidden';
                }
            });
    } else { // otherwise, call server directly
        addReview();
    }
});

restaurantFavorability.addEventListener('click', () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
            .then(sw => {
                DBHelper.syncFavorite(sw, +restaurantId, !self.restaurant.is_favorite, () => {
                    showRequestSavedMessage();
                });
            });
    } else { // otherwise, call server directly
        DBHelper.updateRestaurantFavorability(+restaurantId, !self.restaurant.is_favorite, (error, isFavorite) => {
            if (!error) {
                self.restaurant.is_favorite = isFavorite;
                if (self.restaurant.is_favorite) {
                    restaurantFavorability.className = 'icon favorite-icon';
                    restaurantFavorability.setAttribute('aria-checked', 'true');
                } else {
                    restaurantFavorability.className = 'icon not-favorite-icon';
                    restaurantFavorability.setAttribute('aria-checked', 'false');
                }
            }
            else {
                console.error(error);
            }
        });
    }
});

fetchRestaurantFromURL((error) => {
    if (error) { // Got an error!
        console.error(error);
    } else {
        if (!isBreadcrumbFilled) {
            fillBreadcrumb();
            isBreadcrumbFilled = true;
        }

        if (self.restaurant.is_favorite) {
            restaurantFavorability.className = 'favorite-icon';
            restaurantFavorability.setAttribute('aria-checked', 'true');
        } else {
            restaurantFavorability.className = 'not-favorite-icon';
            restaurantFavorability.setAttribute('aria-checked', 'false');
        }
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.action === 'update-favorite') {
            if (event.data.restaurantId === +restaurantId) {
                self.restaurant.is_favorite = event.data.isFavorite;
                if (self.restaurant.is_favorite) {
                    restaurantFavorability.className = 'icon favorite-icon';
                    restaurantFavorability.setAttribute('aria-checked', 'true');
                } else {
                    restaurantFavorability.className = 'icon not-favorite-icon';
                    restaurantFavorability.setAttribute('aria-checked', 'false');
                }
            }
        } else if (event.data.action === 'add-review') {
            if (event.data.review.restaurant_id === +restaurantId) {
                self.restaurant.reviews.push(event.data.review);
                resetReviews();
                fillReviewsHTML();
                successMessageElement.className = '';
            }
        }
    });
}