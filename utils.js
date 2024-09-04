const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const { downloadMediaMessage } = require('@adiwajshing/baileys');

const tempDir = path.join(__dirname, 'temp_files');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const processImageOCR = async (imagePath) => {
    console.log(`Iniciando reconocimiento de imagen en ${imagePath}`);

    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
            logger: m => console.log(m)
        });
        console.log(`Texto reconocido: ${text}`);

        // Eliminar la imagen temporal
        fs.unlink(imagePath, (err) => {
            if (err) console.error(`Error deleting file ${imagePath}:`, err);
        });

        // Filtrar el texto para obtener solo los SKUs
        const skuRegex = /(LM\d{2}-\d{1}-\d{3}|LM\d{2}-\d{5})/g;
        let skus = text.match(skuRegex) || [];
        skus = skus.map(sku => {
            if (/LM\d{2}-\d{5}/.test(sku)) {
                return `LM${sku.slice(2, 4)}-${sku.slice(4, 5)}-${sku.slice(5)}`;
            }
            return sku;
        });
        console.log(`SKUs reconocidos: ${skus.join(', ')}`);
        return skus.join(', ');
    } catch (error) {
        console.error('Error durante el reconocimiento de la imagen:', error);
        return '';
    }
};

const extractOrder = (text, body) => {
    const skuRegex = /(LM\d{2}-\d{1}-\d{3}|LM\d{2}-\d{3})/;
    const skuMatch = text.match(skuRegex);
    const quantityMatch = body.match(/\d+/);

    const sku = skuMatch ? skuMatch[0] : null;
    const quantity = quantityMatch ? quantityMatch[0] : '1';

    return { sku, quantity };
};

const downloadAndSaveImage = async (msg, provider) => {
    const stream = await downloadMediaMessage(msg, 'buffer', {}, { logger: null });
    const filePath = path.join(tempDir, `${Date.now()}.jpg`);

    fs.writeFileSync(filePath, stream);
    return filePath;
};

const downloadMediaFiles = async (urls) => {
    const downloadedFiles = [];
    for (const url of urls) {
        console.log(`Intentando descargar archivo desde ${url}`);
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    'Accept': 'application/pdf',
                    'Content-Type': 'application/pdf'
                }
            });

            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'file.pdf';

            if (contentDisposition && contentDisposition.includes('attachment')) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            } else {
                fileName = path.basename(url);
            }

            const filePath = path.join(tempDir, fileName);
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`Archivo descargado: ${filePath}`);
            downloadedFiles.push(filePath);
        } catch (error) {
            console.error(`Error downloading file from ${url}:`, error);
        }
    }
    return downloadedFiles;
};

const extractMediaUrls = (text) => {
    // Expresión regular para URLs
    const urlRegex = /((https?:\/\/|www\.)[^\s\)]+|[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?([^\s\)]+)?)/g;
    const urls = text.match(urlRegex) || [];
    return urls.map(url => url.replace(/[\)\.]+$/, '')); // Quitar paréntesis y puntos al final si los hay
};

const cleanText = (text) => {
    // Expresión regular para detectar URLs (http, https, www, o solo dominio)
    const urlRegex = /((https?:\/\/|www\.)[^\s\)]+|[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?([^\s\)]+)?)/g;

    // Expresión regular para detectar emojis
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u0023-\u0039]\uFE0F?\u20E3|[\u3297\u3299]|[\u303D\u3030]|[\uD83D\uDC00-\uDFFF]|[\uD83E\uDD10-\uDDFF])/g;

    // Remover URLs y emojis
    const cleanText = text.replace(urlRegex, '').replace(emojiRegex, '').trim();

    return cleanText;
};

const fetchProductData = async (query) => {
    try {
        const response = await axios.get(`${API_URL}?q=${encodeURIComponent(query)}`, {
            headers: { 'api_key': process.env.API_KEY }
        });
        console.log('Datos recibidos de la base de datos:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching product data:', error);
        return [];
    }
};

module.exports = {
    processImageOCR,
    extractOrder,
    downloadAndSaveImage,
    downloadMediaFiles,
    extractMediaUrls,
    cleanText,
    fetchProductData
};
