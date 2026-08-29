const GeminiProvider = require('./gemini.provider');
const DeepSeekProvider = require('./deepseek.provider');
const GroqProvider = require('./groq.provider');
const ClaudeProvider = require('./claude.provider');
const OllamaProvider = require('./ollama.provider');
const QwenProvider = require('./qwen.provider');
const AIProvider = require('./base.provider');
const { ServiceUnavailableError } = require('../../utils/apiError');

// Single, recognizable message used whenever every AI provider is down. The
// frontend keys off the 503 status to show a consistent "AI is out of service"
// toast, and devs can grep this string in logs.
const AI_UNAVAILABLE_MESSAGE =
  'AI is temporarily out of service (all providers failed or are rate-limited). Please try again shortly.';

// Throw the canonical AI-down error. Kept as one place so status + wording never drift.
const aiUnavailable = () => {
  throw new ServiceUnavailableError(AI_UNAVAILABLE_MESSAGE);
};

/**
 * ── Fallback order is env-driven by numbered priorities ──────────────────────
 * Each provider reads `AI_PRIORITY_<NAME>` from the environment. Providers are
 * tried in ASCENDING priority order (0 first, then 1, 2, …). A value of `-1`
 * (or any negative number) removes that provider from the chain entirely — the
 * clean way to disable one without deleting its keys.
 *
 * Example (.env):
 *   AI_PRIORITY_GEMINI=0     # tried first
 *   AI_PRIORITY_DEEPSEEK=1   # then DeepSeek (full feature parity with Gemini)
 *   AI_PRIORITY_QWEN=2
 *   AI_PRIORITY_GROQ=3
 *   AI_PRIORITY_CLAUDE=4
 *   AI_PRIORITY_OLLAMA=5     # local fallback, last
 *
 * Unset priorities fall back to the DEFAULT_PRIORITY below, so the chain still
 * works out of the box. Ties break by the default order (stable).
 */
const DEFAULT_PRIORITY = {
  GEMINI: 0,
  DEEPSEEK: 1,
  QWEN: 2,
  GROQ: 3,
  CLAUDE: 4,
  OLLAMA: 5,
};

// Read a provider's priority: env override → default → large fallback. `-1`
// (negative) disables the provider.
const priorityOf = (name) => {
  const raw = process.env[`AI_PRIORITY_${name}`];
  if (raw != null && raw !== '') {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return DEFAULT_PRIORITY[name] != null ? DEFAULT_PRIORITY[name] : 99;
};

class RouterAIProvider extends AIProvider {
  constructor() {
    super();
    this.gemini = new GeminiProvider();
    this.deepseek = new DeepSeekProvider();
    this.groq = new GroqProvider();
    this.claude = new ClaudeProvider();
    this.ollama = new OllamaProvider();
    this.qwen = new QwenProvider();

    // Every candidate provider, keyed by its env NAME (used for AI_PRIORITY_*).
    const candidates = [
      { name: 'Gemini', envKey: 'GEMINI', instance: this.gemini },
      { name: 'DeepSeek', envKey: 'DEEPSEEK', instance: this.deepseek },
      { name: 'Qwen', envKey: 'QWEN', instance: this.qwen },
      { name: 'Groq', envKey: 'GROQ', instance: this.groq },
      { name: 'Claude', envKey: 'CLAUDE', instance: this.claude },
      { name: 'Ollama', envKey: 'OLLAMA', instance: this.ollama },
    ];

    // Build the ordered fallback chain from the numbered env priorities. Drop
    // any provider whose priority is negative (explicitly disabled). Ollama also
    // honours its legacy OLLAMA_DISABLED flag.
    this.providers = candidates
      .map((c) => ({ ...c, priority: priorityOf(c.envKey) }))
      .filter((c) => c.priority >= 0)
      .filter((c) => !(c.envKey === 'OLLAMA' && /^(1|true|yes)$/i.test(process.env.OLLAMA_DISABLED || '')))
      .sort((a, b) => a.priority - b.priority);

    console.log(
      `[AI Router] Fallback order: ${this.providers.map((p) => `${p.name}(${p.priority})`).join(' → ') || '(none configured!)'}`
    );
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
  }

  async recommendJobSubcategory(title, description, skills, category) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.recommendJobSubcategory !== 'function') continue;
        const result = await provider.instance.recommendJobSubcategory(title, description, skills, category);
        if (result) return result;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for recommendJobSubcategory:`, e.message);
      }
    }
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
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
    aiUnavailable();
  }

  // Semantic skill expansion for search. Only some providers implement it; the
  // base implementation throws, so a provider that hasn't overridden it just
  // fails its turn and we fall through to the next one.
  async expandSearchSkills(query) {
    for (const provider of this.providers) {
      try {
        if (typeof provider.instance.expandSearchSkills !== 'function') continue;
        const result = await provider.instance.expandSearchSkills(query);
        if (Array.isArray(result)) return result;
        if (result && Array.isArray(result.skills)) return result.skills;
      } catch (e) {
        console.warn(`[AI Router] ${provider.name} failed for expandSearchSkills:`, e.message);
      }
    }
    aiUnavailable();
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
  const router = getAIProvider();
  const chain = (router.providers || []).map((p) => p.name).join(' → ') || 'none';
  try {
    await router.ping();
    return { status: 'success', provider: `Router (${chain})` };
  } catch (error) {
    return { status: 'error', provider: `Router (${chain})`, error: error.message };
  }
};

module.exports = {
  getAIProvider,
  checkAIHealth
};
