const express = require('express');
const Waf = require('mini-waf/wafbase');
const waffilter = require('mini-waf/waffilter');
const colors = require('colors');
const uaparser = require('ua-parser-js');

const queries = require('./queries');
const tools = require('./tools');
const tracker = require('./tracker');
const covid = require('./covid');

const app = express();

app.use(Waf.WafSecurityPolicy());

/* CODIGOS DE ERROS */ 
const API_CODES = {
  //UUID ARMAZENADA
  UUID_STORED:                              1,

  //UUID INVALIDA
  UUID_INVALID:                             2,
  
  //UUID JÁ ARMAZENADO
  UUID_ALREADY_STORED:                      3,
  
  //UUID FALHADO
  UUID_FAILED:                              4,
  
  //VOTO INVALIDO
  VOTE_INVALID:                             5,
  
  //MUITOS VOTOS
  TOO_MANY_VOTES:                           6,
  
  //ERRO ENQUANTO ESTOU VOTANDO
  ERROR_WHEN_VOTING:                        7,
  
  //VOTO SUBMITADO
  VOTE_SUBMITED:                            8,
  
  //MEDIA ENVIADA COM SUCESSO
  AVERAGE_SUBMITED_SUCCESS:                 9,
  
  //MEDIA MAXIMA E MINIMA ENVIADA COM SUCESSO
  AVERAGE_MAX_AND_MIN_AGLOMERATION_SUCCESS: 10,
  
  //ERRO EM ATUALIZAR A LOCALIZAÇÃO DO USUARIO
  ERROR_WHEN_UPDATE_USER_LOCATION:          11,
  
  //ERRO EM RETORNAR A LOCALIZAÇÃO
  ERROR_WHEN_RETURN_USER_LOCATION:          12,
  
  //PARAMETRO IS_TRACKING INVALIDO
  IS_TRACKING_PARAMS_INVALID:               13,
  
  //DISPOSITIVO SENDO RASTREADO COM SUCESSO
  SUCCESSFULLY_TRACKED:                     14,
  
  //LOCALIZAÇÃO DO USER RETORNADA COM SUCESSO
  USER_LOCATION_SUCCESS_RETURNED:           15,

  //DADOS DA COVID DE TODOS OS ESTADOS RETORNADOS COM SUCESSO.
  SHOWING_ALL_STATES_COVID_DATA:            16,

  //RETORNANDO DADOS DA COVID DE UNIDADE FEDERATIVA
  SHOWING_STATE_COVID_DATA:                 17,

  //RETORNANDO DADOS DA COVID NO BRASIL
  SHOWING_BRAZIL_COVID_DATA:                18,

  //DATA FORNECIDA É INVÁLIDA.
  INVALID_DATE_FORMAT:                      19,

  //RETORNANDO FONTES OFICIAIS DE DADOS.
  SHOWING_OFFICIAL_COVID_SOURCES:           20,

  //RETORNA OS DADOS DA COVID EM GARANHUNS.
  SHOWING_GARANHUNS_COVID_DATA:             21

}

/* ERRO 404, ROTA NÃO ENCONTRADA! */
const API_NOT_FOUND_ROUTE = function(req, res){
  res.status(404);
  tools.dump(res, API_CODES.UUID_INVALID, { message:'Invalid request, please see our docs page: https://documenter.getpostman.com/view/11185707/SzmmVvBZ?version=latest.' });
  let uagent = uaparser(req.headers["user-agent"]);
  console.log(`[${(new Date()).toLocaleTimeString().cyan}] ` + `Error 404! OS: ${String(uagent.os.name).green} | `.yellow + `Arch: ${String(uagent.cpu.architecture).green} | `.yellow + `Device: ${String(uagent.device.type).green} | `.yellow + `IP Address: ${String(req.ip).red} `.yellow + `Url: ${String(req.url).cyan}`.yellow);
}

/* CHAVES PARA USO DA API DE LOCALIZAÇÃO */
var geo_round_robin = 0;
var geo_reserve_keys = [
  'jyNJ0AXqO8HzGms8QuWpwij8IK6ak7YI',
  'yKDN6MYgXuHDKoDAAqgS5RPHIiNwrzLZ',
  'lfEB4rDhs08pNsqbd5Hu3SNUwSzdj7fA',
  'CbZyPiHRBrlOCSTgZswXVnJxTmuaPHln'
];

/* DADOS ATUAIS DE COVID-19 EM GARANHUNS */

var guns_covid_id = 0;

var guns_covid_data = {
  "cases": 0,
  "recovered": 0,
  "suspects": 0,
  "deaths": 0
};

//==============================================================================
/* ROTAS */
//==============================================================================

// Rota que realiza o cadastramento do usuário
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.put('/covid/uuid/:guid', function (req, res) {
  //Cadastra o dispositivo.
  if (!tools.is_uuid(req.params.guid)) {
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
  else {
    queries.sqlite_serialize(function () {
      queries.sqlite_check_uuid(req.params.guid, function (bexists) {
        if (!bexists) {
          queries.sqlite_add_uuid(req.params.guid, function (bcreated) {
            tools.dump(res, (bcreated ? API_CODES.UUID_STORED : API_CODES.UUID_FAILED), {});
            if (!bcreated){
              tools.debug_bot_send(API_CODES.UUID_FAILED, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
            }
          });
        }
        else {
          tools.dump(res, API_CODES.UUID_ALREADY_STORED, {});
          tools.debug_bot_send(API_CODES.UUID_ALREADY_STORED, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
        }
      });
    });
  }
});

// Rota que realiza a votação
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
    :number
*/
app.post('/covid/submit/:guid/:number', function (req, res) {
  //Realiza a votação
  if (!tools.is_uuid(req.params.guid)) {
    tools.dump(res, API_CODES.UUID_INVALID, {});
  }
  else if (!waffilter.SafetyFilter.FilterVariable(req.params.number, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_INT)) {
    tools.dump(res, API_CODES.VOTE_INVALID, {});
    tools.debug_bot_send(API_CODES.VOTE_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
  else {
    let voteNum = Number(req.params.number);
    if ((voteNum < 1) || (voteNum > 4)) {
      tools.dump(res, API_CODES.VOTE_INVALID, {});
      tools.debug_bot_send(API_CODES.VOTE_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
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
                    if (!bsubmited){
                      tools.debug_bot_send(API_CODES.ERROR_WHEN_VOTING, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
                    }
                  });
                }
                else {
                  //Não decorreu uma hora, não pode votar novamente.
                  tools.dump(res, API_CODES.TOO_MANY_VOTES, {});
                  tools.debug_bot_send(API_CODES.TOO_MANY_VOTES, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
                }
              }
              else {
                queries.sqlite_submit_vote(req.params.guid, voteNum, function (bsubmited) {
                  tools.dump(res, (bsubmited ? API_CODES.VOTE_SUBMITED : API_CODES.ERROR_WHEN_VOTING), null);
                  if (!bsubmited){
                    tools.debug_bot_send(API_CODES.ERROR_WHEN_VOTING, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
                  }
                });
              }
            });
          }
          else {
            tools.dump(res, API_CODES.UUID_INVALID, {});
            tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
          }
        });
      });
    }
  }
});

// Rota que realiza a média dos votos
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
    :day -> dia que eu quero obter am média
*/
app.get('/covid/average/:guid/:day', function (req, res) {
  //Retorna a média de votos do dia fornecido (dia da semana).
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if(uuid_exist){
        queries.sqlite_read_daily_stats(req.params.day, (statistic) => {
          tools.dump(res, API_CODES.AVERAGE_SUBMITED_SUCCESS, statistic.ScheduleStats);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que realiza a média dos votos no dia atual e horários de pico e minimo
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.get('/covid/today/:guid/garanhuns', function (req, res){
  //Retorna a média de votos do dia atual e horários de pico e mínimo.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        queries.sqlite_read_current_stats((stats)=>{
          tools.dump(res, API_CODES.AVERAGE_MAX_AND_MIN_AGLOMERATION_SUCCESS, stats);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que atualiza a posição do usuário com lat e lgn

/* PARÂMETROS ->
    :guid -> número de indentificação do celular
    :lat -> latidude
    :is_tracking(0 (false) ou 1 (verdadeiro)) -> está ou não rastreando
*/
app.put('/covid/track/:guid/:lat/:lng/:is_tracking', function (req, res) {
  //Atualiza as coordenadas do dispositivo no nosso banco de dados.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        //Queries
        if (waffilter.SafetyFilter.FilterVariable(req.params.lat, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_FLOAT) && 
            waffilter.SafetyFilter.FilterVariable(req.params.lng, waffilter.SafetyFilterType.FILTER_VALIDATE_NUMBER_FLOAT)) {
          if (waffilter.SafetyFilter.FilterVariable(Boolean(req.params.is_tracking), waffilter.SafetyFilterType.FILTER_VALIDATE_BOOLEAN)){
            queries.sqlite_submit_coords(req.params.guid, req.params.lng, req.params.lat, req.params.is_tracking, function(bsubmited) {
              if (bsubmited){
                tools.dump(res, API_CODES.SUCCESSFULLY_TRACKED, {});
              }
              else{
                tools.dump(res, API_CODES.ERROR_WHEN_UPDATE_USER_LOCATION, {});
                tools.debug_bot_send(API_CODES.ERROR_WHEN_UPDATE_USER_LOCATION, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
              }
            });
          }
          else{
            tools.dump(res, API_CODES.IS_TRACKING_PARAMS_INVALID, {});
            tools.debug_bot_send(API_CODES.IS_TRACKING_PARAMS_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
          }
        }
        else{
          tools.dump(res, API_CODES.ERROR_WHEN_UPDATE_USER_LOCATION, {});
          tools.debug_bot_send(API_CODES.ERROR_WHEN_UPDATE_USER_LOCATION, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
        }
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que atualiza a posição do usuário
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.get('/covid/track/:guid/position', function(req, res){
  //Retorna a posição, cep, rua, bairro, cidade, estado referente ao uuid do dispositivo rastreado.
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        //Queries
        queries.sqlite_retrieve_coords(req.params.guid, (coords) => {
          if (coords) {
            if (coords.is_tracking == true){
              tracker.track_reverse_address(coords.lat, coords.lon, geo_reserve_keys[geo_round_robin++ % geo_reserve_keys.length], function(data){
                tools.dump(res, API_CODES.USER_LOCATION_SUCCESS_RETURNED, { Data: data, is_tracking: Boolean(coords.is_tracking) });
              });
            }
            else{
              tools.dump(res, API_CODES.USER_LOCATION_SUCCESS_RETURNED, coords);
            }
          }
          else {
            tools.dump(res, API_CODES.ERROR_WHEN_RETURN_USER_LOCATION, {});
            tools.debug_bot_send(API_CODES.ERROR_WHEN_RETURN_USER_LOCATION, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
          }
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {})
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que mostra os dados de covid-19 de todos os estados brasileiros.
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.get('/covid/report/:guid/state/all', function(req, res){
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        covid.covid_api_report_all_states((data) => {
          tools.dump(res, API_CODES.SHOWING_ALL_STATES_COVID_DATA, data);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que mostra os dados de covid-19 de uma unidade federativa específica.
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
    :uf -> unidade federativa
*/
app.get('/covid/report/:guid/state/:uf', function(req, res){
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        covid.covid_api_report_state(req.params.uf, (data) => {
          tools.dump(res, API_CODES.SHOWING_STATE_COVID_DATA, data);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que mostra os dados de covid-19 de uma unidade federativa específica.
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
    :date -> data no formato DD-MM-YYYY ou um timestamp em milissegundos.
*/
app.get('/covid/report/:guid/brazil/:date', function(req, res){
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        if (String(req.params.date).length == 8){
          covid.covid_api_report_cases(req.params.date, (data) => {
            tools.dump(res, API_CODES.SHOWING_BRAZIL_COVID_DATA, data);
          });
        }
        else{
          tools.dump(res, API_CODES.INVALID_DATE_FORMAT, {});
          tools.debug_bot_send(API_CODES.INVALID_DATE_FORMAT, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
        }
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que mostra os dados de covid-19 das entidades oficiais dos governos estaduais.
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.get('/covid/report/:guid/official', function(req, res){
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        covid.covid_api_available_reports((data) => {
          tools.dump(res, API_CODES.SHOWING_OFFICIAL_COVID_SOURCES, data);
        });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

// Rota que mostra os dados de covid-19 no município de garanhuns.
/* PARÂMETROS ->
    :guid -> número de indentificação do celular
*/
app.get('/covid/report/:guid/state/pe/garanhuns', function(req, res){
  if (tools.is_uuid(req.params.guid)){
    queries.sqlite_check_uuid(req.params.guid, (uuid_exist) => {
      if (uuid_exist){
        tools.dump(res, API_CODES.SHOWING_GARANHUNS_COVID_DATA, {
          "uid": guns_covid_id,
          "cases": guns_covid_data.cases,
          "recovered": guns_covid_data.recovered,
          "suspects": guns_covid_data.suspects,
          "deaths": guns_covid_data.deaths,
          "datetime": (new Date()).toISOString()
      });
      }
      else{
        tools.dump(res, API_CODES.UUID_INVALID, {});
        tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
      }
    });
  }
  else{
    tools.dump(res, API_CODES.UUID_INVALID, {});
    tools.debug_bot_send(API_CODES.UUID_INVALID, req, tools.DEBUG_CHANNELS.MAIN_CHANNEL);
  }
});

//Rota especial, não catalogada na documentação responsável por atualizar os dados do aplicativo.
/* PARÂMETROS ->
    :postToken -> token da postagem, presente na URL da postagem da prefeitura no instagram
*/
app.get('/covid/report/state/pe/garanhuns/instagram/:postToken', function(req, res){
  if (req.params.postToken){
    covid.covid_api_garanhuns_report(req.params.postToken, (response) => {
      if (!response.status){
        tools.dump(res, 0, {text: 'Alguma coisa deu errado, não consegui obter os dados da postagem da prefeitura. Verifique se o token da postagem é válido ou se o padrão do post mudou.'});
      } else {
        guns_covid_data = response.data;
        guns_covid_id++;
        tools.dump(res, 0, {text: 'Obrigado por atualizar meus dados! Faça isso novamente amanhã. Ocorreu tudo certo, as informações já foram atualizadas no aplicativo também.', data: guns_covid_data});
      }
    })
  } else{
    tools.dump(res, 0, {text: 'Forneça o token da postagem da prefeitura de Garanhuns. Ela estará presente na URL da postagem.'});
  }
});

app.get('*', API_NOT_FOUND_ROUTE);
app.post('*', API_NOT_FOUND_ROUTE);
app.head('*', API_NOT_FOUND_ROUTE);
app.put('*', API_NOT_FOUND_ROUTE);
app.purge('*', API_NOT_FOUND_ROUTE);
app.patch('*', API_NOT_FOUND_ROUTE);
app.delete('*', API_NOT_FOUND_ROUTE);
app.copy('*', API_NOT_FOUND_ROUTE);
app.connect('*', API_NOT_FOUND_ROUTE);
app.propfind('*', API_NOT_FOUND_ROUTE);

app.listen(14400, function () {
  console.log(`[${(new Date()).toLocaleTimeString().cyan}]` + ` GitHub: https://github.com/Rebase-team/Covid-API | Covid API running on port ${'14400'.red}.`.yellow);
  for (let idx = 0; idx < app._router.stack.length; idx++){
    if (app._router.stack[idx].route) {
      if (app._router.stack[idx].route.path) {
        console.log(`[${app._router.stack[idx].route.stack[0].method.toUpperCase().red}] -> ` + String(app._router.stack[idx].route.path).cyan);
      }
    }
  }
});

process.on('uncaughtException', (err) => {});
