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
        try {
            console.log("Generando audio con el texto: ", responseText);
            const audioFilePath = await createAudioFileFromText(responseText);
            console.log("Audio generado en: ", audioFilePath);
            // Verifica si el archivo de audio existe antes de proceder
            if (!fs.existsSync(audioFilePath)) {
                throw new Error("El archivo de audio no fue creado correctamente.");
            }
            console.log("Enviando audio...");
            // Intenta enviar el archivo de audio utilizando flowDynamic
            if (fs.existsSync(audioFilePath)) {
                console.log("El archivo de audio existe y está listo para enviarse:", audioFilePath);
            } else {
                throw new Error("El archivo de audio no fue generado correctamente.");
            }            
            await flowDynamic([" ",{ body: " ", media:audioFilePath }]);
            console.log("Audio enviado: ", audioFilePath);
            // Después de enviar, elimina el archivo de audio
            deleteAudio(audioFilePath);
            console.log("Audio eliminado: ", audioFilePath);
        } catch (error) {
            console.error("Error durante el proceso de generación/envío de audio: ", error);
        }

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
        await flowDynamic(["lo siento, aun no puedo entender imagenes :( "])
        return fallBack("");
    } else {
        
        const response = async ()=>{
            console.log("enviando...")
            await flowDynamic("",{ body:"", media: '/root/chat-kapselmaker/img.jpg' });
        }
        response()
        await updateContext(from, 'Usuario', text);
        const context = await getContext(from)
        const finalResponse = await iaAgent(context, API_URL, text);
        await updateContext(from, 'Asistente', finalResponse);
        await flowDynamic([finalResponse]);
        return fallBack("");
    }

};

module.exports = { handleIncomingMessage };
