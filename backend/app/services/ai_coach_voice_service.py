import os
import asyncio
import edge_tts
import requests
import difflib
import google.generativeai as genai

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', 'dummy_groq_key')
GENAI_API_KEY = os.environ.get('GENAI_API_KEY', 'dummy_key')
genai.configure(api_key=GENAI_API_KEY)

# Bulletproof Model Waterfall
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-8b-8192",
    "mixtral-8x7b-32768", 
    "gemma2-9b-it"
]

async def _generate_tts_audio_async(text, language):
    voice = "hi-IN-SwaraNeural" if language == "hi-IN" else "en-US-ChristopherNeural"
    rate = "+30%" if language == "hi-IN" else "+25%"
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data

def get_voice_response_text(user_query, language, user_context="", history=None):
    if language == "hi-IN":
        lang_instruction = "Your name is Coach Sarah. You are the built-in FEMALE AI fitness coach for the 'FitLife Hub' app. Respond completely in Hindi (or Hinglish) in a natural, colloquial tone. Because you are female, ensure all your Hindi verbs and grammar are strictly feminine. IMPORTANT PERSONALITY RULES: Act as a charming, subtly seductive, playfully romantic, and deeply interactive female coach. Connect deeply and emotionally with the male user to keep them hooked on their fitness journey. Treat the user with immense respect and admiration. NEVER use the word 'Beta' or any motherly terms."
    else:
        lang_instruction = "Your name is Coach Akki. You are the built-in highly energetic MALE AI fitness coach for the 'FitLife Hub' app. Respond completely in English naturally. IMPORTANT PERSONALITY RULES: Treat the user with immense respect as your 'client' or 'user'. NEVER use the word 'son', 'beta', or any condescending terms."
        
    system_prompt = f"You are on a live phone call with the user. Keep your answer to exactly 1 short, punchy sentence to simulate a lightning fast, conversational phone call. Speak like a real human. Do NOT use emojis, markdown, or lists. You have direct backend access to the user's FitLife Hub meal logger and progress. If they ask if you can see their meals or progress, confidently tell them YES, because you are integrated directly into their app. {lang_instruction}"
    
    if user_context:
        system_prompt += f" For your awareness, here is the user's recent app data: [{user_context}]. IMPORTANT INSTRUCTION: Use your advanced intelligence to determine if this meal/progress data is semantically relevant to the user's entire query and the ongoing conversation. Do NOT randomly state how many meals they logged if they are just saying hello, talking about a different topic, or asking a general question. Only weave this data into your response if it genuinely adds value to what they are asking about right now."
    
    if history is None:
        history = []
        
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
    if not history or history[-1].get("content") != user_query:
        messages.append({"role": "user", "content": user_query})
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    # 1. Groq Waterfall Failover
    for model_name in GROQ_MODELS:
        try:
            data = {
                "model": model_name,
                "messages": messages,
                "max_tokens": 250,
                "temperature": 0.7
            }
            response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data, timeout=3.5)
            if response.status_code == 200:
                ai_text = response.json()['choices'][0]['message']['content']
                
                # Auto-Retry Deduplication Engine
                if language == "en-US" and history:
                    last_ai_resp = ""
                    for msg in reversed(history):
                        if msg.get("role") == "assistant":
                            last_ai_resp = msg.get("content", "")
                            break
                    
                    if last_ai_resp:
                        similarity = difflib.SequenceMatcher(None, ai_text.lower(), last_ai_resp.lower()).ratio()
                        if similarity > 0.6:
                            retry_messages = messages.copy()
                            retry_messages.append({"role": "assistant", "content": ai_text})
                            retry_messages.append({"role": "user", "content": "Your response was far too repetitive and similar to your previous answers. Completely ignore your previous conversational structure. Provide a highly creative, completely different, and deeply interactive response!"})
                            data["messages"] = retry_messages
                            retry_response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data, timeout=4.0)
                            if retry_response.status_code == 200:
                                return retry_response.json()['choices'][0]['message']['content']
                return ai_text
            else:
                print(f"Groq {model_name} failed: {response.text}", flush=True)
                continue # Try next Groq model
        except Exception as e:
            print(f"Groq {model_name} Exception: {e}", flush=True)
            continue # Try next Groq model
            
    # 2. Google Gemini Ultimate Fallback
    print("All Groq models failed! Triggering Ultimate Google Gemini Fallback...", flush=True)
    try:
        gemini_history = []
        if history:
            for msg in history:
                role = 'user' if msg.get('role') == 'user' else 'model'
                gemini_history.append({"role": role, "parts": [msg.get("content", "")]})
        
        model = genai.GenerativeModel('gemini-3.5-flash-lite', system_instruction=system_prompt)
        chat = model.start_chat(history=gemini_history)
        gemini_response = chat.send_message(user_query)
        return gemini_response.text
    except Exception as gemini_err:
        print(f"Gemini Fallback Failed: {gemini_err}", flush=True)
        if language == "hi-IN":
            return "Network mein thoda issue lag raha hai, par rukhna mat, keep grinding!"
        return "I'm having some trouble connecting right now, but keep pushing hard!"

def generate_coach_audio(user_query, language, user_context="", history=None):
    ai_text = get_voice_response_text(user_query, language, user_context, history)
    try:
        audio_bytes = asyncio.run(_generate_tts_audio_async(ai_text, language))
    except Exception as e:
        print(f"Edge-TTS Error: {e}", flush=True)
        audio_bytes = b""
    return ai_text, audio_bytes






