import os
import sys
import google.generativeai as genai

genai.configure(api_key='AIzaSyC2t_3VdlfpPLLH1ZERrHGDj7tFexXbSVM')

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Supported Model: {m.name}")
except Exception as e:
    import traceback
    traceback.print_exc()
