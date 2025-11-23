import { GoogleGenAI, Modality, Type } from "@google/genai";
import { NewsArticle, Category, TTSMode, NewsSource, AgeRange } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const apiKey = process.env.API_KEY;

// We use a singleton pattern for the client, but re-instantiate if needed for keys
const getClient = () => new GoogleGenAI({ apiKey });

/**
 * Generates the daily briefing for a specific date.
 * @param targetDate The date to fetch news for.
 * @param ageRange The user's age range for content safety.
 * @param excludeTitles List of article titles to exclude (for pagination/infinite scroll).
 */
export const fetchDailyBriefing = async (
    targetDate?: Date, 
    ageRange: AgeRange = AgeRange.ADULT,
    excludeTitles: string[] = []
): Promise<NewsArticle[]> => {
  const ai = getClient();
  
  // Default to yesterday if not provided
  const dateToFetch = targetDate || new Date(new Date().setDate(new Date().getDate() - 1));
  const dateStr = dateToFetch.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Age Appropriateness Logic
  let ageInstruction = "";
  if (ageRange === AgeRange.CHILD) {
      ageInstruction = "CRITICAL: The audience is children under 13. Strictly REMOVE any news about violent crime, sexual content, complex political scandals, or disturbing imagery. Focus on science, nature, technology, inspiring stories, and major positive world events. Use simple, friendly language.";
  } else if (ageRange === AgeRange.TEEN) {
      ageInstruction = "The audience is teenagers (13-17). Avoid graphic violence or overly explicit content. Focus on tech, culture, environment, and education along with major world news.";
  }

  // Exclusion logic for infinite scroll
  let excludeInstruction = "";
  if (excludeTitles.length > 0) {
      excludeInstruction = `
        DO NOT include stories that are similar to or duplicate the following titles:
        ${excludeTitles.map(t => `- "${t}"`).join('\n')}
        Find distinct, other news events from the same day.
      `;
  }

  // Prompt logic
  const prompt = `
    You are a senior news editor for a prestigious international news bureau.
    Task: Identify 8 ${excludeTitles.length > 0 ? 'ADDITIONAL' : 'top'} news events from ${dateStr}.
    
    CRITICAL SOURCE GUIDELINES:
    1. Use Google Search to verify facts.
    2. SOURCE FILTER: Use ONLY highly credible, established news organizations (e.g., Reuters, AP, BBC, NPR, Bloomberg, NYT, Al Jazeera).
    3. STRICTLY EXCLUDE: Tabloids, clickbait sites, unverified blogs, and social media rumors. If a story is not verified by a major outlet, do not include it.
    
    Context: ${ageInstruction}
    Exclusions: ${excludeInstruction}

    Requirements:
    1. Cover diverse topics: Politics, Technology, Science, Culture, Global, Business.
    2. Rank them by global importance (100 being highest).
    3. IMPORTANT: If a news story has a lot of coverage, high impact, or deep analysis available, give it a higher globalScore (90+).
    4. Return a strictly valid JSON array.
    5. Each item must have:
       - title (concise headline)
       - summary (2-3 sentences, clear and objective)
       - category (Global, Politics, Technology, Science, Culture, or Business)
       - globalScore (integer 1-100)
    
    Do NOT include markdown formatting (like \`\`\`json). Just the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "[]";
    
    // Clean potential markdown just in case
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let rawArticles: any[] = [];
    try {
        rawArticles = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse JSON from news generation", text);
        return [];
    }

    // Extract grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources: NewsSource[] = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || "Source",
        uri: chunk.web.uri
      }));

    // Map to domain model
    return rawArticles.map((art: any, index: number) => ({
      id: `news-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: art.title,
      summary: art.summary,
      category: art.category as Category,
      globalScore: art.globalScore,
      timestamp: dateStr,
      sources: webSources.slice(0, 3) // Attach generic sources found in grounding to all for this demo
    }));

  } catch (error) {
    console.error("Error fetching daily briefing:", error);
    return [];
  }
};

/**
 * Chat with context of the current article.
 */
export const sendChatMessage = async (
    history: { role: string; parts: { text: string }[] }[],
    userMessage: string,
    context?: string
): Promise<string> => {
    const ai = getClient();
    
    const systemInstruction = `
      You are a concise, direct news analyst for "Yesterday in Review".
      
      Your Role:
      - Answer questions about the news quickly.
      - Be objective and factual.
      - Keep responses short (under 3 sentences) unless asked for deep detail.
      
      Current User Context:
      ${context ? `The user is reading this article: "${context}". Focus answers on this.` : "The user is browsing the general feed."}
    `;

    try {
        const chat = ai.chats.create({
            model: "gemini-3-pro-preview",
            config: { systemInstruction },
            history: history,
        });

        const result = await chat.sendMessage({ message: userMessage });
        return result.text || "I couldn't process that request.";
    } catch (error) {
        console.error("Chat error", error);
        return "Connection error.";
    }
};

/**
 * Generates audio for a specific article based on mode.
 */
export const generateNewsAudio = async (
  article: NewsArticle,
  mode: TTSMode,
  audioContext: AudioContext
): Promise<AudioBuffer | null> => {
  const ai = getClient();

  let textToSay = "";
  let config: any = {
    responseModalities: [Modality.AUDIO],
  };

  // Prepare content based on mode
  if (mode === TTSMode.READ) {
    textToSay = `Here is the summary for: ${article.title}. ${article.summary}`;
    config.speechConfig = {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } // Deep, news anchor like
    };
  } else if (mode === TTSMode.PODCAST) {
    // Podcast: Lively, unscripted banter with a twist.
    textToSay = `
      Generate a candid, unscripted-style conversation between two podcasters, Alex and Sam.
      Topic: "${article.title}".
      
      Instructions:
      1. Do NOT just read the news summary.
      2. Alex (Host) sets the stage quickly.
      3. Sam (Guest) offers a "hot take", a surprising angle, or points out an irony in the situation.
      4. The tone should be energetic and slightly opinionated on all directions but factual. 
      5. Keep it under 1 minute.
    `;
    config.speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          { speaker: 'Sam', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        ]
      }
    };
  } else {
    // Storyteller: Dramatic narrative twist.
    textToSay = `
      Reimagine this news event as a scene from a dramatic story or movie.
      Event: "${article.title}: ${article.summary}"
      
      Instructions:
      1. Do NOT sound like a news reporter.
      2. Set the scene with sensory details.
      3. Create tension and narrative flow.
      4. Narrate it like a campfire tale, a sci-fi log, or a noir thriller depending on the vibe of the news.
      5. Keep it immersive and under 45 seconds.
    `;
    config.speechConfig = {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textToSay }] }],
      config: config
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    return await decodeAudioData(
      decodeBase64(base64Audio),
      audioContext
    );

  } catch (error) {
    console.error("TTS generation error:", error);
    return null;
  }
};