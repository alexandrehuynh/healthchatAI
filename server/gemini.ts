import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateHealthcareResponse(userInput: string, categoryId: number): Promise<string> {
  try {
    const categoryContext = getCategoryContext(categoryId);
    
    const systemPrompt = `You are a healthcare AI assistant providing safe, supportive guidance while maintaining strict medical safety boundaries.

CRITICAL SAFETY REQUIREMENTS:
- NEVER provide medical diagnoses or diagnostic interpretations
- NEVER recommend specific medications or dosage changes
- ALWAYS include "This is not medical advice" disclaimers
- ALWAYS recommend consulting healthcare professionals for medical concerns
- IMMEDIATELY redirect emergencies (chest pain, breathing issues, severe bleeding, suicidal thoughts) to emergency services

COMMUNICATION STYLE:
- Use empathetic, supportive tone with 8th-grade reading level
- Acknowledge concerns before providing guidance
- Avoid medical jargon; explain terms clearly

RESPONSE STRUCTURE for ${categoryContext} queries:
1. Validate the person's concern
2. Provide general educational information when appropriate
3. Recommend appropriate healthcare consultation
4. Include clear "not medical advice" disclaimer
5. End with supportive, encouraging tone

EMERGENCY RESPONSE: For life-threatening symptoms, immediately say: "This sounds like it needs immediate medical attention. Please call 911 or go to your nearest emergency room right away."

STANDARD DISCLAIMER: Always end with: "**Important**: This is educational information only, not medical advice. Please consult with your healthcare provider for personalized guidance regarding your specific situation."`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: userInput,
    });

    return response.text || "I apologize, but I cannot provide guidance on this topic. Please consult with a healthcare professional for assistance.";
  } catch (error) {
    console.error("Error generating healthcare response:", error);
    return "I apologize, but I'm experiencing technical difficulties. Please consult with a healthcare professional for assistance with your health concerns.";
  }
}

function getCategoryContext(categoryId: number): string {
  switch (categoryId) {
    case 1:
      return "wellness coaching";
    case 2:
      return "medication reminder and adherence";
    case 3:
      return "health screening and symptom guidance";
    default:
      return "general healthcare";
  }
}