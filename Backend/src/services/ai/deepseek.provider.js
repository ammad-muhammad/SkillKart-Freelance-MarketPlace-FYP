const axios = require('axios');
const AIProvider = require('./base.provider');
const { JOB_CATEGORIES } = require('../../utils/constants');
const { buildGenerateTextPrompt } = require('./promptHelpers');
const { difficultyInstruction } = require('../../utils/skillTestDifficulty');

/**
 * DeepSeek provider — reached through DeepSeek's OpenAI-compatible
 * `/chat/completions` endpoint. Implements the FULL AIProvider surface (same
 * 13 methods as Gemini) so it can run standalone, not just as a thin fallback
 * like Qwen/Groq/Claude.
 *
 * Model names: `deepseek-chat` / `deepseek-reasoner` were retired 2026-07-24
 * for `deepseek-v4-flash` / `deepseek-v4-pro`; `deepseek-v4-flash` was then
 * superseded 2026-09-10 by `deepseek-flash` (DeepSeek-V4.1-Flash, 1M context,
 * natively multimodal). The old `deepseek-v4-flash` and the experimental
 * `deepseek-v4-flash-vision-exp` are only TEMPORARILY routed to it with no
 * announced sunset date, so always send the canonical `deepseek-flash`.
 * `deepseek-v4-pro` is unchanged (text-only, ~3x the cost). Reasoning is a
 * request-level toggle (`thinking`) rather than baked into the model name,
 * and BOTH models default to thinking ENABLED — silently leaving it on burns
 * extra reasoning tokens/latency for no benefit on the short classification/
 * extraction tasks this file does, so every call below explicitly disables it.
 *
 * Config:
 *   DEEPSEEK_API_KEY      (required to be active) — bearer token.
 *   DEEPSEEK_BASE_URL     default 'https://api.deepseek.com'.
 *   DEEPSEEK_MODEL_LITE   default 'deepseek-flash' — validateSkill, search
 *                         expansion, recommendations, taxonomy.
 *   DEEPSEEK_MODEL_HEAVY  default 'deepseek-flash' — CV parsing, skill test
 *                         gen/grading, Buddy chat, proposals, cost estimator.
 *                         Bump to 'deepseek-v4-pro' if quality needs it.
 *   DEEPSEEK_THINKING     default 'disabled'. Set to 'enabled' to let the
 *                         heavier tasks use extended reasoning (slower/pricier).
 *   DEEPSEEK_TIMEOUT_MS   default 60000.
 */
class DeepSeekProvider extends AIProvider {
  constructor() {
    super();
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    this.liteModel = process.env.DEEPSEEK_MODEL_LITE || 'deepseek-flash';
    this.model = process.env.DEEPSEEK_MODEL_HEAVY || 'deepseek-flash';
    this.thinking = /^(1|true|enabled)$/i.test(process.env.DEEPSEEK_THINKING || '') ? 'enabled' : 'disabled';
    this.timeout = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 60000;
  }

  _assertConfigured() {
    if (!this.apiKey) throw new Error('DEEPSEEK_API_KEY is not set');
  }

  /**
   * Low-level chat call. `json` = true asks for a JSON object back (OpenAI-style
   * response_format, supported by DeepSeek). Returns the assistant message
   * content (string). Maps a 429 to the same shape the Gemini provider uses so
   * the router/controllers see consistent overload errors across providers.
   */
  async _chat(model, messages, { json = false, maxTokens } = {}) {
    this._assertConfigured();
    const body = {
      model,
      messages,
      thinking: { type: this.thinking },
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    };

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/chat/completions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('DeepSeek returned an empty response');
      return content;
    } catch (error) {
      if (error.response?.status === 429) {
        const aiError = new Error('AI Service is temporarily overloaded. Please try again in a few minutes.');
        aiError.statusCode = 429;
        throw aiError;
      }
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  // Parse a JSON string that may be wrapped in ```json fences or prose.
  _parseJson(raw) {
    const cleaned = String(raw)
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/[[{][\s\S]*[\]}]/);
      if (match) return JSON.parse(match[0]);
      throw new Error('DeepSeek response was not valid JSON');
    }
  }

  async ping() {
    this._assertConfigured();
    try {
      await this._chat(this.model, [{ role: 'user', content: 'ping' }], { maxTokens: 5 });
      return true;
    } catch (error) {
      throw new Error(`DeepSeek connection failed: ${error.message}`);
    }
  }

  async parseAndAnalyzeCV(text) {
    this._assertConfigured();

    const prompt = `
You are an expert technical recruiter and resume analyzer.
I will provide you with the raw text extracted from a freelancer's CV/Resume.

Your task is to:
1. Extract relevant information (Full name, job title, skills, work experience, education, and a short bio/summary).
2. Analyze the CV to identify missing or weak sections, paying special attention to real-world experience, projects, or a portfolio. If there is no evidence of projects or a portfolio, flag it as a missing section.
3. Provide actionable suggestions to improve the CV based on your analysis.
4. Assign a quality score to the CV from 0 to 100 based on completeness, clarity, and relevance.
5. Classify the profile as "Strong", "Average", or "Weak". A profile missing a portfolio or significant real-world experience should be classified as "Weak" or "Average" at best.

You must output ONLY valid JSON in the following structure. Do not include markdown code blocks like \`\`\`json. Just output the raw JSON object.

{
  "parsedData": {
    "title": "Extracted professional title or current role",
    "bio": "Extracted summary or bio. Keep it concise.",
    "skills": ["skill1", "skill2"],
    "education": ["edu1", "edu2"],
    "experience": ["exp1", "exp2"],
    "portfolio": ["proj1", "proj2"]
  },
  "analysis": {
    "missingSections": ["section1", "section2"],
    "weakSections": ["section3"]
  },
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "classification": "Strong | Average | Weak",
  "score": 85
}

Here is the CV text:
---
${text}
---
    `;

    try {
      const raw = await this._chat(
        this.model,
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      return this._parseJson(raw);
    } catch (error) {
      console.error('DeepSeek CV Parse Error:', error.message);
      if (error.statusCode === 429) throw error;
      throw new Error('Failed to parse CV with DeepSeek API');
    }
  }

  async generateSkillTest(skills, count = 50) {
    this._assertConfigured();

    const prompt = `
Generate a unique, randomized technical verification test for a freelancer with the following skills: ${skills.join(', ')}.
Generate exactly ${count} questions. ${difficultyInstruction()}
CRITICAL: These questions MUST be completely fresh, unique, and different from previous attempts. (Random Context ID: ${skills.join('-')}-${Date.now()})
IMPORTANT:
1. DISTRIBUTION: You MUST generate exactly ${count} questions.
2. MCQs MANDATORY: At least 20 out of 25 (or 80%) of these questions MUST be Multiple Choice Questions (type: "mcq").
3. FORMAT: For MCQs, provide exactly 4 options and a "correctAnswer".
4. SHORT ANSWER: Only the remaining 5 questions should be text-based (type: "text").
5. VARIATION: Ensure questions are technical and diverse. (Seed: ${Date.now()})

Output ONLY a JSON object inside an object like this:
{
  "questions": [
    {
      "type": "mcq",
      "question": "The technical question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option",
      "skill": "The skill this question belongs to",
      "category": "Theory/Practical/Code/etc"
    },
    {
      "type": "text",
      "question": "The technical question text...",
      "skill": "The skill this question belongs to",
      "category": "Theory/Practical/Code/etc"
    }
  ]
}
`;

    try {
      const raw = await this._chat(this.model, [{ role: 'user', content: prompt }], { json: true });
      const parsed = this._parseJson(raw);
      return parsed.questions || parsed;
    } catch (error) {
      console.error('DeepSeek Test Gen Error:', error.message);
      if (error.statusCode === 429) throw error;
      throw new Error('Failed to generate skill test with DeepSeek');
    }
  }

  async evaluateSkillTest(questionsAndAnswers) {
    this._assertConfigured();

    const prompt = `
Evaluate the following technical test answers.
For each answer, provide:
1. A score from 0 to 1 (0.5 means partially correct, 1 means perfect).
2. A brief evaluation feedback.

Input Data:
${JSON.stringify(questionsAndAnswers, null, 2)}

Output ONLY a JSON object:
{
  "evaluations": [
    {
      "score": 0.9,
      "aiEvaluation": "Correct explanation of the concept..."
    }
  ],
  "overallFeedback": "Summary of performance...",
  "averageScore": 0.85
}
`;

    try {
      const raw = await this._chat(this.model, [{ role: 'user', content: prompt }], { json: true });
      return this._parseJson(raw);
    } catch (error) {
      console.error('DeepSeek Evaluation Error:', error.message);
      if (error.statusCode === 429) throw error;
      throw new Error('Failed to evaluate skill test with DeepSeek');
    }
  }

  async validateSkill(input) {
    this._assertConfigured();

    const prompt = `
You are a STRICT skills classifier for SkillKart, a digital freelancing platform.
Validate if the input is a valid DIGITAL or PROFESSIONAL skill relevant to online freelancing.

CRITICAL REJECTION RULES - YOU MUST RETURN {"valid": false} FOR:
1. ANY NSFW, Adult content, Pornography, or sexually explicit services.
2. ANY OFFLINE or PHYSICAL TASKS (e.g., Mobile Repairing, Plumbing, Delivery, Cleaning, Carpentry).
3. HOBBIES, SPORTS, PHYSICAL ACTIVITIES (e.g., Cooking, Traveling, Cricket, Swimming).
4. ENTERTAINMENT-ONLY skills (e.g., Dancing, Magic tricks).
5. UNRELATED REAL-WORLD activities (e.g., Driving).

Input: "${input}"

EXCEPTIONS:
- YOU MUST ALLOW creative freelance skills that can be delivered digitally (e.g., Photography, Photo Editing, Video Editing, Illustration).

Instructions:
If the input violates ANY of the CRITICAL REJECTION RULES above, YOU MUST output:
{ "valid": false, "skill": "${input}", "message": "Reason why it is rejected based on the rules.", "suggestions": ["Digital Skill 1", "Digital Skill 2", "Digital Skill 3"] }

If the input IS a valid, digital, professional skill (like Web Development, Graphic Design, Content Writing):
{ "valid": true, "skill": "Normalized Name", "message": null, "suggestions": ["Related 1", "Related 2", "Related 3"] }

Output ONLY valid JSON.
`;

    try {
      const raw = await this._chat(
        this.liteModel,
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      const result = this._parseJson(raw);
      return {
        valid: result.valid || false,
        skill: result.skill || input,
        suggestions: result.suggestions || [],
        message: result.message || '',
      };
    } catch (error) {
      console.error('DeepSeek Skill Validation Error:', error.message);
      throw error;
    }
  }

  async expandSearchSkills(query) {
    this._assertConfigured();

    const prompt = `
You are a skills expansion assistant for a digital freelancing platform.
The user is searching for freelancers using a broad term like "${query}".
Return a JSON array of 5 to 8 specific, actionable technical skills associated with this category.
For example, if the query is "Web Development", you might return ["JavaScript", "React", "HTML", "CSS", "Node.js"].
If the query is already a highly specific skill, return an array with just that skill and a few closely related ones.

Output ONLY a JSON object: { "skills": ["Skill 1", "Skill 2", "Skill 3"] }
`;

    try {
      const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
      const parsed = this._parseJson(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.skills && Array.isArray(parsed.skills)) return parsed.skills;
      return [];
    } catch (error) {
      console.error('DeepSeek Skill Expansion Error:', error.message);
      return [];
    }
  }

  async recommendIndustry(companyName, bio, techStack, website) {
    this._assertConfigured();

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
You are an expert business classification assistant for SkillKart.
Based on the following client business details, recommend the top 3 most suitable industries from the allowed list, sorted by relevance.

Business Details:
- Company Name: "${companyName || 'N/A'}"
- Bio/About: "${bio || 'N/A'}"
- Required Skills/Tech Stack: "${(techStack || []).join(', ')}"
- Website: "${website || 'N/A'}"

Allowed Industries List:
${ALLOWED_INDUSTRIES.map((ind) => `- ${ind}`).join('\n')}

Output ONLY valid JSON in this exact format:
{
  "recommendations": ["Industry 1", "Industry 2", "Industry 3"]
}
`;

    try {
      const raw = await this._chat(
        this.liteModel,
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      return this._parseJson(raw);
    } catch (error) {
      console.error('DeepSeek recommendIndustry Error:', error.message);
      throw new Error('Failed to recommend industry with DeepSeek');
    }
  }

  async recommendJobCategory(title, description, skills = []) {
    this._assertConfigured();
    const skillsText = Array.isArray(skills) ? skills.join(', ') : '';

    const prompt = `
You are a project classification assistant for SkillKart.
Pick the single best category and up to 3 suggestions ONLY from the allowed list below.

Project Title: "${title || 'N/A'}"
Description: "${description || 'N/A'}"
Skills: "${skillsText || 'N/A'}"

Allowed categories (use exact spelling):
${JOB_CATEGORIES.map((c) => `- ${c}`).join('\n')}

Output ONLY valid JSON:
{
  "category": "Exact category from list",
  "suggestions": ["Category 1", "Category 2", "Category 3"]
}
`;

    try {
      const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
      return this._parseJson(raw);
    } catch (error) {
      console.error('DeepSeek recommendJobCategory Error:', error.message);
      throw new Error('Failed to recommend job category with DeepSeek');
    }
  }

  /**
   * Suggest a free-text subcategory refinement (e.g. "Frontend Development"
   * under "Web Development"). Unlike category there's no fixed taxonomy to
   * pick from, so this is short free text rather than a list lookup.
   */
  async recommendJobSubcategory(title, description, skills = [], category = '') {
    this._assertConfigured();
    const skillsText = Array.isArray(skills) ? skills.join(', ') : '';

    const prompt = `
You are a project classification assistant for SkillKart.
Suggest a short, specific subcategory that refines the given category — a more
precise niche within it (e.g. category "Web Development" → subcategory
"Frontend Development" or "WordPress Development"). Keep each suggestion to
2-4 words, title case, no punctuation.

Project Title: "${title || 'N/A'}"
Description: "${description || 'N/A'}"
Skills: "${skillsText || 'N/A'}"
Category: "${category || 'N/A'}"

Output ONLY valid JSON:
{
  "subcategory": "Best subcategory",
  "suggestions": ["Subcategory 1", "Subcategory 2", "Subcategory 3"]
}
`;

    try {
      const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
      return this._parseJson(raw);
    } catch (error) {
      console.error('DeepSeek recommendJobSubcategory Error:', error.message);
      throw new Error('Failed to recommend job subcategory with DeepSeek');
    }
  }

  /**
   * Draft a freelancer proposal cover letter for a job, using the freelancer's
   * own profile so it's personalised and honest (no invented experience).
   * @param {object} job - { title, description, skills, budget, category }
   * @param {object} freelancer - { name, title, bio, skills, experienceLevel }
   * @returns {Promise<{ coverLetter: string }>}
   */
  async draftProposal(job = {}, freelancer = {}) {
    this._assertConfigured();

    const prompt = `
You help a freelancer write a concise, professional, and persuasive proposal
cover letter for a job on SkillKart. Write in first person as the freelancer.
Use ONLY the freelancer details provided — do NOT invent specific past clients,
numbers, or experience that aren't given. 120-200 words, warm but professional,
no markdown, no placeholders like [Name].

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

    const raw = await this._chat(this.model, [{ role: 'user', content: prompt }], { json: true });
    const parsed = this._parseJson(raw);
    return { coverLetter: parsed?.coverLetter || '' };
  }

  /**
   * Buddy AI assistant: answer a user's question about freelancing / using
   * SkillKart. `history` is an array of { role:'user'|'assistant', content }.
   * @returns {Promise<{ reply: string }>}
   */
  async buddyChat(message, history = []) {
    this._assertConfigured();

    const convo = (history || [])
      .slice(-8)
      .map((m) => `${m.role === 'assistant' ? 'Buddy' : 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `
You are "Buddy", the friendly AI assistant for SkillKart — a student freelancing
marketplace. Help users with: finding work/freelancers, writing proposals,
pricing, building profiles, and navigating the platform. Be concise (under 120
words), practical, and encouraging. If asked something off-topic, gently steer
back to freelancing. Plain text only, no markdown headers.

${convo ? `Conversation so far:\n${convo}\n` : ''}User: ${message}

Output ONLY valid JSON: { "reply": "..." }
`;

    const raw = await this._chat(this.model, [{ role: 'user', content: prompt }], { json: true });
    const parsed = this._parseJson(raw);
    return { reply: parsed?.reply || '' };
  }

  /**
   * Suggest a structured project brief from a free-text description: best
   * category (from the allowed list), relevant skills, and a fair budget.
   * Used by the AI Matchmaking auto-fill. @returns {Promise<{title,category,skills:string[],budget:number}>}
   */
  async suggestBrief(description, title = '') {
    this._assertConfigured();

    const prompt = `
A user is describing a freelance project. Infer a structured brief.
Pick the single best category ONLY from the allowed list. Suggest 4-8 concrete,
in-demand skills. Suggest a fair budget (PKR, competitive student-marketplace
rates). Infer the required experience level as one of exactly: "Entry",
"Intermediate", or "Expert" (based on the scope/complexity). If a good title
isn't given, write a short one.

${title ? `Title: ${title}\n` : ''}Description: ${(description || '').slice(0, 1000)}

Allowed categories (use exact spelling): ${JOB_CATEGORIES.join(', ')}

Output ONLY valid JSON:
{ "title": "<short title>", "category": "<exact category>", "skills": ["..."], "budget": <number>, "experienceLevel": "Entry | Intermediate | Expert" }
`;

    const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
    const parsed = this._parseJson(raw);
    const LEVELS = ['Entry', 'Intermediate', 'Expert'];
    return {
      title: parsed?.title || title || '',
      category: parsed?.category || '',
      skills: Array.isArray(parsed?.skills) ? parsed.skills.slice(0, 8) : [],
      budget: Number(parsed?.budget) || 0,
      experienceLevel: LEVELS.includes(parsed?.experienceLevel) ? parsed.experienceLevel : '',
    };
  }

  /**
   * Cost estimator: estimate a fair budget range for a project.
   * @param {object} project - { title, description, category, skills, complexity, timeline }
   * @returns {Promise<{ min:number, max:number, currency:string, rationale:string, breakdown?:object[] }>}
   */
  async estimateCost(project = {}) {
    this._assertConfigured();

    const prompt = `
You estimate a fair freelance project budget in PKR for SkillKart (a student
talent marketplace — rates are competitive, not enterprise). Base it on scope,
skills, and timeline. Give a realistic min and max.

PROJECT:
- Title: ${project.title || 'N/A'}
- Category: ${project.category || 'N/A'}
- Description: ${(project.description || 'N/A').slice(0, 800)}
- Skills: ${(Array.isArray(project.skills) ? project.skills.join(', ') : '') || 'N/A'}
- Complexity: ${project.complexity || 'medium'}
- Timeline: ${project.timeline || 'N/A'}

Output ONLY valid JSON:
{ "min": <number>, "max": <number>, "currency": "PKR",
  "rationale": "<1-2 sentence explanation>",
  "breakdown": [ { "label": "<phase>", "amount": <number> } ] }
`;

    const raw = await this._chat(this.model, [{ role: 'user', content: prompt }], { json: true });
    const parsed = this._parseJson(raw);
    return {
      min: Number(parsed?.min) || 0,
      max: Number(parsed?.max) || 0,
      currency: parsed?.currency || 'PKR',
      rationale: parsed?.rationale || '',
      breakdown: Array.isArray(parsed?.breakdown) ? parsed.breakdown : [],
    };
  }

  async suggestTaxonomyNode(unrecognizedName, contextCategory) {
    this._assertConfigured();

    const prompt = `
You are a taxonomy administrator AI for an online freelance platform.
A user has typed an unrecognized concept, term, tool, or skill: "${unrecognizedName}".
The context category given is: "${contextCategory || 'General Work'}".

Analyze this term and suggest how it should fit into the platform's relationship-based skill graph.
Suggest a type for this node (must be one of: 'industry', 'category', 'profession', 'skill', 'technology', 'tool', 'concept').
Suggest related parent category/industry nodes it should connect to via 'BELONGS_TO' relationship.
Suggest 1-3 aliases (e.g. JS for JavaScript), synonyms, a short description, search weight (0.0 to 1.0), and relationship links.

Output ONLY valid JSON matching this exact structure:
{
  "name": "Canonical capitalized name (e.g. Adobe Premiere Pro)",
  "type": "tool",
  "description": "Short explanation of what it is",
  "aliases": ["Premiere", "Premiere Pro"],
  "synonyms": ["Video Editor"],
  "weight": 0.9,
  "icon": "🎬",
  "color": "#ec4899",
  "relationships": [
    {
      "targetName": "Web Development",
      "type": "BELONGS_TO",
      "weight": 1.0
    }
  ],
  "aiReasoning": "Brief explanation of this placement"
}
`;

    const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
    return this._parseJson(raw);
  }

  /**
   * Generic "generate with AI" for a free-text field — see base.provider.js.
   */
  async generateText({ fieldLabel, context, existingText }) {
    this._assertConfigured();
    const prompt = buildGenerateTextPrompt({ fieldLabel, context, existingText });

    const raw = await this._chat(this.liteModel, [{ role: 'user', content: prompt }], { json: true });
    const parsed = this._parseJson(raw);
    return { text: String(parsed?.text || '').trim() };
  }
}

module.exports = DeepSeekProvider;
