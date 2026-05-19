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
}

module.exports = AIProvider;
