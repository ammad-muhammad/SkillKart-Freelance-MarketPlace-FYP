const GeminiProvider = require('./gemini.provider');
// Future providers can be imported here, e.g., const OpenAIProvider = require('./openai.provider');

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

let activeProviderInstance = null;

const getAIProvider = () => {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  switch (AI_PROVIDER.toLowerCase()) {
    case 'gemini':
      activeProviderInstance = new GeminiProvider();
      break;
    // case 'openai':
    //   activeProviderInstance = new OpenAIProvider();
    //   break;
    default:
      console.warn(`Unsupported AI_PROVIDER '${AI_PROVIDER}'. Falling back to 'gemini'.`);
      activeProviderInstance = new GeminiProvider();
  }

  return activeProviderInstance;
};

const checkAIHealth = async () => {
  try {
    const provider = getAIProvider();
    await provider.ping();
    return { status: 'success', provider: AI_PROVIDER };
  } catch (error) {
    return { status: 'error', provider: AI_PROVIDER, error: error.message };
  }
};

module.exports = {
  getAIProvider,
  checkAIHealth
};
