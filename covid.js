//https://github.com/devarthurribeiro/covid19-brazil-api
//https://covid19-brazil-api-docs.now.sh/

const axios = require('axios').default;

/**
 * 
 * @param {function} pvoid_cb 
 */
function covid_api_report_all_states(pvoid_cb){
    axios.get('https://covid19-brazil-api.now.sh/api/report/v1').then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

/**
 * 
 * @param {string} uf 
 * @param {function} pvoid_cb 
 */
function covid_api_report_state(uf, pvoid_cb){
    axios.get(`https://covid19-brazil-api.now.sh/api/report/v1/brazil/uf/${uf}`).then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

/**
 * 
 * @param {function} pvoid_cb 
 * @param {Date} date 
 */
function covid_api_report_cases(date, pvoid_cb){
    let arr = date.toLocaleDateString().split('/');
    axios.get(`https://covid19-brazil-api.now.sh/api/report/v1/brazil/${arr[2] + arr[1] + arr[0]}`).then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

module.exports = {
    covid_api_report_all_states: covid_api_report_all_states,
    covid_api_report_state: covid_api_report_state,
    covid_api_report_cases: covid_api_report_cases
}