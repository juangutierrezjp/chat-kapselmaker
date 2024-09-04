const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
require('dotenv').config();
const { handleIncomingMessage } = require('./chatbot');

const flowPrincipal = addKeyword(EVENTS.WELCOME)
    .addAnswer('Hola! ¿En qué puedo ayudarte?', { capture: true }, handleIncomingMessage)

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: createFlow([flowPrincipal]),
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
