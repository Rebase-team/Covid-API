//https://developer.mapquest.com/documentation/open/geocoding-api/reverse/get/

const axios = require('axios').default;

function track_reverse_address(lat, lon, geo_reserve_key, pvoid_cb) {
  axios.get(`https://open.mapquestapi.com/geocoding/v1/reverse?key=${geo_reserve_key}&location=${lat},${lon}&includeRoadMetadata=true&includeNearestIntersection=true`).then((response) => {
    pvoid_cb({
      street: response.data.results[0].locations[0].street,
      city: response.data.results[0].locations[0].adminArea5,
      state: response.data.results[0].locations[0].adminArea3,
      country: response.data.results[0].locations[0].adminArea1,
      coords: {
        lat: response.data.results[0].locations[0].latLng.lat,
        lon: response.data.results[0].locations[0].latLng.lng
      }
    });
  }).catch((err) => { pvoid_cb(null); });
}

module.exports = {
  track_reverse_address: track_reverse_address
}