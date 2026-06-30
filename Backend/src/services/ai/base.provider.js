class AIProvider {
  /**
   * Parses the CV text and returns a structured JSON object.
   * @param {string} text - The raw text extracted from the CV.
   * @returns {Promise<Object>} The parsed CV data, analysis, suggestions, and score.
   */
  async parseAndAnalyzeCV(text) {
    throw new Error('Method parseAndAnalyzeCV() must be implemented by the provider.');
  }

  /**
   * Health check method to verify API connection
   * @returns {Promise<boolean>}
   */
  async ping() {
    throw new Error('Method ping() must be implemented by the provider.');
  }

  /**
   * Validates a skill and provides suggestions/normalization.
   * @param {string} input - The raw skill input from the user.
   * @returns {Promise<Object>} { valid: boolean, skill: string, suggestions: string[], message?: string }
   */
  async validateSkill(input) {
    throw new Error('Method validateSkill() must be implemented by the provider.');
  }

  /**
   * Expands a broad search query into specific skills.
   * @param {string} query - The search query (e.g. "Web Development").
   * @returns {Promise<string[]>} Array of specific skills.
   */
  async expandSearchSkills(query) {
    throw new Error('Method expandSearchSkills() must be implemented by the provider.');
  }

  /**
   * Recommends a list of industries based on client profile details.
   * @param {string} companyName - The name of the company.
   * @param {string} bio - The bio/description of the company.
   * @param {Array<string>} techStack - The skills/technologies.
   * @param {string} website - The website link/domain.
   * @returns {Promise<Object>} { recommendations: string[] }
   */
  async recommendIndustry(companyName, bio, techStack, website) {
    throw new Error('Method recommendIndustry() must be implemented by the provider.');
  }

  /**
   * @returns {Promise<{ category: string, suggestions: string[] }>}
   */
  async recommendJobCategory(title, description, skills) {
    throw new Error('Method recommendJobCategory() must be implemented by the provider.');
  }

  /**
   * Generate a skill test (array of question objects) for the given skills.
   * @param {string[]} skills
   * @param {number} count
   * @returns {Promise<Array<Object>>}
   */
  async generateSkillTest(skills, count) {
    throw new Error('Method generateSkillTest() must be implemented by the provider.');
  }

  /**
   * Evaluate submitted skill-test answers and return scored results.
   * @param {Array<Object>} questionsAndAnswers
   * @returns {Promise<Object>}
   */
  async evaluateSkillTest(questionsAndAnswers) {
    throw new Error('Method evaluateSkillTest() must be implemented by the provider.');
  }

  /**
   * Suggests taxonomy node attributes and relationships for unrecognized terms.
   * @param {string} unrecognizedName
   * @param {string} contextCategory
   * @returns {Promise<Object>} Proposed node and relationship schema
   */
  async suggestTaxonomyNode(unrecognizedName, contextCategory) {
    throw new Error('Method suggestTaxonomyNode() must be implemented by the provider.');
  }
}

module.exports = AIProvider;
