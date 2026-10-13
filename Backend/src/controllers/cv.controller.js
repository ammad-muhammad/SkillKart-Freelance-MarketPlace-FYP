const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { getAIProvider } = require('../services/ai');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { BadRequestError } = require('../utils/apiError');

/**
 * Extract text from buffer based on mimetype
 */
const extractText = async (buffer, mimetype) => {
  let text = '';
  
  if (mimetype === 'application/pdf') {
    let parser = null;
    try {
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
    } catch (err) {
      console.error(`❌ PDF Extraction failed: ${err.message}`);
      throw new BadRequestError(`PDF Extraction failed: ${err.message}`);
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  } else if (
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } catch (err) {
      console.error(`❌ DOCX Extraction failed: ${err.message}`);
      throw new BadRequestError(`DOCX Extraction failed: ${err.message}`);
    }
  } else {
    throw new BadRequestError('Unsupported file format for parsing.');
  }
  
  return text;
};

/**
 * Parse CV and analyze with AI
 */
const parseCV = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('No CV file uploaded.');
  }

  const { buffer, mimetype, size } = req.file;

  console.log('--- CV PARSING PIPELINE ---');
  console.log(`📄 Received file type: ${mimetype}`);
  console.log(`📦 File size: ${size} bytes`);

  // 1. Extract text
  const text = await extractText(buffer, mimetype);
  
  if (!text || text.trim().length === 0) {
    console.log('⚠️ Extraction resulted in empty text.');
    throw new BadRequestError('Could not extract text from the provided file. It might be an image-based PDF.');
  }

  console.log(`✅ Text extraction successful. Length: ${text.length} characters.`);
  console.log('🧠 Sending extracted text to AI Provider...');

  // 2. Pass to AI Provider
  const aiProvider = getAIProvider();
  const result = await aiProvider.parseAndAnalyzeCV(text);
  
  console.log('✅ AI Analysis complete. Returning results.');
  console.log('---------------------------');

  // 3. Return results
  sendSuccess(res, {
    message: 'CV parsed successfully',
    data: result
  });
});

module.exports = {
  parseCV
};
