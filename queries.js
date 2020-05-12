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
        })
    });
}

module.exports = {
    sqlite_check_uuid: sqlite_check_uuid,
    sqlite_add_uuid: sqlite_add_uuid,
    sqlite_get_last_access: sqlite_get_last_access,
    sqlite_update_last_access: sqlite_update_last_access
}