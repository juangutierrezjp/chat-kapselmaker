const { downloadMediaMessage } = require("@adiwajshing/baileys");
const { Configuration, OpenAIApi } = require("openai");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
ffmpeg.setFfmpegPath(ffmpegPath);

const voiceToText = async (path) => {
    if (!fs.existsSync(path)) {
        throw new Error("No se encuentra el archivo");
    }
    try {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);
        const resp = await openai.createTranscription(
            fs.createReadStream(path),
            "whisper-1"
        );
        return resp.data.text;
    } catch (err) {
        console.log(err.response);
        return "ERROR";
    }
};

const convertOggMp3 = async (inputStream, outStream) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .audioQuality(96)
            .toFormat("mp3")
            .save(outStream)
            .on("progress", (p) => null)
            .on("end", () => {
                resolve(true);
            });
    });
};

const handlerAI = async (ctx) => {
    try {
        const buffer = await downloadMediaMessage(ctx, "buffer");
        const tmpDir = path.join(process.cwd(), 'tmp');

        // Verificar si el directorio tmp existe, y si no, crearlo
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        const timestamp = Date.now();
        const pathTmpOgg = `${tmpDir}/voice-note-${timestamp}.ogg`;
        const pathTmpMp3 = `${tmpDir}/voice-note-${timestamp}.mp3`;

        // Guardar archivo .ogg
        fs.writeFileSync(pathTmpOgg, buffer);

        // Convertir el archivo de ogg a mp3
        await convertOggMp3(pathTmpOgg, pathTmpMp3);

        // Transcribir el archivo de audio
        const text = await voiceToText(pathTmpMp3);

        // Eliminar los archivos temporales
        fs.unlink(pathTmpMp3, (error) => {
            if (error) throw error;
        });
        fs.unlink(pathTmpOgg, (error) => {
            if (error) throw error;
        });

        return text;
    } catch (error) {
        console.error('Error procesando el archivo de audio:', error);
        throw error;
    }
};

module.exports = { handlerAI };
