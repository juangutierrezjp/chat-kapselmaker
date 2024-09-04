const { chat } = require('./openai');
const { prompts } = require('./prompts');

const assistant = async (context, message, filteredData) => {
    const prompt = prompts.generateAssistantPrompt(context, message, filteredData);
    const response = await chat(prompt, context);
    console.log('Respuesta de Assistant:', response);
    const response1=response.replace('Asistente:', '').trim();
    return response1.replace('Usuario:', '').trim();
};

module.exports = { assistant };
