const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { getUploadPath } = require('../utils/file.util');

const ALLOWED_ISSUE_TYPES = [
  'Broken Pavement',
  'Pothole',
  'Broken Streetlight',
  'Overflowing Trash Bin',
  'Blocked Drain',
  'Graffiti',
  'Fallen Tree',
  'Unknown',
];

const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High'];

const SYSTEM_PROMPT = `You are an expert at analyzing public infrastructure damage from photos.
Analyze the image and return ONLY valid JSON with no markdown or extra text.

Use exactly these fields:
{
  "issue_type": "<one of: Broken Pavement, Pothole, Broken Streetlight, Overflowing Trash Bin, Blocked Drain, Graffiti, Fallen Tree, Unknown>",
  "severity": "<one of: Low, Medium, High>",
  "description": "<brief description of the issue>",
  "confidence": <number 0-100>
}`;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function parseAiResponse(content) {
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  const issueType = ALLOWED_ISSUE_TYPES.includes(parsed.issue_type)
    ? parsed.issue_type
    : 'Unknown';

  const severity = ALLOWED_SEVERITIES.includes(parsed.severity)
    ? parsed.severity
    : 'Medium';

  const description =
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : 'No description provided.';

  let confidence = parseFloat(parsed.confidence);
  if (Number.isNaN(confidence)) confidence = 0;
  confidence = Math.min(100, Math.max(0, confidence));

  return {
    issueType,
    severity,
    description,
    confidence,
  };
}

async function analyzeImage(relativeImagePath) {
  const imagePath = getUploadPath(path.basename(relativeImagePath));
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = relativeImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const client = getClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this public infrastructure image and classify the issue.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return parseAiResponse(content);
}

module.exports = {
  analyzeImage,
  ALLOWED_ISSUE_TYPES,
  ALLOWED_SEVERITIES,
};
