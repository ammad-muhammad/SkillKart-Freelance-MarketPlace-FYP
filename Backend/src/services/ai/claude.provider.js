const Anthropic = require('@anthropic-ai/sdk');
const AIProvider = require('./base.provider');

class ClaudeProvider extends AIProvider {
  constructor() {
    super();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      maxRetries: 0
    });
    this.model = 'claude-3-haiku-20240307';
  }

  _parseJSON(text) {
    // Claude might wrap JSON in markdown blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return JSON.parse(text);
  }

  async ping() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    try {
      await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }]
      });
      return true;
    } catch (error) {
      throw new Error(`Claude connection failed: ${error.message}`);
    }
  }

  async parseAndAnalyzeCV(text) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const prompt = `
You are an expert technical recruiter and resume analyzer.
I will provide you with the raw text extracted from a freelancer's CV/Resume.

Your task is to:
1. Extract relevant information (Full name, job title, skills, work experience, education, and a short bio/summary).
2. Analyze the CV to identify missing or weak sections. If there is no evidence of projects or a portfolio, flag it as a missing section.
3. Provide actionable suggestions to improve the CV.
4. Assign a quality score from 0 to 100.
5. Classify the profile as "Strong", "Average", or "Weak".

You must output ONLY valid JSON in the following structure. Do not output anything else.
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
  "classification": "Strong",
  "score": 85
}

Here is the CV text:
---
${text}
---
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });
      return this._parseJSON(response.content[0].text);
    } catch (error) {
      console.error("Claude CV Parse Error:", error);
      throw new Error('Failed to parse CV with Claude API');
    }
  }

  async generateSkillTest(skills, count = 50) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
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

Output ONLY a JSON array of objects. Do not output any other text.
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
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });
      return this._parseJSON(response.content[0].text);
    } catch (error) {
      console.error("Claude Test Gen Error:", error);
      throw new Error('Failed to generate skill test with Claude');
    }
  }

  async evaluateSkillTest(questionsAndAnswers) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const prompt = `
Evaluate the following technical test answers. 
For each answer, provide:
1. A score from 0 to 1 (0.5 means partially correct, 1 means perfect).
2. A brief evaluation feedback.

Input Data:
${JSON.stringify(questionsAndAnswers, null, 2)}

Output ONLY a JSON object. Do not output anything else.
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
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });
      return this._parseJSON(response.content[0].text);
    } catch (error) {
      console.error("Claude Evaluation Error:", error);
      throw new Error('Failed to evaluate skill test with Claude');
    }
  }

  async validateSkill(input) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const prompt = `
      You are a professional skills validator.
      Analyze the following skill input: "${input}"
      
      Tasks:
      1. Determine if it's a valid professional skill (e.g., "React", "Accounting", "Python").
      2. If it's a variation (e.g., "reactjs"), normalize it to the standard professional name (e.g., "React.js").
      3. If it's invalid (e.g., "asdf", "cool guy", "random sentence"), mark as valid: false and provide a reason.
      4. Provide a list of 3-5 closely related professional skills as suggestions.

      Output ONLY valid JSON. Do not output anything else.
      {
        "valid": true/false,
        "skill": "Normalized Name",
        "message": "Reason if invalid or empty",
        "suggestions": ["Skill 1", "Skill 2", "Skill 3"]
      }
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      return this._parseJSON(response.content[0].text);
    } catch (error) {
      console.error("Claude Skill Validation Error:", error);
      throw new Error('Failed to validate skill with Claude');
    }
  }
}

module.exports = ClaudeProvider;
