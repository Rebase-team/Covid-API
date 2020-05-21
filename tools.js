const axios = require('axios').default;
const uaparser = require('ua-parser-js');

const DEBUG_CHANNELS ={
    MAIN_CHANNEL: '@gunscovid19bot'
}

function dump(res, code, params){
    if (!res.finished){
        res.json({ response: code, parameters: params }).end();
        res.finished = true;
    }
}

function is_uuid(uuid){
    return (new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)).test(uuid);
}

function debug_translate_code(errorCode){
    let Msg = {};
    Msg[1]  = 'O UUID foi armazenado com sucesso!';
    Msg[2]  = 'O UUID é inválido.';
    Msg[3]  = 'O UUID fornecido já consta na base de dados.';
    Msg[4]  = 'Falha ao inserir UUID na base de dados.';
    Msg[5]  = 'O voto ou avaliação de aglomeração fornecida é inválido.';
    Msg[6]  = 'Você já votou, para votar novamente, aguardar pelo menos 1 hora.';
    Msg[7]  = 'Um erro ocorreu durante o voto ou avaliação.';
    Msg[8]  = 'Voto ou avaliação submetida com sucesso.';
    Msg[9]  = 'Médias calculadas e recuperadas com sucesso.';
    Msg[10] = 'Pico e mínima de aglomerações enviada com sucesso.';
    Msg[11] = 'Erro desconhecido ao atualizar a localização do dispositivo.';
    Msg[12] = 'Erro desconhecido ao retornar localização do dispositivo.';
    Msg[13] = 'O parâmetro "is_tracking é inválido."';
    Msg[14] = 'O dispositivo está sendo rastreado com sucesso.';
    Msg[15] = 'Localização do dispositivo retornada com sucesso.';
    Msg[16] = 'Exibindo todos os dados de Covid-19 todos os estados do Brasil.';
    Msg[17] = 'Exibindo dados da Covid-19 de unidade federativa.';
    Msg[18] = 'Exibindo dados da Covid-19 do Brasil inteiro.';
    Msg[19] = 'A data fornecida para obter dados da Covid-19 no Brasil é inválida.';
    Msg[20] = 'Exibindo relatórios das fontes oficiais do governo.';
    Msg[21] = 'Exibindo dados da Covid-19 em Garanhuns.';
    return Msg[Number(errorCode)];
}

function debug_bot_send(errorCode, req, channel) {
    //Token
    const BOT_TOKEN = '990027737:AAGKgApnLhnXIEeWki-sq0uvY4YQoZEFy60';
    //User-Agent analisado.
    let uagent = uaparser(req.headers["user-agent"]);
    //Mensagem do bot.
    let Message = `[${(new Date()).toLocaleTimeString()}]\nOS: ${String(uagent.os.name)}\nArch: ${String(uagent.cpu.architecture)}\nDevice: ${String((uagent.device.type ? uagent.device.type : 'Desconhecido'))}\nEndereço de IP: ${String(req.ip)}\nUrl: ${String(req.url)}\nMétodo: ${req.method}\n\n-> Erro: ${debug_translate_code(errorCode)}\n\n\n`;
    //Requisição para enviar a mensagem.
    axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${channel}&text=${encodeURIComponent(Message)}`).then(()=>{});
}

module.exports = {
    DEBUG_CHANNELS: DEBUG_CHANNELS,
    dump: dump,
    is_uuid: is_uuid,
    debug_bot_send: debug_bot_send,
    debug_translate_code: debug_translate_code
}