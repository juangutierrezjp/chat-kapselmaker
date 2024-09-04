const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const downloadCatalogs = async (catalogUrls) => {
    const catalogDir = path.join(__dirname, 'catalogs');

    // Crear directorio si no existe
    await fs.ensureDir(catalogDir);

    // Descargar cada PDF
    await Promise.all(catalogUrls.map(async (url, index) => {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const tempFilePath = path.join(catalogDir, `temp_catalogo${index + 1}.pdf`);
        const finalFilePath = path.join(catalogDir, `catalogo${index + 1}.pdf`);
        const writer = fs.createWriteStream(tempFilePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    // Renombrar el archivo temporal al nombre final
                    await fs.rename(tempFilePath, finalFilePath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            writer.on('error', reject);
        });
    }));
};

module.exports = { downloadCatalogs };
