const { GoogleGenAI } = require('@google/genai');
const AIProvider = require('./base.provider');

class GeminiProvider extends AIProvider {
  constructor() {
    super();
    // Note: If GEMINI_API_KEY is not set, @google/genai might throw,
    // so we initialize it gracefully or rely on the SDK's auto-config
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
    // Two cost tiers, both defaulting to the cheapest model actually available
    // on this key: gemini-2.5-flash-lite and gemini-2.5-pro 404 ("no longer
    // available to new users") and gemini-2.5-flash 429s on quota, so the
    // 2.5 line is a dead end for new projects — gemini-3.1-flash-lite is the
    // cheapest Gemini 3.x model confirmed working. `model` (heavy tier) is a
    // separate env override so quality-sensitive tasks (CV analysis, skill
    // test gen/grading, Buddy chat) can be bumped later without touching code
    // — just set GEMINI_MODEL_HEAVY (e.g. to gemini-3.5-flash-lite).
    this.liteModel = process.env.GEMINI_MODEL_LITE || 'gemini-3.1-flash-lite';
    this.model = process.env.GEMINI_MODEL_HEAVY || 'gemini-3.1-flash-lite';
  }

  async ping() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    try {
      // Minimal request to verify API connection
      await this.ai.models.generateContent({
        model: this.model,
        contents: "ping",
      });
      return true;
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async parseAndAnalyzeCV(text) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in the environment variables.');
    }

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
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const responseText = response.text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Gemini CV Parse Error:", error);
      throw new Error('Failed to parse CV with Gemini API');
    }
  }

  async generateSkillTest(skills, count = 50) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `
Generate a unique, randomized technical verification test for a freelancer with the following skills: ${skills.join(', ')}.
Generate exactly ${count} questions. The difficulty should be moderate (not too hard, not too easy).
CRITICAL: These questions MUST be completely fresh, unique, and different from previous attempts. (Random Context ID: ${skills.join('-')}-${Date.now()})
IMPORTANT: 
1. DISTRIBUTION: You MUST generate exactly ${count} questions. 
2. MCQs MANDATORY: At least 20 out of 25 (or 80%) of these questions MUST be Multiple Choice Questions (type: "mcq").
3. FORMAT: For MCQs, provide exactly 4 options and a "correctAnswer". 
4. SHORT ANSWER: Only the remaining 5 questions should be text-based (type: "text").
5. VARIATION: Ensure questions are technical and diverse. (Seed: ${Date.now()})

Output ONLY a JSON array of objects.
Use this format:
[
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
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini Test Gen Error:", error);
      if (error.status === 429 || error.message?.includes('429')) {
        const aiError = new Error('AI Service is temporarily overloaded. Please try again in a few minutes.');
        aiError.statusCode = 429;
        throw aiError;
      }
      throw new Error('Failed to generate skill test');
    }
  }

  async evaluateSkillTest(questionsAndAnswers) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

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
    },
    ...
  ],
  "overallFeedback": "Summary of performance...",
  "averageScore": 0.85
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini Evaluation Error:", error);
      if (error.status === 429 || error.message?.includes('429')) {
        const aiError = new Error('AI Evaluation service is temporarily at capacity. Your progress is saved, please try submitting again later.');
        aiError.statusCode = 429;
        throw aiError;
      }
      throw new Error('Failed to evaluate skill test');
    }
  }

  async validateSkill(input) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

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
      const response = await this.ai.models.generateContent({
        model: this.liteModel,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text);
      return {
        valid: result.valid || false,
        skill: result.skill || input,
        suggestions: result.suggestions || [],
        message: result.message || ''
      };
    } catch (error) {
      console.error("Gemini Skill Validation Error:", error);
      throw error;
    }
  }

  async expandSearchSkills(query) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `
You are a skills expansion assistant for a digital freelancing platform.
The user is searching for freelancers using a broad term like "${query}".
Return a JSON array of 5 to 8 specific, actionable technical skills associated with this category.
For example, if the query is "Web Development", you might return ["JavaScript", "React", "HTML", "CSS", "Node.js"].
If the query is already a highly specific skill, return an array with just that skill and a few closely related ones.

Output ONLY a JSON array of strings:
["Skill 1", "Skill 2", "Skill 3"]
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.liteModel,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.skills && Array.isArray(parsed.skills)) return parsed.skills;
      return [];
    } catch (error) {
      console.error("Gemini Skill Expansion Error:", error);
      return [];
    }
  }

  async recommendIndustry(companyName, bio, techStack, website) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const ALLOWED_INDUSTRIES = [
      'Accounting & Finance', 'Advertising & PR', 'Architecture & Design', 'Automotive',
      'Aviation & Aerospace', 'Banking', 'Biotechnology', 'Construction', 'Consulting',
      'E-commerce', 'Education & EdTech', 'Energy & Utilities', 'Entertainment & Media',
      'FinTech', 'Food & Beverage', 'Gaming', 'Government & Public Sector', 'Healthcare & HealthTech',
      'Hospitality & Tourism', 'Human Resources', 'Insurance', 'Legal', 'Logistics & Supply Chain',
      'Manufacturing', 'Marketing', 'NGO & Non-profit', 'Real Estate & PropTech', 'Retail',
      'Software & IT Services', 'Telecommunications'
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
${ALLOWED_INDUSTRIES.map(ind => `- ${ind}`).join('\n')}

Output ONLY valid JSON in this exact format. Do not include markdown code blocks or other text.
{
  "recommendations": ["Industry 1", "Industry 2", "Industry 3"]
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.liteModel,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini recommendIndustry Error:", error);
      throw new Error('Failed to recommend industry with Gemini');
    }
  }

  async recommendJobCategory(title, description, skills = []) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const { JOB_CATEGORIES } = require('../../utils/constants');
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
      const response = await this.ai.models.generateContent({
        model: this.liteModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error('Gemini recommendJobCategory Error:', error);
      throw new Error('Failed to recommend job category with Gemini');
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
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(response.text);
    return { coverLetter: parsed?.coverLetter || '' };
  }

  /**
   * Buddy AI assistant: answer a user's question about freelancing / using
   * SkillKart. `history` is an array of { role:'user'|'assistant', content }.
   * @returns {Promise<{ reply: string }>}
   */
  async buddyChat(message, history = []) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(response.text);
    return { reply: parsed?.reply || '' };
  }

  /**
   * Suggest a structured project brief from a free-text description: best
   * category (from the allowed list), relevant skills, and a fair budget.
   * Used by the AI Matchmaking auto-fill. @returns {Promise<{title,category,skills:string[],budget:number}>}
   */
  async suggestBrief(description, title = '') {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    const { JOB_CATEGORIES } = require('../../utils/constants');

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

    const response = await this.ai.models.generateContent({
      model: this.liteModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(response.text);
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
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(response.text);
    return {
      min: Number(parsed?.min) || 0,
      max: Number(parsed?.max) || 0,
      currency: parsed?.currency || 'PKR',
      rationale: parsed?.rationale || '',
      breakdown: Array.isArray(parsed?.breakdown) ? parsed.breakdown : [],
    };
  }

  async suggestTaxonomyNode(unrecognizedName, contextCategory) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

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

    const response = await this.ai.models.generateContent({
      model: this.liteModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text);
  }
}

module.exports = GeminiProvider;
