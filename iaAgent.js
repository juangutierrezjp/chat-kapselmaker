const axios = require('axios');
const { prompts } = require('./prompts');
const { searcher } = require('./searcher');
const { validator } = require('./validator');
const { assistant } = require('./assistant');

const iaAgent = async (context, apiUrl, userMessage) => {
    // Ejecutar Searcher
    const searchKeywords = await searcher(context, userMessage);
    console.log('Palabras clave para búsqueda:', searchKeywords);

    // Hacer peticiones a la base de datos
    const productData = await fetchProductData(apiUrl, searchKeywords);
    //console.log('Datos recibidos de la base de datos:', productData);

    // Ejecutar Validator
    console.log("respuestaaaaaaaaaaaa de la database: ", productData)
    const filteredData = await validator(context, userMessage, productData);
    console.log('Datos filtrados:', filteredData);

    // Ejecutar Assistant
    const finalResponse = await assistant(context, userMessage, filteredData);
    console.log('Respuesta del Assistant:', finalResponse);

    return finalResponse;
};

const fetchProductData = async (apiUrl, query) => {
    try {
        const response = await axios.get(`${apiUrl}?q=${encodeURIComponent(query)}`, {
            headers: { 'api_key': process.env.API_KEY }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching product data:', error);
        return [];
    }
};

module.exports = { iaAgent };
