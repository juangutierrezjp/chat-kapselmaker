const { chat } = require('./openai');
const { prompts } = require('./prompts');

const validator = async (context, message, productData) => {
    const prompt = prompts.generateValidatorPrompt(context, message, productData);
    console.log("validando: ", message)
    const response = await chat(prompt, context);
    console.log('Respuesta de Validator:', response);

    return response.replace('Asistente:', '').trim();
};

module.exports = { validator };
