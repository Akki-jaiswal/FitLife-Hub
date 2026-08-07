import os
import google.generativeai as genai
import requests

# Set up Gemini
GENAI_API_KEY = os.environ.get('GENAI_API_KEY', 'dummy_key')
genai.configure(api_key=GENAI_API_KEY)

# Set up Groq (Hypothetical)
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', 'dummy_groq_key')

def analyze_fitness_query(user_query, history=None, user_context=""):
    if history is None:
        history = []
        
    system_prompt = "You are a professional fitness coach. Provide a concise, expert answer to the user's fitness query. Use markdown formatting to make your responses visually appealing, but DO NOT generate markdown tables. Use bulleted or numbered lists instead of tables for diet plans and schedules."
    if user_context:
        system_prompt += f" Here is the user's recent logged data to help you personalize your answer. DO NOT ask them for their data, you already have it: {user_context}"
    
    # Try Groq API first (Fastest)
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            # Skip welcome message or empty messages
            if msg.get('text') and "Please LogIn" not in msg.get('text') and "Welcome back" not in msg.get('text'):
                role = 'user' if msg.get('sender') == 'user' else 'assistant'
                messages.append({"role": role, "content": msg.get('text')})
        messages.append({"role": "user", "content": user_query})
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": messages
        }
        # We set a low timeout to fail fast
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=3.0)
        
        if response.status_code == 200:
            data = response.json()
            return data['choices'][0]['message']['content']
        else:
            raise Exception(f"Groq API returned {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Groq Failover Triggered! Error: {e}. Falling back to Google Gemini...")
        
        gemini_history = []
        for msg in history:
            if msg.get('text') and "Please LogIn" not in msg.get('text') and "Welcome back" not in msg.get('text'):
                role = 'user' if msg.get('sender') == 'user' else 'model'
                gemini_history.append({"role": role, "parts": [msg.get('text')]})
                
        # Fallback to Google Gemini
        try:
            model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=system_prompt)
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
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=system_prompt)
        prompt = "Analyze this meal image and return the JSON."
        
        # Open with PIL
        img = PIL.Image.open(io.BytesIO(image_bytes))
        
        response = model.generate_content([prompt, img])
        text = response.text.strip()
        print("RAW MODEL OUTPUT:", text)
        
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Vision API Error: {e}")
        return {
            "meal_name": "Unrecognized Meal",
            "calories": 0,
            "health_grade": "N/A",
            "burn_off_tip": "Try uploading a clearer image."
        }
