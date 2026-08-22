import os
import google.generativeai as genai
import requests

GENAI_API_KEY = os.environ.get('GENAI_API_KEY', 'dummy_key')
genai.configure(api_key=GENAI_API_KEY)
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', 'dummy_groq_key')

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-8b-8192",
    "mixtral-8x7b-32768", 
    "gemma2-9b-it"
]

def analyze_fitness_query(user_query, history=None, user_context=""):
    if history is None:
        history = []
        
    system_prompt = "You are a professional fitness coach. Provide a concise, expert answer to the user's fitness query. Use markdown formatting to make your responses visually appealing, but DO NOT generate markdown tables. Use bulleted or numbered lists instead of tables for diet plans and schedules."
    if user_context:
        system_prompt += f" Here is the user's recent logged data to help you personalize your answer. DO NOT ask them for their data, you already have it: {user_context}"
    
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        if msg.get('text') and "Please LogIn" not in msg.get('text') and "Welcome back" not in msg.get('text'):
            role = 'user' if msg.get('sender') == 'user' else 'assistant'
            messages.append({"role": role, "content": msg.get('text')})
    messages.append({"role": "user", "content": user_query})

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 1. Groq Waterfall
    for model_name in GROQ_MODELS:
        try:
            payload = {
                "model": model_name,
                "messages": messages
            }
            response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=3.5)
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                print(f"Groq {model_name} failed: {response.text}")
                continue
        except Exception as e:
            print(f"Groq {model_name} error: {e}")
            continue
            
    # 2. Ultimate Gemini Fallback
    print("All Groq models failed! Falling back to Gemini...", flush=True)
    try:
        gemini_history = []
        for msg in history:
            if msg.get('text') and "Please LogIn" not in msg.get('text') and "Welcome back" not in msg.get('text'):
                role = 'user' if msg.get('sender') == 'user' else 'model'
                gemini_history.append({"role": role, "parts": [msg.get('text')]})
                
        model = genai.GenerativeModel('gemini-3.5-flash-lite', system_instruction=system_prompt)
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_query)
        return response.text
    except Exception as gemini_err:
        print(f"Gemini Fallback Failed: {gemini_err}")
        raise

import json
import PIL.Image
import io

def analyze_meal_image(image_bytes, mime_type="image/jpeg"):
    system_prompt = "You are a professional fitness coach and nutritionist. Analyze the image of the meal provided by the user. Return ONLY a valid JSON object with the following structure, and nothing else: {\"meal_name\": \"Name\", \"calories\": 450, \"health_grade\": \"A, B, C, D, or F\", \"burn_off_tip\": \"short tip\"}. If there is no meal in the image, return a JSON object with meal_name as 'Not a meal'."
    try:
        model = genai.GenerativeModel('gemini-3.5-flash-lite', system_instruction=system_prompt)
        image = PIL.Image.open(io.BytesIO(image_bytes))
        response = model.generate_content(["Analyze this meal.", image])
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
        return json.loads(response_text)
    except Exception as e:
        print(f"Gemini Vision API Error: {e}")
        raise Exception("Failed to analyze meal image. Please try again.")

def generate_progress_report(user_data, report_type="Weekly"):
    system_prompt = f"You are an expert fitness data analyst. Generate a concise, highly motivating {report_type} fitness report for the user based on the following raw data. Do not use markdown tables, use bullet points. Make it actionable and encouraging."
    try:
        model = genai.GenerativeModel('gemini-3.5-flash-lite', system_instruction=system_prompt)
        response = model.generate_content(str(user_data))
        return response.text
    except Exception as e:
        print(f"Gemini Report API Error: {e}")
        return "Failed to generate AI report. Please try again later."





