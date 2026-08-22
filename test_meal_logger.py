import os
import sys
import PIL.Image
import io
import google.generativeai as genai

genai.configure(api_key='AIzaSyC2t_3VdlfpPLLH1ZERrHGDj7tFexXbSVM')
model = genai.GenerativeModel('gemini-3.5-flash-lite')

img = PIL.Image.new('RGB', (100, 100), color='red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_bytes = img_byte_arr.getvalue()

try:
    response = model.generate_content(["Analyze this meal.", PIL.Image.open(io.BytesIO(img_bytes))])
    print('Success:', response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
