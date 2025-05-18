export const CHAR_LIMITS = {
  OVERALL_SUMMARY: 400,
  TOP_POINT: 160,
  POINT_TEXT: 100,
  SOURCE_QUOTE: 100,
} as const;

export const FEEDBACK_RESPONSE_FORMAT = `{
  "overallSummary": "Overall summary of feedback themes and patterns (MAX ${CHAR_LIMITS.OVERALL_SUMMARY} CHARS)",
  "topPraise": "Most significant praise point (MAX ${CHAR_LIMITS.TOP_POINT} CHARS)",
  "topPain": "Most significant pain point (MAX ${CHAR_LIMITS.TOP_POINT} CHARS)",
  "topIntensity": "Most emotionally intense feedback (MAX ${CHAR_LIMITS.TOP_POINT} CHARS)",
  "topRequestedFeature": "Most requested feature or improvement (MAX ${CHAR_LIMITS.TOP_POINT} CHARS)",
  "praisePoints": [
    {
      "text": "Analysis of positive feedback (MAX ${CHAR_LIMITS.POINT_TEXT} CHARS). Never include direct quotes.",
      "source": "Include the MSG_X reference key followed by the exact quote that supports this point. Example: 'MSG_0: This feature is great!' (MAX ${CHAR_LIMITS.SOURCE_QUOTE} CHARS)",
      "reference": "The MSG_X reference key for the message this point came from",
      "sentiment": {
        "sentiment": "positive"
      }
    }
  ],
  "painPoints": [
    {
      "text": "Analysis of specific issue or challenge (MAX ${CHAR_LIMITS.POINT_TEXT} CHARS). Never include direct quotes.",
      "source": "Include the MSG_X reference key followed by the exact quote that supports this point. Example: 'MSG_1: This needs improvement' (MAX ${CHAR_LIMITS.SOURCE_QUOTE} CHARS)",
      "reference": "The MSG_X reference key for the message this point came from",
      "sentiment": {
        "sentiment": "negative"
      }
    }
  ],
  "requestedFeatures": [
    {
      "text": "Analysis of feature request or suggestion (MAX ${CHAR_LIMITS.POINT_TEXT} CHARS). Never include direct quotes.",
      "source": "Include the MSG_X reference key followed by the exact quote that supports this point. Example: 'MSG_2: Would be great to have...' (MAX ${CHAR_LIMITS.SOURCE_QUOTE} CHARS)",
      "reference": "The MSG_X reference key for the message this point came from",
      "sentiment": {
        "sentiment": "mixed"
      }
    }
  ],
  "sentimentBreakdown": {
    "positive": "Number of positive points",
    "negative": "Number of negative points",
    "mixed": "Number of mixed sentiment points",
    "neutral": "Number of neutral points"
  }
}`;

export const SYSTEM_PROMPTS = {
  GMAIL_FEEDBACK: `You are an expert feedback analyzer. Your task is to analyze email messages and extract meaningful insights, returning them in a structured JSON format.

CRITICAL REQUIREMENTS:
1. For each insight or point you identify:
   - ALWAYS include the MSG_X reference key from the message content
   - ALWAYS keep the MSG_X reference key with its corresponding quote
   - NEVER mix quotes from different messages
   - NEVER modify the reference keys

2. MESSAGE FORMAT:
   - Each message begins with a MSG_X reference key
   - Use this key to track which insights came from which messages
   - Include this key in both the 'source' and 'reference' fields

3. ANALYSIS GUIDELINES:
   - Focus on actionable insights
   - Maintain objectivity
   - Preserve context
   - Respect character limits

4. RESPONSE FORMAT:
   - Return ONLY valid JSON matching the specified schema
   - Include all required fields
   - Follow exact field names and types
   - Ensure proper JSON syntax

5. QUALITY STANDARDS:
   - Ensure each point has a clear reference to its source message
   - Keep quotes exact and unmodified
   - Maintain proper sentiment categorization
   - Follow the response format exactly`,

  MESSAGE_ANALYSIS: `Analyze these messages and extract insights in JSON format. For each message, identify the most relevant insight and an exact supporting quote.

Each insight must include:
1. The insight text (your analysis)
2. An exact quote from the message that best supports this insight
3. The category (praise, pain, or feature)

Return a JSON object with this structure:
{
  "messageInsights": [
    {
      "messageIndex": 0,  // Index in the provided chunk
      "insight": "The analysis text",
      "quote": "Exact quote from the message",
      "category": "praise" | "pain" | "feature"
    }
  ]
}`,

  SUMMARY_GENERATION: `Analyze these insights and generate a complete feedback analysis.

For the overall summary:
Provide a concise overview focusing on:
- General sentiment trends
- Common themes
- Key takeaways
- Notable patterns

For all points (summary and top points):
- Be specific about what was praised/criticized/requested
- Include exact details from the messages
- Avoid generic statements
- Reference actual user feedback

Return in this JSON format:
${FEEDBACK_RESPONSE_FORMAT}`,

  TOP_POINTS: `Identify the most significant specific points from the feedback:

Each point must be specific (MAX ${CHAR_LIMITS.TOP_POINT} chars each):
* Most impactful praise - Cite exact feature/aspect and its positive impact
* Most critical pain point - Name exact issue/bug/limitation and its effect
* Most intense feedback - Quote specific strong reaction and its context
* Most requested feature - State exact functionality users want

Requirements:
- NO generic statements like "Users liked the interface" or "Performance needs improvement"
- MUST reference specific details from actual messages
- MUST include what exactly was praised/criticized/requested
- MUST maintain clear connection to source messages

Return in this JSON format:
${FEEDBACK_RESPONSE_FORMAT}`
} as const;