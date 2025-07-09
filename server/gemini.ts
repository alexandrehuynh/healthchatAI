import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateHealthcareResponse(userInput: string, categoryId: number): Promise<string> {
  try {
    const categoryContext = getCategoryContext(categoryId);
    
    const systemPrompt = `You are a healthcare AI assistant designed to provide safe, responsible guidance. You must follow these critical safety guidelines:

1. NEVER provide medical diagnoses or claim to diagnose conditions
2. ALWAYS include disclaimers that this is not medical advice
3. ALWAYS recommend consulting healthcare professionals for medical concerns
4. Use empathetic, supportive language
5. Provide general wellness information only
6. Redirect serious concerns to appropriate medical professionals
7. Use clear, accessible language (health literacy appropriate)

Context: You are responding to a ${categoryContext} query.

Remember: Your role is to provide supportive guidance while maintaining strict medical safety boundaries.`;

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