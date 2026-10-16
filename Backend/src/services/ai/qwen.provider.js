const axios = require('axios');
const AIProvider = require('./base.provider');
const { difficultyInstruction } = require('../../utils/skillTestDifficulty');

/**
 * Qwen provider — Alibaba's Qwen models, reached through any OpenAI-compatible
 * `/chat/completions` endpoint (Alibaba DashScope, OpenRouter, or a self-hosted
 * gateway). Kept host-agnostic so it works with whichever Qwen provider you have
 * a key for, without a dedicated SDK.
 *
 * Config:
 *   QWEN_API_KEY   (required to be active) — bearer token for the endpoint.
 *   QWEN_BASE_URL  default DashScope's OpenAI-compatible base. Point this at
 *                  OpenRouter (https://openrouter.ai/api/v1) or a local gateway
 *                  as needed. Should be the base ending in `/v1` (we append
 *                  `/chat/completions`).
 *   QWEN_MODEL     default 'qwen-plus'. Use e.g. 'qwen2.5-72b-instruct',
 *                  'qwen-max', or an OpenRouter id like 'qwen/qwen-2.5-72b-instruct'.
 */
class QwenProvider extends AIProvider {
  constructor() {
    super();
    this.apiKey = process.env.QWEN_API_KEY || '';
    this.baseUrl = (process.env.QWEN_BASE_URL
      || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
    this.model = process.env.QWEN_MODEL || 'qwen-plus';
    this.timeout = Number(process.env.QWEN_TIMEOUT_MS) || 60000;
  }

  _assertConfigured() {
    if (!this.apiKey) throw new Error('QWEN_API_KEY is not set');
  }

  /**
   * Low-level chat call. `json` = true asks for a JSON object back (OpenAI-style
   * response_format). Returns the assistant message content (string).
   */
  async _chat(messages, { json = false, maxTokens } = {}) {
    this._assertConfigured();
    const body = {
      model: this.model,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    };

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
    if (!content) throw new Error('Qwen returned an empty response');
    return content;
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
      throw new Error('Qwen response was not valid JSON');
    }
  }

  async ping() {
    this._assertConfigured();
    try {
      await this._chat([{ role: 'user', content: 'ping' }], { maxTokens: 5 });
      return true;
    } catch (error) {
      throw new Error(`Qwen connection failed: ${error.message}`);
    }
  }

  async parseAndAnalyzeCV(text) {
    const prompt = `
You are an expert technical recruiter and resume analyzer.
I will provide you with the raw text extracted from a freelancer's CV/Resume.

Your task is to:
1. Extract relevant information (Full name, job title, skills, work experience, education, and a short bio/summary).
2. Analyze the CV to identify missing or weak sections. If there is no evidence of projects or a portfolio, flag it as a missing section.
3. Provide actionable suggestions to improve the CV.
4. Assign a quality score from 0 to 100.
5. Classify the profile as "Strong", "Average", or "Weak".

You must output ONLY valid JSON in the following structure.
{
  "parsedData": {
    "firstName": "Extracted first name",
    "lastName": "Extracted last name",
    "title": "Extracted professional title or current role",
    "bio": "Extracted summary or bio. Keep it concise.",
    "skills": ["skill1", "skill2"],
    "socialLinks": {
      "github": "https://github.com/...",
      "linkedin": "https://linkedin.com/in/...",
      "website": "https://..."
    },
    "education": [
      {
        "institution": "Full university or college name",
        "degree": "Degree (e.g. Bachelor of Science, BS, MS)",
        "fieldOfStudy": "Field of study (e.g. Computer Science)",
        "startDate": "YYYY-MM format (e.g. 2022-01 or 2022-09)",
        "endDate": "YYYY-MM format, or empty string if currently studying/present"
      }
    ],
    "experience": ["exp1", "exp2"],
    "portfolio": ["proj1", "proj2"]
  },
  "analysis": {
    "missingSections": ["section1", "section2"],
    "weakSections": ["section3"]
  },
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "classification": "Strong",
  "score": 85
}

Here is the CV text:
---
${text}
---
    `;
    try {
      const raw = await this._chat(
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      return this._parseJson(raw);
    } catch (error) {
      console.error('Qwen CV Parse Error:', error.message);
      throw new Error('Failed to parse CV with Qwen API');
    }
  }

  async generateSkillTest(skills, count = 50, level) {
    const prompt = `
Generate a unique, randomized technical verification test for a freelancer with the following skills: ${skills.join(', ')}.
Generate exactly ${count} questions. ${difficultyInstruction(level)}
CRITICAL: These questions MUST be completely fresh and unique. (Random Context ID: ${skills.join('-')}-${Date.now()})
IMPORTANT:
1. DISTRIBUTION: Generate exactly ${count} questions.
2. MCQs MANDATORY: At least 80% of questions MUST be Multiple Choice Questions (type: "mcq").
3. FORMAT: For MCQs, provide exactly 4 options and a "correctAnswer".
4. SHORT ANSWER: Remaining questions should be text-based (type: "text").
5. VARIATION: Ensure questions are technical and diverse. (Seed: ${Date.now()})

Output ONLY a JSON object like:
{
  "questions": [
    { "type": "mcq", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "...", "skill": "...", "category": "..." },
    { "type": "text", "question": "...", "skill": "...", "category": "..." }
  ]
}
`;
    try {
      const raw = await this._chat([{ role: 'user', content: prompt }], { json: true });
      const parsed = this._parseJson(raw);
      return parsed.questions || parsed;
    } catch (error) {
      console.error('Qwen Test Gen Error:', error.message);
      throw new Error('Failed to generate skill test with Qwen');
    }
  }

  async evaluateSkillTest(questionsAndAnswers) {
    const prompt = `
Evaluate the following technical test answers.
For each answer, provide:
1. A score from 0 to 1 (0.5 = partially correct, 1 = perfect).
2. A brief evaluation feedback.

Input Data:
${JSON.stringify(questionsAndAnswers, null, 2)}

Output ONLY a JSON object:
{
  "evaluations": [ { "score": 0.9, "aiEvaluation": "..." } ],
  "overallFeedback": "...",
  "averageScore": 0.85
}
`;
    try {
      const raw = await this._chat([{ role: 'user', content: prompt }], { json: true });
      return this._parseJson(raw);
    } catch (error) {
      console.error('Qwen Evaluation Error:', error.message);
      throw new Error('Failed to evaluate skill test with Qwen');
    }
  }

  async validateSkill(input) {
    const prompt = `
      You are a professional skills classifier for SkillKart, a digital freelancing platform.
      Validate if a given string is a valid DIGITAL or PROFESSIONAL skill relevant to online freelancing.

      Allowed Categories: Software/Web/Mobile Development, UI/UX Design, Graphic Design, Video Editing, Content Writing, SEO, Digital Marketing, Data Science, AI/ML, Cybersecurity, Cloud/DevOps, Business/Virtual Assistance, No-Code/Automation, Finance/Accounting, Professional online services.

      Strict Rejection Rules:
      - Reject NSFW/ADULT content, OFFLINE/PHYSICAL tasks (mobile repair, plumbing, delivery, cleaning), HOBBIES (cooking, traveling), SPORTS, ENTERTAINMENT-ONLY skills, and UNRELATED real-world activities (driving).

      Input: "${input}"

      EXCEPTIONS: ALLOW creative freelance skills deliverable digitally (Photography, Photo Editing, Video Editing, Illustration).

      Tasks:
      1. Determine if it's a valid professional/digital skill. Physical/offline tasks are STRICTLY INVALID.
      2. Normalize variations (e.g. "reactjs" -> "React.js").
      3. If invalid, set valid:false with a reason.
      4. Provide 3-5 closely related professional digital skills as suggestions.

      Output ONLY valid JSON:
      { "valid": true/false, "skill": "Normalized Name", "message": "Reason if invalid", "suggestions": ["Skill 1","Skill 2","Skill 3"] }
    `;
    try {
      const raw = await this._chat(
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      return this._parseJson(raw);
    } catch (error) {
      console.error('Qwen Skill Validation Error:', error.message);
      throw new Error('Failed to validate skill with Qwen');
    }
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
You are an expert business classification assistant for SkillKart.
Based on the client business details, recommend the top 3 most suitable industries from the allowed list, sorted by relevance.

Business Details:
- Company Name: "${companyName || 'N/A'}"
- Bio/About: "${bio || 'N/A'}"
- Required Skills/Tech Stack: "${(techStack || []).join(', ')}"
- Website: "${website || 'N/A'}"

Allowed Industries List:
${ALLOWED_INDUSTRIES.map((ind) => `- ${ind}`).join('\n')}

Output ONLY valid JSON: { "recommendations": ["Industry 1", "Industry 2", "Industry 3"] }
`;
    try {
      const raw = await this._chat(
        [
          { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
          { role: 'user', content: prompt },
        ],
        { json: true }
      );
      return this._parseJson(raw);
    } catch (error) {
      console.error('Qwen recommendIndustry Error:', error.message);
      throw new Error('Failed to recommend industry with Qwen');
    }
  }
}

module.exports = QwenProvider;
