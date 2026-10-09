const Groq = require('groq-sdk');
const AIProvider = require('./base.provider');
const { difficultyInstruction, mcqCountFor } = require('../../utils/skillTestDifficulty');

class GroqProvider extends AIProvider {
  constructor() {
    super();
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || '',
      maxRetries: 0
    });
    // Use Llama 3.3 70B for higher quality and reliability on large JSON responses
    this.model = 'llama-3.3-70b-versatile';
  }

  async ping() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }
    
    try {
      await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: 'ping' }],
        model: this.model,
        max_tokens: 5
      });
      return true;
    } catch (error) {
      throw new Error(`Groq connection failed: ${error.message}`);
    }
  }

  async parseAndAnalyzeCV(text) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
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

You must output ONLY valid JSON in the following structure.
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
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' }
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Groq CV Parse Error:", error);
      throw new Error('Failed to parse CV with Groq API');
    }
  }

  async generateSkillTest(skills, count = 50, level) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const prompt = `
Generate a unique, randomized technical verification test for a freelancer with the following skills: ${skills.join(', ')}.
Generate exactly ${count} questions. ${difficultyInstruction(level)}
CRITICAL: These questions MUST be completely fresh, unique, and different from previous attempts. (Random Context ID: ${skills.join('-')}-${Date.now()})
IMPORTANT: 
1. DISTRIBUTION: You MUST generate exactly ${count} questions. 
2. MCQs MANDATORY: At least ${mcqCountFor(count)} out of ${count} (or 80%) of these questions MUST be Multiple Choice Questions (type: "mcq").
3. FORMAT: For MCQs, provide exactly 4 options and a "correctAnswer". 
4. SHORT ANSWER: Only the remaining ${count - mcqCountFor(count)} questions should be text-based (type: "text").
5. VARIATION: Ensure questions are technical and diverse. (Seed: ${Date.now()})

Output ONLY a JSON array of objects inside an object like this:
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
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      return parsed.questions || parsed;
    } catch (error) {
      console.error("Groq Test Gen Error:", error);
      throw new Error('Failed to generate skill test with Groq');
    }
  }

  async evaluateSkillTest(questionsAndAnswers) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
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
    }
  ],
  "overallFeedback": "Summary of performance...",
  "averageScore": 0.85
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' }
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Groq Evaluation Error:", error);
      throw new Error('Failed to evaluate skill test with Groq');
    }
  }

  async validateSkill(input) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const prompt = `
      You are a professional skills classifier for SkillKart, a digital freelancing platform.
      Your task is to validate if a given string is a valid DIGITAL or PROFESSIONAL skill relevant to online freelancing.

      Allowed Categories: Software/Web/Mobile Development, UI/UX Design, Graphic Design, Video Editing, Content Writing, SEO, Digital Marketing, Data Science, AI/ML, Cybersecurity, Cloud/DevOps, Business/Virtual Assistance, No-Code/Automation, Finance/Accounting, Professional online services.

      Strict Rejection Rules:
      - Reject NSFW/ADULT CONTENT (e.g., Pornography, Adult services).
      - Reject OFFLINE/PHYSICAL TASKS (e.g., Mobile Repairing, Plumbing, Delivery, Cleaning, Carpentry).
      - Reject HOBBIES (e.g., Cooking, Traveling).
      - Reject SPORTS/PHYSICAL ACTIVITIES (e.g., Cricket, Football, Swimming, Skating).
      - Reject ENTERTAINMENT-ONLY skills (e.g., Dancing, Magic tricks).
      - Reject UNRELATED REAL-WORLD activities (e.g., Driving).

      Input: "${input}"
      
      EXCEPTIONS:
      - YOU MUST ALLOW creative freelance skills that can be delivered digitally (e.g., Photography, Photo Editing, Video Editing, Illustration).

      Tasks:
      1. Determine if it's a valid professional/digital skill. IF IT IS A PHYSICAL OR OFFLINE TASK (like mobile repair, cleaning, delivery), IT IS STRICTLY INVALID.
      2. If it's a variation (e.g., "reactjs"), normalize it to the standard professional name (e.g., "React.js").
      3. If it's invalid (violates ANY Strict Rejection Rules like offline task, hobby, sport, nsfw, or garbage), mark as valid: false and provide a reason.
      4. Provide a list of 3-5 closely related professional digital skills as suggestions.

      Output ONLY valid JSON:
      {
        "valid": true/false,
        "skill": "Normalized Name",
        "message": "Reason if invalid (e.g. 'SkillKart only accepts professional digital/tech skills. This appears to be a hobby or physical activity.')",
        "suggestions": ["Skill 1", "Skill 2", "Skill 3"]
      }
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant that outputs only JSON.' }, { role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' }
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Groq Skill Validation Error:", error);
      throw new Error('Failed to validate skill with Groq');
    }
  }

  async recommendIndustry(companyName, bio, techStack, website) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
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

Output ONLY valid JSON in this exact format:
{
  "recommendations": ["Industry 1", "Industry 2", "Industry 3"]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant that outputs only JSON.' }, { role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' }
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Groq recommendIndustry Error:", error);
      throw new Error('Failed to recommend industry with Groq');
    }
  }
}

module.exports = GroqProvider;
