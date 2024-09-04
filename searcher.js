const { chat } = require('./openai');
const { prompts } = require('./prompts');

const searcher = async (context, message) => {
    const prompt = prompts.generateSearcherPrompt(context, message);
    const response = await chat(prompt, context);
    console.log('Respuesta de Searcher:', response);

    return response.replace('Petición:', '').trim();
};

module.exports = { searcher };