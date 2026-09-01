// Shared prompt builder for the generic "generate with AI" text-field
// feature (job/gig descriptions, bios, portfolio descriptions, FAQ answers,
// etc). Kept in one place so every provider's wording/behaviour stays
// identical — only the model call differs.
const buildGenerateTextPrompt = ({ fieldLabel, context, existingText }) => {
  const contextLines = Object.entries(context || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const seed = String(existingText || '').trim();

  return `
You are helping a user write "${fieldLabel}" for SkillKart, a student freelance
marketplace. Write naturally, in first person where that fits the field,
professional but not stiff. Do not invent specific factual claims (dates,
prices, names) beyond what's given in the context below — stick to general,
plausible, promotional language when details are missing.

Context:
${contextLines || '(none given)'}

${seed
    ? `The user has already started writing:\n"""${seed}"""\nExpand this into complete, polished prose. Keep their intent, tone, and every specific fact/detail they already included — do not remove or contradict anything they wrote, just build it out and improve the wording.`
    : `Write a complete, compelling draft from scratch using the context above.`}

Keep it concise (roughly 2-5 sentences, or a short paragraph — do not pad).
No markdown formatting (no headers, bold, or bullet lists) unless the field
is clearly a list. Output ONLY valid JSON: { "text": "<the drafted content>" }
`;
};

module.exports = { buildGenerateTextPrompt };
