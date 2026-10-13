const AIProvider = require('./base.provider');
const { JOB_CATEGORIES } = require('../../utils/constants');

/**
 * Ollama provider — a fully LOCAL fallback (no API keys, no quota). Runs against
 * a local Ollama server (default http://localhost:11434) using the /api/generate
 * endpoint in JSON mode. This is the last link in the fallback chain so that
 * core AI tools (cost estimate, brief suggestion, skill validation, Buddy chat)
 * keep working even when every cloud provider is rate-limited or unconfigured.
 *
 * Config (all optional):
 *   OLLAMA_BASE_URL  default 'http://localhost:11434'
 *   OLLAMA_MODEL     default 'llama3'
 *   OLLAMA_DISABLED  set to '1'/'true' to skip this provider entirely
 */
class OllamaProvider extends AIProvider {
  constructor() {
    super();
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.model = process.env.OLLAMA_MODEL || 'llama3';
    this.disabled = /^(1|true|yes)$/i.test(process.env.OLLAMA_DISABLED || '');

    // Warm the model into memory at startup (non-blocking) so the first real
    // fallback request doesn't pay the cold-load penalty. Failures are ignored —
    // Ollama may simply not be installed in this environment.
    if (!this.disabled) {
      fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: 'ok', stream: false, keep_alive: '10m', options: { num_predict: 1 } }),
      }).catch(() => { /* ignore — local Ollama optional */ });
    }
  }

  /**
   * Low-level call to Ollama's generate endpoint. Returns the raw text.
   * `json` toggles structured JSON output (format: 'json').
   */
  async _generate(prompt, { json = true, system, timeoutMs, maxTokens = 700 } = {}) {
    // Local CPU inference can be slow, especially under concurrent load. Allow a
    // generous default and let it be tuned via OLLAMA_TIMEOUT_MS.
    const effectiveTimeout = timeoutMs || Number(process.env.OLLAMA_TIMEOUT_MS) || 120000;
    if (this.disabled) throw new Error('Ollama provider is disabled');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt,
          system,
          stream: false,
          ...(json ? { format: 'json' } : {}),
          // Lower temperature + a capped output length keep local generation
          // fast and deterministic; keep_alive keeps the model loaded in RAM so
          // back-to-back requests don't pay the cold-start cost again.
          options: { temperature: 0.4, num_predict: maxTokens },
          keep_alive: '10m',
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      return data.response || '';
    } finally {
      clearTimeout(timer);
    }
  }

  /** Parse JSON from a model response, tolerating stray prose / code fences. */
  _parseJson(text) {
    if (!text) throw new Error('Empty response from Ollama');
    try {
      return JSON.parse(text);
    } catch {
      // Fall back to extracting the first {...} or [...] block.
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Ollama did not return valid JSON');
    }
  }

  async ping() {
    // Lightweight reachability check against the tags endpoint.
    if (this.disabled) throw new Error('Ollama provider is disabled');
    const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' }).catch((e) => {
      throw new Error(`Ollama unreachable at ${this.baseUrl}: ${e.message}`);
    });
    if (!res.ok) throw new Error(`Ollama ping failed: HTTP ${res.status}`);
    return true;
  }

  async validateSkill(input) {
    const prompt = `
You are a professional skills classifier for SkillKart, a digital freelancing platform.
Validate if a given string is a valid DIGITAL or PROFESSIONAL skill relevant to online freelancing.

Allowed Categories: Software/Web/Mobile Development, UI/UX Design, Graphic Design, Video Editing, Content Writing, SEO, Digital Marketing, Data Science, AI/ML, Cybersecurity, Cloud/DevOps, Business/Virtual Assistance, No-Code/Automation, Finance/Accounting, Professional online services.

Reject offline/physical tasks (like mobile repairing, delivery), NSFW/Adult content, hobbies, sports/physical activities, entertainment-only skills, and unrelated real-world activities.

Input: "${input}"

EXCEPTIONS:
- YOU MUST ALLOW creative freelance skills that can be delivered digitally (e.g., Photography, Photo Editing, Video Editing, Illustration).

1. Determine if it's a valid professional/digital skill. IF IT IS A PHYSICAL OR OFFLINE TASK, IT IS STRICTLY INVALID.
2. If it's a variation (e.g., "reactjs"), normalize it (e.g., "React.js").
3. If invalid (violates ANY Strict Rejection Rules like offline task, hobby, sport, nsfw, or garbage), set "valid": false and explain why.
4. Provide 3-5 related professional digital skills.

Output ONLY valid JSON:
{ "valid": true, "skill": "Normalized Name", "message": "Reason if invalid else null", "suggestions": ["Skill 1", "Skill 2", "Skill 3"] }
`;
    const parsed = this._parseJson(await this._generate(prompt, { maxTokens: 200 }));
    return {
      valid: parsed.valid !== false,
      skill: parsed.skill || input,
      message: parsed.message || null,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
    };
  }

  async recommendIndustry(companyName, bio, techStack, website) {
    const ALLOWED_INDUSTRIES = [
      'Accounting & Finance', 'Advertising & PR', 'Architecture & Design', 'Automotive',
      'Aviation & Aerospace', 'Banking', 'Biotechnology', 'Construction', 'Consulting',
      'E-commerce', 'Education & EdTech', 'Energy & Utilities', 'Entertainment & Media',
      'FinTech', 'Food & Beverage', 'Gaming', 'Government & Public Sector', 'Healthcare & HealthTech',
      'Hospitality & Tourism', 'Human Resources', 'Insurance', 'Legal', 'Logistics & Supply Chain',
      'Manufacturing', 'Marketing', 'NGO & Non-profit', 'Real Estate & PropTech', 'Retail',
      'Software & IT Services', 'Telecommunications',
    ];
    const prompt = `
You are a business classification assistant for SkillKart.
Recommend the top 3 most suitable industries from the allowed list, sorted by relevance.

Company Name: "${companyName || 'N/A'}"
Bio: "${bio || 'N/A'}"
Tech Stack: "${(techStack || []).join(', ')}"
Website: "${website || 'N/A'}"

Allowed Industries: ${ALLOWED_INDUSTRIES.join(', ')}

Output ONLY valid JSON: { "recommendations": ["Industry 1", "Industry 2", "Industry 3"] }
`;
    const parsed = this._parseJson(await this._generate(prompt));
    return { recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [] };
  }

  async recommendJobCategory(title, description, skills = []) {
    const skillsText = Array.isArray(skills) ? skills.join(', ') : '';
    const prompt = `
You are a project classification assistant for SkillKart.
Pick the single best category and up to 3 suggestions ONLY from the allowed list.

Project Title: "${title || 'N/A'}"
Description: "${description || 'N/A'}"
Skills: "${skillsText || 'N/A'}"

Allowed categories (use exact spelling): ${JOB_CATEGORIES.join(', ')}

Output ONLY valid JSON: { "category": "Exact category", "suggestions": ["Cat 1", "Cat 2", "Cat 3"] }
`;
    const parsed = this._parseJson(await this._generate(prompt));
    return {
      category: parsed.category || '',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  }

  async draftProposal(job = {}, freelancer = {}) {
    const prompt = `
Write a concise, professional, persuasive proposal cover letter for a job on SkillKart.
Write in first person as the freelancer. Use ONLY the details provided — do NOT invent
clients, numbers, or experience. 120-200 words, warm but professional, no markdown, no
placeholders like [Name].

JOB:
- Title: ${job.title || 'N/A'}
- Category: ${job.category || 'N/A'}
- Description: ${(job.description || 'N/A').slice(0, 800)}
- Required skills: ${(Array.isArray(job.skills) ? job.skills.join(', ') : '') || 'N/A'}

FREELANCER:
- Name: ${freelancer.name || 'the freelancer'}
- Title: ${freelancer.title || 'N/A'}
- Experience level: ${freelancer.experienceLevel || 'N/A'}
- Skills: ${(Array.isArray(freelancer.skills) ? freelancer.skills.join(', ') : '') || 'N/A'}
- Bio: ${(freelancer.bio || 'N/A').slice(0, 400)}

Output ONLY valid JSON: { "coverLetter": "..." }
`;
    const parsed = this._parseJson(await this._generate(prompt));
    return { coverLetter: parsed.coverLetter || '' };
  }

  async buddyChat(message, history = []) {
    const convo = (history || [])
      .slice(-8)
      .map((m) => `${m.role === 'assistant' ? 'Buddy' : 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `
You are "Buddy", the friendly AI assistant for SkillKart — a student freelancing
marketplace. Help with finding work/freelancers, writing proposals, pricing, building
profiles, and navigating the platform. Be concise (under 120 words), practical, and
encouraging. If asked something off-topic, gently steer back to freelancing. Plain text.

${convo ? `Conversation so far:\n${convo}\n` : ''}User: ${message}

Output ONLY valid JSON: { "reply": "..." }
`;
    const parsed = this._parseJson(await this._generate(prompt));
    return { reply: parsed.reply || '' };
  }

  async suggestBrief(description, title = '') {
    const prompt = `
A user is describing a freelance project. Infer a structured brief.
Pick the single best category ONLY from the allowed list. Suggest 4-8 concrete,
in-demand skills. Suggest a fair budget (PKR, competitive student-marketplace rates).
Infer the required experience level as exactly "Entry", "Intermediate", or "Expert".
If a good title isn't given, write a short one.

${title ? `Title: ${title}\n` : ''}Description: ${(description || '').slice(0, 1000)}

Allowed categories (use exact spelling): ${JOB_CATEGORIES.join(', ')}

Output ONLY valid JSON:
{ "title": "<short title>", "category": "<exact category>", "skills": ["..."], "budget": <number>, "experienceLevel": "Entry | Intermediate | Expert" }
`;
    const parsed = this._parseJson(await this._generate(prompt));
    const LEVELS = ['Entry', 'Intermediate', 'Expert'];
    return {
      title: parsed.title || title || '',
      category: parsed.category || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8) : [],
      budget: Number(parsed.budget) || 0,
      experienceLevel: LEVELS.includes(parsed.experienceLevel) ? parsed.experienceLevel : '',
    };
  }

  async estimateCost(project = {}) {
    // Keep the local payload SMALL — on a CPU-bound local model, generating a
    // long breakdown array dominates latency. We ask only for the essential
    // range + a one-line rationale (the UI shows the breakdown only if present),
    // which keeps the estimate fast and responsive as a fallback.
    const prompt = `
Estimate a fair freelance project budget in PKR for SkillKart (a student talent
marketplace — competitive student rates, not enterprise). Give a realistic min and max.

PROJECT:
- Title: ${project.title || 'N/A'}
- Category: ${project.category || 'N/A'}
- Description: ${(project.description || 'N/A').slice(0, 500)}
- Skills: ${(Array.isArray(project.skills) ? project.skills.join(', ') : '') || 'N/A'}
- Complexity: ${project.complexity || 'medium'}
- Timeline: ${project.timeline || 'N/A'}

Output ONLY valid JSON (one short sentence for rationale, no breakdown):
{ "min": <number>, "max": <number>, "currency": "PKR", "rationale": "<one short sentence>" }
`;
    const parsed = this._parseJson(await this._generate(prompt, { maxTokens: 220 }));
    return {
      min: Number(parsed.min) || 0,
      max: Number(parsed.max) || 0,
      currency: parsed.currency || 'PKR',
      rationale: parsed.rationale || '',
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
    };
  }
}

module.exports = OllamaProvider;
