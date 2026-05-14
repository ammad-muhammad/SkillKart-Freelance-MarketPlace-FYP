const { getAIProvider } = require('../services/ai');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');

/**
 * Validate a skill input and get suggestions via AI
 */
exports.validateSkill = asyncHandler(async (req, res) => {
  const { input } = req.body;

  if (!input || input.trim().length === 0) {
    return sendError(res, 'Skill input is required', 400);
  }

  const ai = getAIProvider();
  const result = await ai.validateSkill(input);

  sendSuccess(res, {
    message: 'Skill validated successfully',
    data: result
  });
});
