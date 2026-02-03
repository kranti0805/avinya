# Gemini API Setup (Optional)

For AI-powered request prioritization and employee performance insights:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. In Supabase Dashboard → Edge Functions → Secrets, add:
   - `GEMINI_API_KEY` = AIzaSyCmRWYqrMG-siZ_LOIdyr8Xq5eZzN8qhtA
3. Deploy the edge functions (if using Supabase CLI):
   ```bash
   supabase functions deploy categorize-request
   supabase functions deploy analyze-employees
   ```

If `GEMINI_API_KEY` is not set, the app falls back to keyword-based categorization and skips AI employee suggestions.
