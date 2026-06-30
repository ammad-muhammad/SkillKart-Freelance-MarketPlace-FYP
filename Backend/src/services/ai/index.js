const GeminiProvider = require('./gemini.provider');
const GroqProvider = require('./groq.provider');
const ClaudeProvider = require('./claude.provider');
const OllamaProvider = require('./ollama.provider');
const AIProvider = require('./base.provider');

class RouterAIProvider extends AIProvider {
  constructor() {
    super();
    this.gemini = new GeminiProvider();
    this.groq = new GroqProvider();
    this.claude = new ClaudeProvider();
    this.ollama = new OllamaProvider();

    // Ordered fallback chain: cloud first (Gemini -> Groq -> Claude), then a
    // fully LOCAL Ollama provider last. Ollama needs no API key or quota, so it
    // keeps core AI tools working when every cloud provider is rate-limited
    // (e.g. Gemini free-tier 429). Set OLLAMA_DISABLED=1 to skip it.
    this.providers = [
      { name: 'Gemini', instance: this.gemini },
      { name: 'Groq', instance: this.groq },
      { name: 'Claude', instance: this.claude },
      { name: 'Ollama', instance: this.ollama }
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

  async recommendIndustry(companyName, bio, techStack, website) {
    for (const provider of this.providers) {
      try {
        const result = await provider.instance.recommendIndustry(companyName, bio, techStack, website);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for recommendIndustry:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async recommendJobCategory(title, description, skills) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.recommendJobCategory !== 'function') continue;
        const result = await provider.instance.recommendJobCategory(title, description, skills);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for recommendJobCategory:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async draftProposal(job, freelancer) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.draftProposal !== 'function') continue;
        const result = await provider.instance.draftProposal(job, freelancer);
        if (result && result.coverLetter) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for draftProposal:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async buddyChat(message, history) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.buddyChat !== 'function') continue;
        const result = await provider.instance.buddyChat(message, history);
        if (result && result.reply) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for buddyChat:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async estimateCost(project) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.estimateCost !== 'function') continue;
        const result = await provider.instance.estimateCost(project);
        if (result && (result.min || result.max)) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for estimateCost:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async suggestBrief(description, title) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.suggestBrief !== 'function') continue;
        const result = await provider.instance.suggestBrief(description, title);
        if (result && (result.category || result.skills?.length)) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for suggestBrief:`, e.message);
      }
    }
    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  async suggestTaxonomyNode(unrecognizedName, contextCategory) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.suggestTaxonomyNode !== 'function') continue;
        const result = await provider.instance.suggestTaxonomyNode(unrecognizedName, contextCategory);
        if (result && result.name && result.type) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for suggestTaxonomyNode:`, e.message);
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
    return { status: 'success', provider: 'Router (Gemini -> Groq -> Claude -> Ollama)' };
  } catch (error) {
    return { status: 'error', provider: 'Router', error: error.message };
  }
};

module.exports = {
  getAIProvider,
  checkAIHealth
};
