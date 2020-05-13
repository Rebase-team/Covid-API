const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('covid.db');

//=========================================================================================================================
//Funções referentes à tabela access_guids e manipulação de uuids, acesso, etc.
//=========================================================================================================================

function sqlite_check_uuid(uuid, pvoid_cb){
    db.serialize(function(){
        db.each(`SELECT COUNT(*) AS AccessCount FROM access_guids WHERE guid=? LIMIT 1;`, [uuid], function (err, row) {
            //pvoid_cb(bexists)
            pvoid_cb(row.AccessCount > 0);
        });
    });
}

function sqlite_add_uuid(uuid, pvoid_cb){
    db.serialize(function(){
        let query = db.prepare(`INSERT INTO access_guids (guid, last_access) VALUES (?, DATETIME('now', 'localtime'));`).run([uuid]);
        query.finalize((err) => {
            //pvoid_cb(bcreation)
            pvoid_cb(typeof err != "undefined");
        });
    });
}

function sqlite_get_last_access(uuid, pvoid_cb){
    db.serialize(function(){
        db.each(`SELECT last_access FROM access_guids WHERE guid = ? LIMIT 1;`, [uuid], function(err, row){
            //pvoid_cb(last_access_date)
            pvoid_cb((typeof row.last_access != "undefined" ? row.last_access : null));
        });
    });
}

function sqlite_update_last_access(uuid, pvoid_cb){
    db.serialize(function(){
        let query = db.prepare(`UPDATE access_guids SET last_access = DATETIME('now', 'localtime') WHERE guid = ?`).run([uuid]);
        query.finalize((err) => {
            //pvoid_cb(bupdated)
            pvoid_cb(typeof err != "undefined");
        });
    });
}

function sqlite_get_access_id(uuid, pvoid_cb){
    db.serialize(function(){
        db.each(`SELECT id FROM access_guids WHERE guid = ? LIMIT 1;`, [uuid], function(err, row){
            //pvoid_cb(access_id)
            pvoid_cb((typeof row.id != "undefined" ? row.id : null));
        });
    });
}

//=========================================================================================================================
//Funções referentes à submissão de nível de aglomeração.
//=========================================================================================================================

function sqlite_submit_vote(uuid, numVote, pvoid_cb){
    db.serialize(function(){
        sqlite_get_access_id(uuid, function(access_id){
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

function sqlite_read_daily_stats(day, pvoid_cb){
    db.serialize(function(){
        let Stats = {
            TotalVote: 0,
            NumberOfVotes: 0,
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
            ],
            BiggerAgglomeration:  { Start: '00:00:00', End: '00:00:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 },
            SmallerAgglomeration: { Start: '00:00:00', End: '00:00:00', TotalVote: 0, NumberOfVotes: 0, Measure: 0 }
        }
        for (let idx = 0; idx < Stats.ScheduleStats.length; idx++){
            db.get(`SELECT COALESCE(SUM(vote_number), 0) AS TotalVote, COUNT(*) AS NumberOfVotes FROM users_votes WHERE TIME(created_at) BETWEEN ? AND ? AND week_day = ?`, [Stats.ScheduleStats[idx].Start, Stats.ScheduleStats[idx].End, day], function(err, row){
                Stats.ScheduleStats[idx].TotalVote = row.TotalVote;
                Stats.ScheduleStats[idx].NumberOfVotes = row.NumberOfVotes;
                Stats.ScheduleStats[idx].Measure = (row.NumberOfVotes != 0 ? row.TotalVote / row.NumberOfVotes : 0);
                if (Stats.ScheduleStats[idx].Measure < Stats.SmallerAgglomeration.Measure){
                    Stats.SmallerAgglomeration = Stats.ScheduleStats[idx];
                }
                if (Stats.ScheduleStats[idx].Measure > Stats.BiggerAgglomeration.Measure){
                    Stats.BiggerAgglomeration = Stats.ScheduleStats[idx];
                }
            });
        }
        db.get(`SELECT COALESCE(SUM(vote_number), 0) AS TotalVote, COUNT(*) AS NumberOfVotes FROM users_votes WHERE week_day = ?`, [day], function(err, row){
            Stats.TotalVote = row.TotalVote;
            Stats.NumberOfVotes = row.NumberOfVotes;
            //pvoid_cb(stats_object)
            pvoid_cb(Stats);
        });
    });
}

module.exports = {
    sqlite_check_uuid: sqlite_check_uuid,
    sqlite_add_uuid: sqlite_add_uuid,
    sqlite_get_last_access: sqlite_get_last_access,
    sqlite_update_last_access: sqlite_update_last_access,
    sqlite_submit_vote: sqlite_submit_vote,
    sqlite_read_daily_stats: sqlite_read_daily_stats
}