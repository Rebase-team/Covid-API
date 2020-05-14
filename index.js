const express = require('express');
const Waf = require('mini-waf/wafbase');
const wafrules = require('mini-waf/wafrules');
const waffilter = require('mini-waf/waffilter');
const colors = require('colors');

const queries = require('./queries');
const tools = require('./tools');

const app = express();

app.use(Waf.WafMiddleware(wafrules.DefaultSettings));
app.use(Waf.WafSecurityPolicy());


const API_CODES = {
    UUID_STORED:            1,
    UUID_INVALID:           2,
    UUID_ALREADY_STORED:    3,
    UUID_FAILED:            4,
    VOTE_INVALID:           5
}

//api covid
//https://covid19-brazil-api.now.sh/api/report/v1/brazil/uf/pe

/* queries.sqlite_add_uuid('18587efa-84d3-4db1-b1c2-fa65d41e974a', function(){
    console.log(arguments);
});

queries.sqlite_check_uuid('18587efa-84d3-4db1-b1c2-fa65d41e974a', function(){
    console.log(arguments);
});

queries.sqlite_get_last_access('18587efa-84d3-4db1-b1c2-fa65d41e974a', function(){
    console.log(arguments);
}) */

/* queries.sqlite_submit_vote('18587efa-84d3-4db1-b1c2-fa65d41e974a', 4, function(){
    console.log(arguments);
}); */

/* queries.sqlite_update_last_access('18587efa-84d3-4db1-b1c2-fa65d41e974a', function(){
    console.log(arguments);
}); */

//queries.sqlite_read_daily_stats(2, function(){
//    console.log(JSON.stringify(arguments) + "\n");
//});

//queries.sqlite_read_current_stats(function(){
//    console.log(JSON.stringify(arguments));
//});

queries.sqlite_submit_coords('18587efa-84d3-4db1-b1c2-fa65d41e974a', -53.656464, 39.56645645, true, function(bcreated){
    console.log(bcreated)
})

app.get('/covid/uuid/:guid', function(req, res){
    //Cadastra o dispositivo.
    if (!tools.is_uuid(req.params.guid)){
        tools.dump(res, API_CODES.UUID_INVALID, {});
    }
    else{
        
    }
});

app.post('/covid/vote/:guid/:number', function(req, res){
    //Realiza a votação
    if (!tools.is_uuid(req.params.guid)){
        tools.dump(res, API_CODES.UUID_INVALID, {});
    }
    else if (!waffilter.SafetyFilter.FilterVariable(req.params.number, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_INT)){
        tools.dump(res, API_CODES.VOTE_INVALID, {});
    }
    else{
        let voteNum = Number(req.params.number);
        if ((voteNum < 1) || (voteNum > 4)){
            tools.dump(res, API_CODES.VOTE_INVALID, {});
        }
        else{
            
        }
    }
});

app.get('/covid/average/:day/:guid', function(req, res){
    //Retorna a média de votos da última hora.
    res.json({teste: 2}).end();
});

app.get('/covid/stats/:guid', function(req, res){
    //Retorna os horários de pico.
    res.json({teste: 2}).end();
});


app.listen(14400, function(){
    console.log('Covid App running on port 14400.');
});