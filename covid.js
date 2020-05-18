//https://github.com/devarthurribeiro/covid19-brazil-api
//https://covid19-brazil-api-docs.now.sh/
//https://brasil.io/api/dataset/covid19/boletim/data/?format=json

const axios = require('axios').default;

/**
 * 
 * @param {(data: any)=>void} pvoid_cb 
 */
function covid_api_report_all_states(pvoid_cb){
    axios.get('https://covid19-brazil-api.now.sh/api/report/v1').then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

/**
 * 
 * @param {string} uf 
 * @param {(data: any)=>void} pvoid_cb 
 */
function covid_api_report_state(uf, pvoid_cb){
    axios.get(`https://covid19-brazil-api.now.sh/api/report/v1/brazil/uf/${uf}`).then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

/**
 * 
 * @param {(data: any)=>void} pvoid_cb 
 * @param {Date} date 
 */
function covid_api_report_cases(date, pvoid_cb){
    let arr = date.toLocaleDateString().split('/');
    axios.get(`https://covid19-brazil-api.now.sh/api/report/v1/brazil/${arr[2].toString().padStart(2, '0') + (arr[1] + 1).toString().padStart(2, '0') + arr[0]}`).then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
}

/**
 * 
 * @param {(data: any)=>void} pvoid_cb 
 */
function covid_api_available_reports(pvoid_cb){
    axios.get('https://brasil.io/api/dataset/covid19/boletim/data/?format=json').then((response) => {
        let covid_data = [];
        for (let idx = 0; idx < response.data.results.length; idx++){
            covid_data.push({ State: response.data.results[idx].state, Url: response.data.results[idx].url });
        }
        pvoid_cb(covid_data);
    }).catch((err) => { pvoid_cb(null); });
}

module.exports = {
    covid_api_report_all_states: covid_api_report_all_states,
    covid_api_report_state: covid_api_report_state,
    covid_api_report_cases: covid_api_report_cases,
    covid_api_available_reports: covid_api_available_reports
}