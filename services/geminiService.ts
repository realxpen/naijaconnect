import { GoogleGenAI } from "@google/genai";
import { MOCK_DATA_PLANS } from "../constants";

export const getGeminiRecommendation = async (userQuery: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemPrompt = `
    You are an expert Nigerian Telecom assistant called "NaijaConnect AI".
    Your job is to recommend data plans or airtime advice based on the provided plans.
    
    Current available data plans (JSON):
    ${JSON.stringify(MOCK_DATA_PLANS)}
    
    Rules:
    1. Be friendly and helpful. You can use mild Nigerian slang like "Beta" or "Oshey", but NEVER use the word "abeg".
    2. Always mention the price (₦) and the specific carrier.
    3. If the user asks for a budget (e.g., "I have 500 Naira"), suggest the best value.
    4. Try to use the EXACT name of the plan (e.g., "Monthly 10GB") so the system can identify it.
    5. Keep responses concise and focused on helping the user make a purchase decision.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return response.text || "Sorry, I couldn't process that. Try asking about a specific budget!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Omo, something went wrong with my connection. Please try again later.";
  }
};