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
marketplace. First identify WHOSE voice this is: if the field label says it's
written by/for a client (the person hiring), write as the client describing
what they need done — never as the freelancer pitching their own services. If
it's a freelancer's bio/gig/portfolio field, write as that freelancer. Get this
right even when the label doesn't spell it out — infer it from context (e.g. a
"job listing" or "project summary" a client posts is the client's voice; a
"gig" or "profile bio" is the freelancer's voice). Write naturally in first
person where that fits, professional but not stiff. Do not invent specific
factual claims (dates, prices, names) beyond what's given in the context below
— stick to general, plausible, promotional language when details are missing.

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
