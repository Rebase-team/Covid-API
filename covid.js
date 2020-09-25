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
    axios.get(`https://covid19-brazil-api.now.sh/api/report/v1/brazil/${date}`).then((resp) => { pvoid_cb(resp.data); }).catch((err) => { pvoid_cb(null); });
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

function covid_api_garanhuns_report(postToken, pvoid_cb){
    (async () => {
        let REGEXPR_FIND_POST_JSON = new RegExp(/(?:\<script\s*[\w\s\"\=\/]*>window\._sharedData\s?=\s?).+<\/script>/igm);
        let REGEXPR_SANITIZE_START_JSON = new RegExp(/(?:^\<script\s*[\w\s\"\=\/]*>window\._sharedData\s?=\s)/igm);
        let REGEXPR_SANITIZE_END_JSON = new RegExp(/;<\/script>/igm);
        let REGEXPR_FIND_CASES = new RegExp(/(?:confirmados\s*\d{3,5}\s*casos)/igm);
        let REGEXPR_FIND_DEATHS = new RegExp(/(?:total\s*\d{2,5}\s*pessoas vieram)/igm);
        let REGEXPR_FIND_SUSPECTS = new RegExp(/(?:\d{2,5}\s*pessoas\s*que\s*foram\s*confirmadas)/igm);
        let REGEXPR_FIND_RECOVERED = new RegExp(/(?:\d{2,5}\s*estão\s*recuperad(a|o)s)/igm);
        
        function get_garanhuns_covid_statistics(postToken){
            return new Promise(async (resolve, _reject) => {
                try {
                    let pageData = await axios.get(`https://instagram.com/p/${postToken}/`);
                    if (pageData.data) {
                        let PostJsonArr = REGEXPR_FIND_POST_JSON.exec(pageData.data);
                        if (PostJsonArr.length == 0){
                            resolve({ status: false, data: null });
                        } else {
                            let postText = JSON.parse(String(PostJsonArr[0]).replace(REGEXPR_SANITIZE_START_JSON, '').replace(REGEXPR_SANITIZE_END_JSON, '')).entry_data.PostPage[0].graphql.shortcode_media.edge_media_to_caption.edges[0].node.text;
                            let responseData = {
                                'cases': String(REGEXPR_FIND_CASES.exec(postText)[0]).replace(new RegExp(/[^0-9]/igm), ''),
                                'deaths': String(REGEXPR_FIND_DEATHS.exec(postText)[0]).replace(new RegExp(/[^0-9]/igm), ''),
                                'suspects': String(REGEXPR_FIND_SUSPECTS.exec(postText)[0]).replace(new RegExp(/[^0-9]/igm), ''),
                                'recovered': String(REGEXPR_FIND_RECOVERED.exec(postText)[0]).replace(new RegExp(/[^0-9]/igm), ''),
                            };
                            resolve({ status: true, data: responseData});
                        }
                    }
                    else {
                        resolve({ status: false, data: null });
                    }
                } catch (e) {
                    resolve({ status: false, data: null });
                }
            });
        }

        pvoid_cb(await get_garanhuns_covid_statistics(postToken));
    })();
}

module.exports = {
    covid_api_report_all_states: covid_api_report_all_states,
    covid_api_report_state: covid_api_report_state,
    covid_api_report_cases: covid_api_report_cases,
    covid_api_available_reports: covid_api_available_reports,
    covid_api_garanhuns_report: covid_api_garanhuns_report
}