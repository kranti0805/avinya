import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmployeeStats {
  id: string;
  full_name: string;
  total_requests: number;
  accepted: number;
  rejected: number;
  pending: number;
  high_priority_completed?: number;
}

interface EmployeeSuggestion {
  id: string;
  suggestion: 'salary_review' | 'notice' | null;
  reason: string;
}

async function analyzeWithGemini(employees: EmployeeStats[]): Promise<EmployeeSuggestion[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey || employees.length === 0) {
    return employees.map(e => ({ id: e.id, suggestion: null, reason: '' }));
  }

  const prompt = `You are an HR analyst. Given these employee request statistics, suggest which employees deserve a salary review (hardworking, many accepted requests, high engagement) and which need a performance notice (low output, many rejected, or very few requests indicating poor engagement).

Employee stats (JSON array):
${JSON.stringify(employees, null, 2)}

Respond with ONLY a JSON array. Each item: {"id":"<employee uuid>","suggestion":"salary_review"|"notice"|null,"reason":"brief reason"}. Use "salary_review" for strong performers, "notice" for underperformers, null if no action needed. Keep reasons professional and one short sentence.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });
    if (!res.ok) return employees.map(e => ({ id: e.id, suggestion: null, reason: '' }));
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return employees.map(e => ({ id: e.id, suggestion: null, reason: '' }));
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    const arr = Array.isArray(parsed) ? parsed : [];
    const idSet = new Set(employees.map(e => e.id));
    return arr
      .filter((x: { id: string }) => idSet.has(x.id))
      .map((x: { id: string; suggestion?: string; reason?: string }) => ({
        id: x.id,
        suggestion: x.suggestion === 'salary_review' || x.suggestion === 'notice' ? x.suggestion : null,
        reason: typeof x.reason === 'string' ? x.reason : '',
      }));
  } catch {
    return employees.map(e => ({ id: e.id, suggestion: null, reason: '' }));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { employees } = await req.json() as { employees: EmployeeStats[] };
    if (!Array.isArray(employees)) {
      return new Response(JSON.stringify({ error: 'employees array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const suggestions = await analyzeWithGemini(employees);
    return new Response(JSON.stringify({ suggestions }), {
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
