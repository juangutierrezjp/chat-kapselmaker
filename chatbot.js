const fs = require('fs');
const path = require('path');
const { handlerAI } = require('./voice2text');
const {
    processImageOCR,
    extractOrder,
    downloadAndSaveImage,
    downloadMediaFiles,
    extractMediaUrls,
    cleanText
} = require('./utils');
const { createAudioFileFromText, deleteAudio } = require('./text2voice.js');
const { iaAgent } = require('./iaAgent');
const API_URL = 'http://localhost:3002/search-products';

const tempDir = path.join(__dirname, 'temp_files');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const redis = require('redis');
const client = redis.createClient();

client.connect(); // Conectar al cliente Redis

client.on('error', (err) => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Conectado a Redis'));
const MAX_CONTEXT_LENGTH = 5;

const handleIncomingMessage = async (msg, { provider, flowDynamic, fallBack }) => {
    const updateContext = async (from, role, message) => {
        const contextKey = `context:${from}`;
        await client.lPush(contextKey, `${role}: ${message}`);
        await client.lTrim(contextKey, 0, MAX_CONTEXT_LENGTH - 1);
        console.log("contexto actualizado: ", role, ":", message)
        return fallBack("");
    };
    const getContext = async (from) => {
        const contextKey = `context:${from}`;
        console.log("Obteniendo contexto...");
    
        try {
            // Utiliza lRange con await directamente en lugar de retornar una promesa
            const data = await client.lRange(contextKey, 0, MAX_CONTEXT_LENGTH - 1);
            const contexto=data.reverse()
            console.log("contexto OBTENIDO!!!!!!!", contexto)
            return contexto;  // Invertir para obtener los mensajes en orden cronológico
        } catch (err) {
            console.error('Error al obtener el contexto:', err);
            return []; // Retorna un array vacío en caso de error
        }
    };
    
    const { from, body, message } = msg;
    let text = body;
    console.log("mensaje recibido")
    if (message.audioMessage) {
        text = await handlerAI(msg);
        await updateContext(from, 'Usuario', text);
        const context = await getContext(from);
        const finalResponse = await iaAgent(context, API_URL, text);
        await updateContext(from, 'Asistente', finalResponse);
        const responseText = cleanText(finalResponse);
        const audioFilePath = await createAudioFileFromText(responseText);
        await flowDynamic(["", { body: " ", media: audioFilePath }]);
        deleteAudio(audioFilePath);
        const mediaUrls = extractMediaUrls(finalResponse);
        if (mediaUrls.length > 0) {
            await flowDynamic("Links: ");
            for (const url of mediaUrls) {
                await flowDynamic([url]);
            }
        }
        return fallBack("");
    }

    if (message.imageMessage) {
        const imagePath = await downloadAndSaveImage(msg, provider);
        text = await processImageOCR(imagePath);
        await updateContext(from, 'Usuario', text);

        if (!orderQueue[from]) {
            orderQueue[from] = [];
        }

        const order = extractOrder(text, body);
        orderQueue[from].push(order);

        clearTimeout(resetFlowTimer[from]);
        resetFlowTimer[from] = setTimeout(async () => {
            const context = await getContext(from);
            const orders = orderQueue[from];
            const searchKeywords = orders.map(order => `Sku:${order.sku}, cantidad:${order.quantity}`).join(', ');

            const finalResponse = await iaAgent(context, API_URL, searchKeywords);
            await updateContext(from, 'Asistente', finalResponse);

            const mediaUrls = extractMediaUrls(finalResponse);
            const responseText = finalResponse;
            if (mediaUrls.length > 0) {
                await flowDynamic(['Aguarda un segundo...⏳']);
                const responseText = responseText.replace(/https?:\/\/\S+/g, '').trim();
            }

            const downloadedFiles = await downloadMediaFiles(mediaUrls);
            for (const filePath of downloadedFiles) {
                await flowDynamic(["", { body: " ", media: filePath }]);
            }

            if (responseText) {
                await flowDynamic([responseText]);
            }

            for (const filePath of downloadedFiles) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Error deleting file ${filePath}:`, err);
                });
            }

            delete orderQueue[from];
        }, 10000);
    } else {
        await updateContext(from, 'Usuario', text);
        const context = await getContext(from)
        const finalResponse = await iaAgent(context, API_URL, text);
        await updateContext(from, 'Asistente', finalResponse);
        await flowDynamic([finalResponse]);
        return fallBack("");
    }

};

module.exports = { handleIncomingMessage };
