const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('covid.db');

//=========================================================================================================================
//Funções referentes à tabela access_guids e manipulação de uuids, acesso, etc.
//=========================================================================================================================

/**
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {(bexists: boolean)=>void} pvoid_cb Callback que recebe um parâmetro booleano indicando se existe ou não o uuid.
 */
function sqlite_check_uuid(uuid, pvoid_cb) {
  db.serialize(function () {
    db.each(`SELECT COUNT(*) AS AccessCount FROM access_guids WHERE guid=? LIMIT 1;`, [uuid], function (err, row) {
      //pvoid_cb(bexists)
      pvoid_cb(row.AccessCount > 0);
    });
  });
}

/**
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {function} pvoid_cb 
 */
function sqlite_add_uuid(uuid, pvoid_cb) {
  let query = db.prepare(`INSERT INTO access_guids (guid, last_access) VALUES (?, DATETIME('now', 'localtime'));`).run([uuid]);
  query.finalize((err) => {
    //pvoid_cb(bcreation)
    pvoid_cb(!(typeof err != "undefined"));
  });
}

/**
 * 
 * @param {string} uuid 
 * @param {function} pvoid_cb 
 */
function sqlite_get_last_access(uuid, pvoid_cb) {
  db.serialize(function () {
    db.each(`SELECT last_access FROM access_guids WHERE guid = ? LIMIT 1;`, [uuid], function (err, row) {
      //pvoid_cb(last_access_date)
      pvoid_cb((typeof row.last_access != "undefined" ? row.last_access : null));
    });
  });
}

/**
 * 
 * @param {string} uuid 
 * @param {function} pvoid_cb 
 */
function sqlite_update_last_access(uuid, pvoid_cb) {
  db.serialize(function () {
    let query = db.prepare(`UPDATE access_guids SET last_access = DATETIME('now', 'localtime') WHERE guid = ?`).run([uuid]);
    query.finalize((err) => {
      //pvoid_cb(bupdated)
      pvoid_cb(!(typeof err != "undefined"));
    });
  });
}

/**
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {function} pvoid_cb 
 */
function sqlite_get_access_id(uuid, pvoid_cb) {
  db.serialize(function () {
    db.each(`SELECT id FROM access_guids WHERE guid = ? LIMIT 1;`, [uuid], function (err, row) {
      //pvoid_cb(access_id)
      pvoid_cb((typeof row.id != "undefined" ? row.id : null));
    });
  });
}

/**
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {function} pvoid_cb 
 */
function sqlite_get_last_vote_date(uuid, pvoid_cb) {
  db.get(`SELECT DATETIME(COALESCE(created_at, DATETIME('now', 'localtime'))) AS LastVoteDate FROM users_votes WHERE users_votes.access_guid_id = (SELECT id FROM access_guids WHERE access_guids.guid = ? LIMIT 1) ORDER BY users_votes.created_at DESC LIMIT 1;`, [uuid], function (err, row) {
    if (typeof row != "undefined") {
      //pvoid_cb(last_vote_date)
      pvoid_cb(row.LastVoteDate);
    }
    else {
      //pvoid_cb(last_vote_date)
      pvoid_cb(null);
    }
  });
}

//=========================================================================================================================
//Funções referentes à submissão de nível de aglomeração.
//=========================================================================================================================

/**Realiza a submissão de uma votação.
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {number} numVote Voto ou nível de aglomeração (valor de 1 a 4);
 * @param {(bvoted: boolean)=>void} pvoid_cb Callback que recebe um parâmetro bvoted indicando se o voto foi submetido ou não.
 */
function sqlite_submit_vote(uuid, numVote, pvoid_cb) {
  db.serialize(function () {
    sqlite_get_access_id(uuid, function (access_id) {
      let query = db.prepare(`INSERT INTO users_votes (vote_number, created_at, week_day, access_guid_id) VALUES (?, DATETIME('now', 'localtime'), ?, ?);`).run([
        numVote,
        (new Date()).getDay(),
        access_id
      ]);
      query.finalize((err) => {
        //pvoid_cb(bvoted)
        pvoid_cb(!(typeof err != "undefined"));
      });
    });
  });
}

/**Retorna os dados diários das votações nos intervalos.
 * 
 * @param {number} day Dia da semana de 0 a 6.
 * @param {(stats: {ScheduleStats:[{ Start: string, End: string, TotalVote: number, NumberOfVotes: number, Measure: number }]})=>void} pvoid_cb Callback que retorna um objeto contendo as estatísticas diárias divididas em intervalos.
 */
function sqlite_read_daily_stats(day, pvoid_cb) {
  db.serialize(function () {
    let Stats = {
      ScheduleStats: [
        { Start: '00:00:00', End: '01:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '02:00:00', End: '03:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '04:00:00', End: '05:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '06:00:00', End: '07:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '08:00:00', End: '09:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '10:00:00', End: '11:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '12:00:00', End: '13:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '14:00:00', End: '15:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '16:00:00', End: '17:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '18:00:00', End: '19:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '20:00:00', End: '21:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
        { Start: '22:00:00', End: '23:59:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 }
      ]
    }
    for (let idx = 0; idx < Stats.ScheduleStats.length; idx++) {
      db.get(`SELECT COALESCE(SUM(vote_number), 0) AS TotalVote, COALESCE(COUNT(*), 0) AS NumberOfVotes FROM users_votes WHERE (TIME(created_at) BETWEEN ? AND ?) AND week_day = ?;`, [Stats.ScheduleStats[idx].Start, Stats.ScheduleStats[idx].End, day], function (err, row) {
        Stats.ScheduleStats[idx].TotalVote = row.TotalVote;
        Stats.ScheduleStats[idx].NumberOfVotes = row.NumberOfVotes;
        Stats.ScheduleStats[idx].Measure = (row.NumberOfVotes != 0 ? row.TotalVote / row.NumberOfVotes : 0);
        if (idx == Stats.ScheduleStats.length - 1) {
          //pvoid_cb(stats_obj)
          pvoid_cb(Stats);
        }
      });
    }
  });
}

/**Retorna do banco de dados o maior horário de aglomerações e o menor horário.
 * 
 * @param {(stats_object: {TotalVote: 0, NumberOfVotes: 0, BiggerAgglomeration: { Start, End, TotalVote, NumberOfVotes, Measure }, SmallerAgglomeration: { Start, End, TotalVote, NumberOfVotes, Measure } })=>void} pvoid_cb Equivalente à pvoid_cb(stats_object) onde stats_object é um objeto com a seguinte estrutura:
 * 
 */
function sqlite_read_current_stats(pvoid_cb) {
  db.serialize(function () {
    let Stats = {
      TotalVote: 0,
      NumberOfVotes: 0,
      BiggerAgglomeration: { Start: '00:00:00', End: '00:00:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
      SmallerAgglomeration: { Start: '00:00:00', End: '00:00:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 }
    }
    let BufferStats = {
      ScheduleStats: [
        { Start: '00:00:00', End: '01:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '02:00:00', End: '03:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '04:00:00', End: '05:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '06:00:00', End: '07:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '08:00:00', End: '09:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '10:00:00', End: '11:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '12:00:00', End: '13:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '14:00:00', End: '15:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '16:00:00', End: '17:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '18:00:00', End: '19:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '20:00:00', End: '21:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER },
        { Start: '22:00:00', End: '23:59:00', TotalVote: Number.MAX_SAFE_INTEGER, NumberOfVotes: Number.MAX_SAFE_INTEGER, Measure: Number.MAX_SAFE_INTEGER }
      ]
    }
    for (let idx = 0; idx < BufferStats.ScheduleStats.length; idx++) {
      db.each(`SELECT COALESCE(SUM(vote_number), 0) AS TotalVote, COALESCE(COUNT(*), 0) AS NumberOfVotes FROM users_votes WHERE DATE(created_at) = DATE('now', 'localtime') AND TIME(created_at) BETWEEN ? AND ?`, [BufferStats.ScheduleStats[idx].Start, BufferStats.ScheduleStats[idx].End], function (err, row) {
        BufferStats.ScheduleStats[idx].TotalVote = row.TotalVote;
        BufferStats.ScheduleStats[idx].NumberOfVotes = row.NumberOfVotes;
        BufferStats.ScheduleStats[idx].Measure = (row.NumberOfVotes != 0 ? row.TotalVote / row.NumberOfVotes : 0);
        if (BufferStats.ScheduleStats[idx].Measure < Stats.SmallerAgglomeration.Measure) {
          Stats.SmallerAgglomeration = BufferStats.ScheduleStats[idx];
        }
        if (BufferStats.ScheduleStats[idx].Measure > Stats.BiggerAgglomeration.Measure) {
          Stats.BiggerAgglomeration = BufferStats.ScheduleStats[idx];
        }
      });
    }
    db.get(`SELECT COALESCE(SUM(vote_number), 0) AS TotalVote, COALESCE(COUNT(*), 0) AS NumberOfVotes FROM users_votes WHERE DATE(created_at) = DATE('now', 'localtime')`, [], function (err, row) {
      Stats.TotalVote = row.TotalVote;
      Stats.NumberOfVotes = row.NumberOfVotes;
      //pvoid_cb(stats_object)
      pvoid_cb(Stats);
    });
  });
}

//=========================================================================================================================
//Funções referentes ao rastreamento de aparelhos pelo uuid.
//=========================================================================================================================

/**Função que atualiza as coordenadas de um dispositivo no banco de dados.
 * 
 * @param {string} uuid UUID do dispositivo celular.
 * @param {number} lon Longitude em formato numérico.
 * @param {number} lat Latitude em formato numérico.
 * @param {boolean} is_tracking Booleano indicando se o dispositivo tem a localização ativa no dispositivo ou não.
 * @param {(bsubmited_status: boolean) => void} pvoid_cb Equivalente à pvoid_cb(bsubmited_status) onde bsubmited_status é um parâmetro booleano recebido indicando se a localização foi atualizada com sucesso ou fracassou.
 */
function sqlite_submit_coords(uuid, lon, lat, is_tracking, pvoid_cb) {
  db.serialize(function () {
    sqlite_check_uuid(uuid, function (bexists) {
      if (bexists) {
        db.get(`SELECT COALESCE(COUNT(*), 0) AS NumberOfEntries FROM device_tracker INNER JOIN access_guids ON device_tracker.access_guid_id = access_guids.id;`, function (err, row) {
          if (Number(row.NumberOfEntries) > 0) {
            db.prepare(`UPDATE device_tracker SET lat = ?, lon = ?, is_tracking = ? WHERE access_guid_id = (SELECT id FROM access_guids WHERE guid = ? LIMIT 1);`).run([lat, lon, is_tracking, uuid]).finalize(function (err) {
              //pvoid_cb(bsubmited_status)
              pvoid_cb(!(typeof err != "undefined"));
            });
          }
          else {
            db.prepare(`INSERT INTO device_tracker (lat, lon, is_tracking, access_guid_id) VALUES (?, ?, ?, (SELECT id FROM access_guids WHERE guid = ? LIMIT 1));`).run([lat, lon, is_tracking, uuid]).finalize(function (err) {
              //pvoid_cb(bsubmited_status)
              pvoid_cb(!(typeof err != "undefined"));
            });
          }
        });
      }
      else {
        //pvoid_cb(bsubmited_status)
        pvoid_cb(false);
      }
    });
  });
}

//=========================================================================================================================
//Serialização de consultas.
//=========================================================================================================================

/**Essa função garante que todas as consultas realizadas sejam feitas na ordem correta, evitando que uma consulta seja realizada antes de uma inserção no sqlite, por exemplo.
 * 
 * @param {()=>void} serialize_cb Função sem parâmetros, coloque suas chamadas sqlite_* dentro desse callback.
 */
function sqlite_serialize(serialize_cb) {
  db.serialize(serialize_cb);
}

module.exports = {
  sqlite_check_uuid: sqlite_check_uuid,
  sqlite_add_uuid: sqlite_add_uuid,
  sqlite_get_last_access: sqlite_get_last_access,
  sqlite_update_last_access: sqlite_update_last_access,
  sqlite_get_last_vote_date: sqlite_get_last_vote_date,
  sqlite_submit_vote: sqlite_submit_vote,
  sqlite_read_daily_stats: sqlite_read_daily_stats,
  sqlite_read_current_stats: sqlite_read_current_stats,
  sqlite_submit_coords: sqlite_submit_coords,
  sqlite_serialize: sqlite_serialize
}