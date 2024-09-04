const { ElevenLabsClient } = require('elevenlabs');
const { createWriteStream, mkdirSync, existsSync } = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const dotenv = require('dotenv');
const fs = require('fs');


dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const client = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

const createAudioFileFromText = (text) => {
    return new Promise((resolve, reject) => {
        console.log("Generando audio 1%");
        try {
            // Verificar si la carpeta "temp_files" existe, si no, crearla
            const tempDir = path.join(__dirname, 'temp_files');
            if (!existsSync(tempDir)) {
                mkdirSync(tempDir);
            }
            console.log("Generando audio 10%");
            
            // Generar el audio a partir del texto usando la API de Eleven Labs
            client.generate({
                voice: "Sofi",  // Voz especificada
                voice_id: "vqoh9orw2tmOS3mY7D2p", // ID de voz especificado
                model_id: "eleven_turbo_v2_5",  // Modelo turbo especificado
                text: text,
            }).then(audio => {
                console.log("Generando audio 20%");
                
                // Generar un nombre único para el archivo de salida dentro de la carpeta "temp_files"
                const fileName = `${uuid()}.mp3`;
                const absoluteFilePath = path.join(tempDir, fileName); // Ruta absoluta dentro de "temp_files"

                const fileStream = createWriteStream(absoluteFilePath);

                // Escribir el audio en el archivo
                audio.pipe(fileStream);

                console.log("Generando audio 30%");

                // Resolver la promesa cuando la escritura del archivo esté completa
                fileStream.on('finish', () => {
                    console.log("Generando audio 100%");
                    resolve(absoluteFilePath); // Devolver la ruta absoluta
                });

                // Manejo de errores en el stream
                fileStream.on('error', (error) => {
                    console.error("Error en la escritura del archivo:", error);
                    reject(error);
                });
            }).catch(error => {
                console.error("Error generando el audio:", error);
                reject(error);
            });

        } catch (error) {
            reject(error); // Capturar errores generales
        }
    });
};


const deleteAudio = (audioFilePath) => {
    return new Promise((resolve, reject) => {
        try {
            // Eliminar el archivo MP3
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
                console.log(`Archivo MP3 eliminado: ${audioFilePath}`);
            } else {
                console.warn(`El archivo MP3 no existe: ${audioFilePath}`);
            }

            // Construir la ruta para el archivo .opus
            const opusFilePath = path.join(
                path.dirname(audioFilePath),
                path.basename(audioFilePath, '.mp3') + '.opus'
            );

            // Eliminar el archivo .opus
            if (fs.existsSync(opusFilePath)) {
                fs.unlinkSync(opusFilePath);
                console.log(`Archivo .opus eliminado: ${opusFilePath}`);
            } else {
                console.warn(`El archivo .opus no existe: ${opusFilePath}`);
            }

            resolve();
        } catch (error) {
            console.error('Error al eliminar los archivos:', error);
            reject(error);
        }
    });
};

module.exports = {createAudioFileFromText, deleteAudio};
