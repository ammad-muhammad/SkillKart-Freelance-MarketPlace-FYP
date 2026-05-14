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
    this.model = 'gemini-2.5-flash';
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
IMPORTANT: 
1. Mix Multiple Choice Questions (MCQs) and Short Text Input questions. Roughly half should be MCQs and half text input.
2. For MCQs, provide exactly 4 options. Include the "options" array in the output object.
3. For Text Input, the question should be answerable in a few sentences.
4. Paraphrase questions if they have been asked before and ensure variation in question styles.

Output ONLY a JSON array of objects.
Use this format:
[
  {
    "type": "mcq",
    "question": "The technical question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
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
}

module.exports = GeminiProvider;
