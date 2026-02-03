import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  message: string;
  request_type?: string;
}

/** Full AI result: classification + explanation + decision support */
interface AIResult {
  category: 'Leave' | 'Funds' | 'Promotion';
  priority: 'High' | 'Medium' | 'Low';
  category_reason: string;
  priority_reason: string;
  intent_signals: string[];
  confidence_score: number;
  suggested_action: 'Approve' | 'Review' | 'Escalate';
  risk_level: 'Low' | 'Medium' | 'High';
  business_impact: string;
}

function fallbackCategorize(message: string): AIResult {
  const lowerMessage = message.toLowerCase();
  let category: 'Leave' | 'Funds' | 'Promotion' = 'Leave';
  let priority: 'High' | 'Medium' | 'Low' = 'Medium';

  const leaveKeywords = ['leave', 'vacation', 'sick', 'absent', 'time off', 'pto', 'holiday', 'day off', 'medical'];
  const fundsKeywords = ['fund', 'money', 'budget', 'expense', 'reimbursement', 'payment', 'purchase', 'cost', 'financial', 'allowance'];
  const promotionKeywords = ['promotion', 'raise', 'salary', 'career', 'position', 'advancement', 'growth', 'increment', 'appraisal'];
  const highPriorityKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'important', 'pressing'];
  const lowPriorityKeywords = ['whenever', 'no rush', 'flexible', 'eventually', 'someday'];

  let leaveScore = 0, fundsScore = 0, promotionScore = 0;
  const detectedSignals: string[] = [];
  leaveKeywords.forEach(k => {
    if (lowerMessage.includes(k)) { leaveScore++; detectedSignals.push(k); }
  });
  fundsKeywords.forEach(k => {
    if (lowerMessage.includes(k)) { fundsScore++; detectedSignals.push(k); }
  });
  promotionKeywords.forEach(k => {
    if (lowerMessage.includes(k)) { promotionScore++; detectedSignals.push(k); }
  });

  if (fundsScore > leaveScore && fundsScore > promotionScore) category = 'Funds';
  else if (promotionScore > leaveScore && promotionScore > fundsScore) category = 'Promotion';
  else category = 'Leave';

  if (highPriorityKeywords.some(k => lowerMessage.includes(k))) {
    priority = 'High';
    highPriorityKeywords.forEach(k => { if (lowerMessage.includes(k)) detectedSignals.push(k); });
  } else if (lowPriorityKeywords.some(k => lowerMessage.includes(k))) {
    priority = 'Low';
    lowPriorityKeywords.forEach(k => { if (lowerMessage.includes(k)) detectedSignals.push(k); });
  }

  const categoryReasons: Record<string, string> = {
    Leave: 'Keywords indicate time-off or absence (leave, vacation, sick, PTO, etc.).',
    Funds: 'Keywords indicate financial request (funds, expense, reimbursement, etc.).',
    Promotion: 'Keywords indicate career or compensation (promotion, raise, advancement, etc.).',
  };
  const priorityReasons: Record<string, string> = {
    High: 'Urgency keywords detected (urgent, ASAP, emergency).',
    Low: 'Flexibility keywords detected (no rush, flexible, whenever).',
    Medium: 'No strong urgency or flexibility signals; defaulting to medium priority.',
  };

  const riskLevel = priority === 'High' ? 'Medium' : priority === 'Low' ? 'Low' : 'Low';
  const suggestedAction = priority === 'High' ? 'Review' as const : 'Approve' as const;
  const businessImpact = priority === 'High'
    ? 'May impact team availability or deadlines; recommend quick review.'
    : category === 'Leave' ? 'Standard leave request; check team coverage if needed.'
    : 'Routine request; low operational impact.';

  return {
    category,
    priority,
    category_reason: categoryReasons[category],
    priority_reason: priorityReasons[priority],
    intent_signals: [...new Set(detectedSignals)].slice(0, 10),
    confidence_score: 70,
    suggested_action: suggestedAction,
    risk_level: riskLevel,
    business_impact: businessImpact,
  };
}

async function categorizeWithGemini(message: string, requestType?: string): Promise<AIResult | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  const prompt = `You are an enterprise workflow classifier. Classify this employee request and provide transparent explanations.

Request type: ${requestType || 'Not specified'}
Request message: "${message}"

Respond with ONLY valid JSON (no markdown). Use this exact structure:
{
  "category": "Leave" | "Funds" | "Promotion",
  "priority": "High" | "Medium" | "Low",
  "category_reason": "One sentence explaining why this category was chosen.",
  "priority_reason": "One sentence explaining why this priority was chosen.",
  "intent_signals": ["keyword1", "keyword2"],
  "confidence_score": 0-100,
  "suggested_action": "Approve" | "Review" | "Escalate",
  "risk_level": "Low" | "Medium" | "High",
  "business_impact": "One sentence on business/team impact (e.g. high impact on availability)."
}

Rules:
- category: Leave (time off, sick, vacation), Funds (money, expense), Promotion (raise, career).
- priority: High = urgent/ASAP/emergency, Low = flexible/no rush, else Medium.
- intent_signals: list 2-6 words or phrases from the message that drove the classification.
- suggested_action: Escalate only for high-risk or ambiguous; Review for high-priority; Approve for clear low-risk.
- risk_level: based on urgency and impact.
- business_impact: human-readable note for the manager.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    const category = ['Leave', 'Funds', 'Promotion'].includes(parsed.category) ? parsed.category : 'Leave';
    const priority = ['High', 'Medium', 'Low'].includes(parsed.priority) ? parsed.priority : 'Medium';
    const suggested = ['Approve', 'Review', 'Escalate'].includes(parsed.suggested_action) ? parsed.suggested_action : 'Review';
    const risk = ['Low', 'Medium', 'High'].includes(parsed.risk_level) ? parsed.risk_level : 'Low';
    return {
      category,
      priority,
      category_reason: typeof parsed.category_reason === 'string' ? parsed.category_reason : 'AI classification based on request content.',
      priority_reason: typeof parsed.priority_reason === 'string' ? parsed.priority_reason : 'Priority based on urgency signals.',
      intent_signals: Array.isArray(parsed.intent_signals) ? parsed.intent_signals.slice(0, 10) : [],
      confidence_score: typeof parsed.confidence_score === 'number' ? Math.min(100, Math.max(0, parsed.confidence_score)) : 75,
      suggested_action: suggested,
      risk_level: risk,
      business_impact: typeof parsed.business_impact === 'string' ? parsed.business_impact : 'Review request for impact.',
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, request_type }: RequestPayload = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiResult = await categorizeWithGemini(message.trim(), request_type);
    const result = geminiResult ?? fallbackCategorize(message);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
