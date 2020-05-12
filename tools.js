function dump(res, code, params){
    if (!res.finished){
        res.json({ response: code, parameters: params }).end();
        res.finished = true;
    }
}

function is_uuid(uuid){
    return (new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)).test(uuid);
}