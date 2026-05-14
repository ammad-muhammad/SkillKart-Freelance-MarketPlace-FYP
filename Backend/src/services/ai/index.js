const GeminiProvider = require('./gemini.provider');
const GroqProvider = require('./groq.provider');
const ClaudeProvider = require('./claude.provider');
const AIProvider = require('./base.provider');

class RouterAIProvider extends AIProvider {
  constructor() {
    super();
    this.gemini = new GeminiProvider();
    this.groq = new GroqProvider();
    this.claude = new ClaudeProvider();
    
    // Ordered list of providers: Gemini -> Groq -> Claude
    this.providers = [
      { name: 'Gemini', instance: this.gemini },
      { name: 'Groq', instance: this.groq },
      { name: 'Claude', instance: this.claude }
    ];
  }

  async ping() {
    // Return true if at least one works
    for (const provider of this.providers) {
      try {
        await provider.instance.ping();
        return true;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} ping failed:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async parseAndAnalyzeCV(text) {
    for (const provider of this.providers) {
      try {
        const result = await provider.instance.parseAndAnalyzeCV(text);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for parseAndAnalyzeCV:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async generateSkillTest(skills, count = 50) {
    for (const provider of this.providers) {
      try {
        const result = await provider.instance.generateSkillTest(skills, count);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for generateSkillTest:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async evaluateSkillTest(questionsAndAnswers) {
    for (const provider of this.providers) {
      try {
        const result = await provider.instance.evaluateSkillTest(questionsAndAnswers);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for evaluateSkillTest:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async validateSkill(input) {
    for (const provider of this.providers) {
      try {
        const result = await provider.instance.validateSkill(input);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for validateSkill:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }
}

let activeProviderInstance = null;

const getAIProvider = () => {
  if (!activeProviderInstance) {
    activeProviderInstance = new RouterAIProvider();
  }
  return activeProviderInstance;
};

const checkAIHealth = async () => {
  try {
    const provider = getAIProvider();
    await provider.ping();
    return { status: 'success', provider: 'Router (Gemini -> Groq -> Claude)' };
  } catch (error) {
    return { status: 'error', provider: 'Router', error: error.message };
  }
};

module.exports = {
  getAIProvider,
  checkAIHealth
};
