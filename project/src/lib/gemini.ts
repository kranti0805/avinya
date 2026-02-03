import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debug: Check if API key is loaded
if (!API_KEY) {
    console.error('❌ VITE_GEMINI_API_KEY is not defined in environment variables!');
    console.error('Please check your .env file and restart the dev server.');
} else if (!API_KEY.startsWith('AIza')) {
    console.warn('⚠️ Gemini API key format looks incorrect. Should start with "AIza"');
} else {
    console.log('\u2705 Gemini API Key loaded successfully');
}

// Initialize if key exists, otherwise null
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface AIAnalysisResult {
    priority: 'High' | 'Medium' | 'Low';
    risk_level: 'High' | 'Medium' | 'Low';
    confidence_score: number;
    priority_reason: string;
    category_reason: string;
    business_impact: string;
    suggested_action: string;
    intent_signals: string[];
}

// Cache for available models - fetched once per session
let availableModelsCache: string[] | null = null;

/**
 * Fetch list of available models from the Gemini API
 */
async function listAvailableModels(): Promise<string[]> {
    if (availableModelsCache) {
        return availableModelsCache;
    }

    if (!API_KEY) {
        return [];
    }

    try {
        // Use the stable v1 API endpoint to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
        );

        if (!response.ok) {
            console.error(`\u274c Failed to list models: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        const models = data.models || [];
        const modelNames = models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));

        console.log('\u2705 Available models from API:', modelNames.join(', '));
        availableModelsCache = modelNames;
        return modelNames;
    } catch (error: any) {
        console.error('\u274c Error listing models:', error?.message);
        return [];
    }
}

/**
 * Tries to use the Gemini API with available models
 */
async function tryGeminiAPI(prompt: string): Promise<string | null> {
    if (!genAI) {
        return null;
    }

    // First, discover available models
    console.log('\ud83d\udd0d Discovering available Gemini models...');
    const availableModels = await listAvailableModels();

    if (availableModels.length === 0) {
        console.warn('\u26a0\ufe0f No models available or failed to list models');
        // Fallback to trying known models
        const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        console.log('\ud83d\udd04 Trying fallback models:', fallbackModels.join(', '));

        for (const modelName of fallbackModels) {
            try {
                console.log(`\ud83d\udd04 Trying fallback model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                console.log(`\u2705 SUCCESS with fallback model: ${modelName}`);
                return text;
            } catch (error: any) {
                console.log(`\u274c Failed with ${modelName}`);
            }
        }
        return null;
    }

    // Try discovered models in preferred order
    const preferredOrder = availableModels.filter(m =>
        m.includes('flash') || m.includes('pro')
    ).sort((a, b) => {
        // Prefer flash over pro (faster)
        if (a.includes('flash') && !b.includes('flash')) return -1;
        if (!a.includes('flash') && b.includes('flash')) return 1;
        return 0;
    });

    for (const modelName of preferredOrder) {
        try {
            console.log(`\ud83d\udd04 Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(`\u2705 SUCCESS with model: ${modelName}`);
            return text;
        } catch (error: any) {
            console.log(`\u274c Failed with ${modelName}: ${error?.message?.substring(0, 80)}`);
        }
    }

    return null;
}

export async function analyzeRequestWithGemini(
    reason: string,
    type: string,
    employeeRole: string = 'employee'
): Promise<AIAnalysisResult | null> {
    console.log('\ud83e\udd16 Attempting AI analysis...');
    console.log('  - Request type:', type);
    console.log('  - Employee role:', employeeRole);
    console.log('  - Reason length:', reason.length, 'chars');

    if (!genAI) {
        console.error('\u274c Gemini API not initialized - API key missing!');
        return null;
    }

    // Build prompt
    const prompt = `You are an AI HR Assistant analyzing an employee request.
      
Request Type: ${type}
Employee Role: ${employeeRole}
Reason/Description: "${reason}"

Analyze this request and provide a strict JSON response ONLY (no markdown, no explanation).

Output JSON format:
{
  "priority": "High" | "Medium" | "Low",
  "risk_level": "High" | "Medium" | "Low",
  "confidence_score": 0.0-1.0,
  "priority_reason": "Brief explanation",
  "category_reason": "Brief explanation",
  "business_impact": "Impact description",
  "suggested_action": "Recommended action",
  "intent_signals": ["signal1", "signal2"]
}`;

    try {
        console.log('\ud83d\udce1 Calling Gemini API...');
        const text = await tryGeminiAPI(prompt);

        if (!text) {
            console.warn('\u26a0\ufe0f All Gemini models failed!');
            return null;
        }

        console.log('\ud83d\udcc4 Raw response (first 200 chars):', text.substring(0, 200));

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(jsonStr) as AIAnalysisResult;
            console.log('\u2705 Successfully parsed AI analysis from Gemini:');
            console.log('  - Priority:', parsed.priority);
            console.log('  - Risk Level:', parsed.risk_level);
            console.log('  - Confidence:', parsed.confidence_score);
            console.log('  - Intent signals:', parsed.intent_signals?.join(', '));
            return parsed;
        } catch (parseError) {
            console.error('\u274c JSON Parse Error:', parseError);
            console.error('Failed to parse text:', jsonStr);
            return null;
        }
    } catch (error: any) {
        console.error('\u274c Unexpected error:', error?.message);
        return null;
    }
}
