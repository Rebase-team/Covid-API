const express = require('express');
const Waf = require('mini-waf/wafbase');
const wafrules = require('mini-waf/wafrules');
const waffilter = require('mini-waf/waffilter');
const sqlite3 = require('sqlite3').verbose();
const colors = require('colors');

const app = express();
const db = new sqlite3.Database('covid.db');

app.use(Waf.WafMiddleware(wafrules.DefaultSettings));
app.use(Waf.WafSecurityPolicy());


const API_CODES = {
    UUID_STORED:            1,
    UUID_INVALID:           2,
    UUID_ALREADY_STORED:    3,
    UUID_FAILED:            4,
    VOTE_INVALID:           5
}

function dump(res, code, params){
    if (!res.finished){
        res.json({ response: code, parameters: params }).end();
        res.finished = true;
    }
}

function isUuid(uuid){
    return (new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)).test(uuid);
}

app.get('/uuid/:guid', function(req, res){
    //Cadastra o dispositivo.
    if (!isUuid(req.params.guid)){
        dump(res, API_CODES.UUID_INVALID, {});
    }
    else{
        db.serialize(function () {
            db.each(`SELECT COUNT(*) AS AccessCount FROM access_guids WHERE guid=? LIMIT 1;`, [req.params.guid], function (err, row) {
                console.log(row)
                if (row.AccessCount > 0) {
                    dump(res, API_CODES.UUID_ALREADY_STORED, {});
                }
                else {
                    let query = db.prepare(`INSERT INTO access_guids (guid, last_access) VALUES (?, DATETIME('now', 'localtime'));`).run(req.params.guid);
                    query.finalize((err) => {
                        if (typeof err != "undefined") {
                            dump(res, API_CODES.UUID_FAILED, { uuid: req.params.guid });
                        }
                        else{
                            dump(res, API_CODES.UUID_STORED, { uuid: req.params.guid });
                        }
                    });
                }
            });
        });
    }
});

app.post('/vote/:guid/:number', function(req, res){
    //Realiza a votação
    if (!isUuid(req.params.guid)){
        dump(res, API_CODES.UUID_INVALID, {});
    }
    else if (!waffilter.SafetyFilter.FilterVariable(req.params.number, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_INT)){
        dump(res, API_CODES.VOTE_INVALID, {});
    }
    else{
        console.log('tudo ok')
        res.Drop();
    }
});

app.get('/average/:day/:guid', function(req, res){
    //Retorna a média de votos da última hora.
    res.json({teste: 2}).end();
});

app.get('/stats/:guid', function(req, res){
    //Retorna os horários de pico.
    res.json({teste: 2}).end();
});


app.listen(14400, function(){
    console.log('Covid App running on port 14400.')
});