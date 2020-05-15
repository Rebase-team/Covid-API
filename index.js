const express = require('express');
const Waf = require('mini-waf/wafbase');
const wafrules = require('mini-waf/wafrules');
const waffilter = require('mini-waf/waffilter');
const colors = require('colors');

const queries = require('./queries');
const tools = require('./tools');
const tracker = require('./tracker');
const covid = require('./covid');

const app = express();

app.use(Waf.WafSecurityPolicy());


const API_CODES = {
  UUID_STORED:                              1,
  UUID_INVALID:                             2,
  UUID_ALREADY_STORED:                      3,
  UUID_FAILED:                              4,
  VOTE_INVALID:                             5,
  TOO_MANY_VOTES:                           6,
  ERROR_WHEN_VOTING:                        7,
  VOTE_SUBMITED:                            8,
  AVERAGE_SUBMITED_SUCCESS:                 9,
  AVERAGE_MAX_AND_MIN_AGLOMERATION_SUCCESS: 10,
}

var geo_round_robin = 0;
var geo_reserve_keys = [
  'jyNJ0AXqO8HzGms8QuWpwij8IK6ak7YI',
  'yKDN6MYgXuHDKoDAAqgS5RPHIiNwrzLZ',
  'lfEB4rDhs08pNsqbd5Hu3SNUwSzdj7fA',
  'CbZyPiHRBrlOCSTgZswXVnJxTmuaPHln'
];
//DONE
app.put('/covid/uuid/:guid', function (req, res) {
  //Cadastra o dispositivo.
  if (!tools.is_uuid(req.params.guid)) {
    tools.dump(res, API_CODES.UUID_INVALID, {});
  }
  else {
    queries.sqlite_serialize(function () {
      queries.sqlite_check_uuid(req.params.guid, function (bexists) {
        if (!bexists) {
          queries.sqlite_add_uuid(req.params.guid, function (bcreated) {
            tools.dump(res, (bcreated ? API_CODES.UUID_STORED : API_CODES.UUID_FAILED), null);
          });
        }
        else {
          tools.dump(res, API_CODES.UUID_ALREADY_STORED, null);
        }
      });
    });
  }
});
//DONE
app.post('/covid/submit/:guid/:number', function (req, res) {
  //Realiza a votação
  if (!tools.is_uuid(req.params.guid)) {
    tools.dump(res, API_CODES.UUID_INVALID, {});
  }
  else if (!waffilter.SafetyFilter.FilterVariable(req.params.number, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_INT)) {
    tools.dump(res, API_CODES.VOTE_INVALID, {});
  }
  else {
    let voteNum = Number(req.params.number);
    if ((voteNum < 1) || (voteNum > 4)) {
      tools.dump(res, API_CODES.VOTE_INVALID, {});
    }
    else {
      queries.sqlite_serialize(function () {
        queries.sqlite_check_uuid(req.params.guid, function (bexists) {
          if (bexists) {
            queries.sqlite_get_last_vote_date(req.params.guid, function (last_vote) {
              if (last_vote != null) {
                let access_date = new Date(last_vote);
                if ((new Date()).getTime() - access_date.getTime() >= 3600000) {
                  //Decorrida uma hora, pode votar.
                  queries.sqlite_submit_vote(req.params.guid, voteNum, function (bsubmited) {
                    tools.dump(res, (bsubmited ? API_CODES.VOTE_SUBMITED : API_CODES.ERROR_WHEN_VOTING), null);
                  });
                }
                else {
                  //Não decorreu uma hora, não pode votar novamente.
                  tools.dump(res, API_CODES.TOO_MANY_VOTES, null);
                }
              }
              else {
                queries.sqlite_submit_vote(req.params.guid, voteNum, function (bsubmited) {
                  tools.dump(res, (bsubmited ? API_CODES.VOTE_SUBMITED : API_CODES.ERROR_WHEN_VOTING), null);
                });
              }
            });
          }
          else {
            tools.dump(res, API_CODES.UUID_INVALID, null);
          }
        });
      });
    }
  }
});
//DONE
app.get('/covid/average/:guid/:day', function (req, res) {
  //Retorna a média de votos do dia fornecido (dia da semana).
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uid_exist) => {
      if(uid_exist){
        queries.sqlite_read_daily_stats(req.params.day, (statistic) => {
          tools.dump(res, API_CODES.AVERAGE_SUBMITED_SUCCESS, statistic.ScheduleStats )
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, null);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, null);
  }
});
//
app.get('/covid/today/:guid/garanhuns', function (req, res){
  //Retorna a média de votos do dia atual.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uid_exist) => {
      if (uid_exist){
        queries.sqlite_read_current_stats((stats)=>{
          tools.dump(res, API_CODES.AVERAGE_MAX_AND_MIN_AGLOMERATION_SUCCESS, stats);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, null);
      }
    })
  }
});
//
app.get('/covid/stats/:guid', function (req, res) {
  //Retorna os horários de pico.
  if(tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uid_exist) => {
      if (uid_exist) {
        //Queries
      } 
      else {
        tools.dump(res, API_CODES.UUID_INVALID, null)
      }
    })
  }
});
//
app.put('/covid/track/:guid/:lat/:lng', function (req, res) {
  //Atualiza as coordenadas do dispositivo no nosso banco de dados.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uid_exist) => {
      if (uid_exist){
        //Queries

      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, null)
      }
    })
  }
});
//
app.get('/covid/track/:guid/position', function(req, res){
  //Retorna a posição, cep, rua, bairro, cidade, estado referente ao uuid do dispositivo rastreado.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uid_exist) => {
      if (uid_exist){
        //Queries

      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, null)
      }
    })
  }
});

app.listen(14400, function () {
  console.log('Covid App running on port 14400.');
});