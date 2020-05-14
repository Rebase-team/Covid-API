//https://developer.mapquest.com/documentation/open/geocoding-api/reverse/get/

const axios = require('axios').default;

function track_reverse_address(lat, lon, pvoid_cb){
    axios.get('').then((response) => {

    }).catch((err) => { pvoid_cb(null); });
}

module.exports = {
    track_reverse_address: track_reverse_address
}