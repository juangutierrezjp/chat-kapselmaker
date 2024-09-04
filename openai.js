const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const chat = async (prompt, context) => {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                ...context.map(text => ({ role: "user", content: text }))
            ],
        });
        return completion.data.choices[0].message.content;
    } catch (err) {
        if (err.response && err.response.status === 429) {
            console.error("Error: Too Many Requests - Rate limit exceeded.");
            return "Lo siento, he recibido demasiadas solicitudes. Por favor, intenta nuevamente más tarde.";
        } else {
            console.error("Error conectando con OpenAI:", err);
            return "ERROR";
        }
    }
};

module.exports = { chat };
