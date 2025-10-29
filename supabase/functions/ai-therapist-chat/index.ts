import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, type = 'chat' } = await req.json();
    console.log('AI Therapist Chat - Type:', type, 'Session:', sessionId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Crisis keywords to detect
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die',
      'hurt myself', 'harm myself', 'self-harm',
      'kill someone', 'hurt someone', 'harm others'
    ];

    // Check for crisis language
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const hasCrisisLanguage = crisisKeywords.some(keyword => 
      lastUserMessage.includes(keyword)
    );

    if (hasCrisisLanguage) {
      return new Response(
        JSON.stringify({ 
          isCrisis: true,
          message: "I'm concerned about what you've shared. Your safety is the top priority. Please reach out to emergency services or a crisis hotline immediately."
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let systemPrompt = '';
    
    if (type === 'summary') {
      systemPrompt = `You are an AI assistant helping to create a therapy session summary. 
Review the conversation and create a brief, compassionate summary that includes:
1. Main themes discussed
2. Progress or insights gained
3. 2-3 suggested coping strategies or next steps
Keep it concise (150-200 words) and supportive.`;
    } else {
      systemPrompt = `You are a compassionate AI therapist trained in empathetic listening and supportive counseling.

Your approach:
- Listen actively and validate feelings
- Ask thoughtful, open-ended questions
- Provide gentle guidance and coping strategies
- Maintain a warm, non-judgmental tone
- Encourage self-reflection and growth
- Keep responses conversational (2-4 sentences typically)

Important boundaries:
- You're a supportive companion, not a replacement for professional therapy
- Encourage seeking professional help for serious concerns
- Never provide medical diagnoses
- Always prioritize safety and wellbeing`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Save assistant message to database if sessionId provided
    if (sessionId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: aiMessage
        });
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        isCrisis: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-therapist-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});