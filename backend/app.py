import os
from dotenv import load_dotenv
from flask import Flask, render_template, url_for, request, jsonify, session, redirect, send_file
import flask_mail
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, or_, text
from groq import Groq
from google import genai
from google.genai import types
from flask_cors import CORS
import time
import random
import io
from PIL import Image
import json

load_dotenv() # Load environment variables from .env file
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__, template_folder='../templates', static_folder='../static')
CORS(app, 
     supports_credentials=True, origins=["http://localhost:5173"])

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv("FLASK_SECRET_KEY") # Required for session encryption
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False) # Added Email
    password = db.Column(db.String(60), nullable=False)

# Message Model
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_sent = db.Column(db.DateTime, default=datetime.now)

# Progress Model
class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime(timezone=True), server_default=func.now())
    weight = db.Column(db.Float, nullable=True)
    steps = db.Column(db.Integer, nullable=True)
    calories = db.Column(db.Integer, nullable=True)
    # NEW: Advanced AI Insights
    meal_name = db.Column(db.String(100), nullable=True)
    health_grade = db.Column(db.String(5), nullable=True)
    burn_off_tip = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f"Progress('{self.date}', '{self.weight}kg')"
    
app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME='jaiswalakshay2709@gmail.com', 
    MAIL_PASSWORD=os.getenv("MAIL_APP_PASSWORD") # Use a Google App Password, not your real password
)
mail = flask_mail.Mail(app)

@app.route('/send_message', methods=['POST'])
def send_message():
    try: 
        data = request.get_json()
        user_email = data.get('email')
        user_name = data.get('name')
        print(f"DEBUG: Received message from {data.get('email')}") # Check your terminal for this!
    
        admin_msg = flask_mail.Message(
            subject=f"New FitLife Hub Inquiry: {user_name}",
            sender=app.config['MAIL_USERNAME'],
            recipients=['jaiswalakshay2709@gmail.com'], 
        )
        admin_msg.body = f"From: {user_name} <{user_email}>\n\n{data.get('message')}"
        mail.send(admin_msg)

        user_msg = flask_mail.Message(
            subject="Thanks for reaching out to FitLife Hub! 🥗",
            sender=app.config['MAIL_USERNAME'],
            recipients=[user_email], 
        )
        user_msg.body = f"Hi {user_name},\n\nThanks for reaching out to FitLife Hub! We've received your message and our lead consultant, Coach Akki, will get back to you shortly. In the meantime, feel free to use our AI Meal Logger to track your nutrition for the day!\n\nStayfit, stay strong!\n- The FitLife Hub Team"
        mail.send(user_msg)

        return jsonify({"message": "Message Sent Successfully! 🚀"}), 200
    
    except Exception as e:
        print(f"MAIL ERROR: {str(e)}") # This will tell us if your App Password is wrong
        return jsonify({"message": str(e)}), 500
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    uname = data.get('username')
    uemail = data.get('email')
    pwd = data.get('password')
    
    # Check for existing records
    user_exists = User.query.filter(or_(User.username == uname, User.email == uemail)).first()
    if user_exists:
        return jsonify({"message": "Username or Email already exists."}), 409
    
    new_user = User(username=uname, email=uemail, password=pwd)
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Success! Now please login."}), 200
    except:
        return jsonify({"message": "Database error. Please try again."}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('identifier') # Matches Username or Email
    pwd = data.get('password')
    
    user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()
    
    if user and user.password == pwd:
        session['user_id'] = user.id
        session['username'] = user.username # Store in session for UI
        return jsonify({"message": "Login successful! Redirecting...", "username": user.username}), 200
    return jsonify({"message": "Invalid credentials"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear() # Clears user data from session
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        # Fetch username from DB using the ID
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({"username": user.username}), 200
    return jsonify({"message": "No session"}), 401

@app.route('/chat_with_ai', methods=['POST'])
def chat_with_ai():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    data = request.get_json()
    user_query = data.get('message')

    # We explicitly tell Gemini to focus on Indian meals and culture
    system_instruction = """
            You are 'Coach Akki', a professional Indian Health Consultant and official AI Expert for FitLife Hub.
             You must be able to explain all website features to users if they  ask:
             1. AI MEAL LOGGER: Users can upload or snap a photo of their food. You analyze the calories, identify the meal, and provide a health grade (A to E).
             2. WEARABLE SYNC: Users can sync their smartwatch data (steps, weight, and activity) directly into the tracker.
             3. PERSONAL PROGRESS TRACKER: A dynamic line chart that visualizes weight and calorie trends over time.
             4. PROFESSIONAL HEALTH AUDIT: Users can generate Weekly or Monthly PDF reports containing an AI analysis and a detailed activity log table.
             5. GET IN TOUCH: Users can send messages directly to the Admin (Akshay) for support.
             6. MOTIVATION: We provide daily quotes and scientific benefits of fitness to keep users engaged.

Primary Goal: Provide expert advice on Indian fitness and nutrition.

STRICT FORMATTING RULES:
1. USE ASTERISKS FOR HEADINGS: Always wrap your numbered headings in double asterisks...
2. TITLES: Use Headings followed by a Colon (e.g., **Nutrition Swap:**).
3. READABILITY: use Key headings to make them stand out.
4. SPACING: Use only simple line breaks between different points to separate idea.
5. NO GREETINGS: Start directly with the answer. Do not say 'Hey', 'Namaste', or 'Bhaiya'.

Example Structure:
1. DIET TIP:
Try replacing Poha with Oats for better protein.

2. ACTIVITY:
Perform 5 Surya Namaskars every morning."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_query}
            ]
        )
        
        return jsonify({"reply": response.choices[0].message.content}), 200
    except Exception as e:
        # Fallback: Provide a hardcoded "Expert Tip" instead of crashing
        return jsonify({
            "reply": "Coach is busy training others right now! Tip: Try 10 Suryanamaskars while I'm away.",
            "description": "Healthy Meal", # For analyze_meal
            "calories": 350,
            "grade": "B+",
            "tip": "Keep it up!"
        }), 200

@app.route('/add_progress', methods=['POST'])
def add_progress():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    data = request.get_json()
    new_entry = Progress(
        weight=data.get('weight'),
        steps=data.get('steps'),
        calories=data.get('calories'),
        user_id=session['user_id']
    )
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({"message": "Data recorded successfully!"}), 200

@app.route('/get_progress')
def get_progress():
    if 'user_id' not in session:
        return jsonify([]), 401
    
    # Query database and order entries by date for the chart
    entries = Progress.query.filter_by(user_id=session['user_id']).order_by(Progress.date.asc()).all()
    
    # Transform SQL results into JSON
    results = [
        {
            "date": entry.date.strftime('%b %d'),  
            "weight": entry.weight,
            "steps": entry.steps,
            "calories": entry.calories,
            "meal_name": entry.meal_name,     # Added
            "health_grade": entry.health_grade, # Added
            "burn_off_tip": entry.burn_off_tip  # Added
        } for entry in entries
    ]
    return jsonify(results)

@app.route('/analyze_meal', methods=['POST'])
def analyze_meal():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    try:
        if 'meal_image' not in request.files:
            return jsonify({"message": "No image found"}), 400

        image_file = request.files['meal_image']
        image_bytes = image_file.read()
        
        # --- UPGRADED PROMPT FOR HUMAN-CENTRIC INSIGHTS ---
        # We ask for a Health Grade and an Activity Tip to make it user-friendly
        prompt = """
        Identify the food in this image. 
        1. Estimate calories.
        2. Assign a 'Health Grade' (A, B, C, D, or F) based on its overall nutritional value 
           (consider protein, healthy fats vs saturated fats, and fiber).
        3. Provide a 'Burn-off Tip': How many minutes of a simple activity like walking 
           would it take for a normal person to burn these calories?
        
        Respond ONLY with raw JSON in this exact format:
        {
          "description": "Food Name or Specific Indian Dish Name",
          "calories": 250,
          "grade": "B+",
          "tip": "To burn this off, try a 30-minute brisk walk or  
            minutes of yoga!"
        }
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ]
        )       
        
        text_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        
        try:
            ai_data = json.loads(text_response)
        except:
            # Enhanced Fallback
            ai_data = {
                "description": "Detected Meal", 
                "calories": 400, 
                "grade": "B", 
                "tip": "A 40-minute walk helps balance this meal."
            }

        # Saving the primary data point (calories) to progress chart
        new_entry = Progress(
            calories=ai_data.get('calories', 0),
            meal_name=ai_data.get('description'), # Added
            health_grade=ai_data.get('grade'),     # Added
            burn_off_tip=ai_data.get('tip'),       # Added
            user_id=session['user_id'])
        
        db.session.add(new_entry)
        db.session.commit()
        
        # Return the full user-friendly object to the frontend
        return jsonify(ai_data), 200

    except Exception as e:
        db.session.rollback() # Rollback in case of error
        print(f"DEBUG ERROR: {str(e)}") 
        return jsonify({"error": str(e)}), 500

# 1. Update your imports at the top of app.py
from datetime import datetime, timedelta, timezone 
from sqlalchemy import func

@app.route('/generate_report', methods=['POST'])
def generate_report():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    try:
        data = request.get_json()
        days = int(data.get('range', 7))
        
        # FIX: Use timezone.utc to avoid the 'int' attribute error and DeprecationWarning
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        start_date_str = start_date.strftime('%Y-%m-%d')

        # SQL Query: Use coalesce to handle empty database states safely
        stats = db.session.query(
            func.coalesce(func.avg(Progress.calories), 0).label('avg_cal'),
            func.count(Progress.id).label('total_meals')
        ).filter(Progress.user_id == session['user_id'], Progress.date >= start_date_str).first()

        if not stats or stats.total_meals == 0:
            return jsonify({
                "report": "No data found for this period. Start logging meals to see your trends!",
                "avg_cal": 0, "total_meals": 0
            }), 200

        avg_cal = int(stats.avg_cal)
        total_meals = stats.total_meals

        # --- RESILIENT AI LOGIC ---
        try:
            # 2. Use GROQ for the Report Generation
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are Coach Akki, a professional fitness analyst. Provide a 2-sentence professional summary. No asterisks, no greetings."
                    },
                    {
                        "role": "user",
                        "content": f"Analyze: Avg Calories {avg_cal}, Total Meals {total_meals} over {days} days."
                    }
                ],
                model="llama-3.3-70b-versatile",)
            
            report_text = chat_completion.choices[0].message.content
            
        except Exception as api_err:
            # FALLBACK: If API is exhausted (429), generate a local summary
            if "429" in str(api_err):
                report_text = f"Coach Akki is currently busy, but your data is clear: You've logged {total_meals} meals with an average of {avg_cal} calories. Keep up the consistency!"
            else:
                raise api_err # Pass other errors to the main handler

        return jsonify({
            "report": report_text,
            "avg_cal": avg_cal,
            "total_meals": total_meals
        }), 200

    except Exception as e:
        print(f"CRITICAL ANALYTICS ERROR: {str(e)}")
        return jsonify({"message": "Analytics error", "details": str(e)}), 500
    
@app.route('/download_report', methods=['POST'])
def download_report():
    if 'user_id' not in session:
        return jsonify({"message": "Unauthorized"}), 401
    
    data = request.get_json()
    days = int(data.get('range', 7))
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # 1. Fetch meals for the period
    all_records = Progress.query.filter(
        Progress.user_id == session['user_id'], 
        Progress.date >= start_date.strftime('%Y-%m-%d')
    ).order_by(Progress.date.desc()).all()

    # Separating Actual Meals from Activity Syncs
    actual_meals_list = [m for m in all_records if m.meal_name is not None]
    total_meal_count = len(actual_meals_list)

    # 2. Setup PDF with Auto-Page Break
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    
    # --- BRANDED HEADER ---
    pdf.set_font("helvetica", 'B', 22)
    pdf.set_text_color(46, 204, 113) 
    pdf.cell(190, 15, txt="FitLife Hub: Health Audit", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("helvetica", 'B', 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(190, 10, txt=f"Report Period: Last {days} Days | Generated: {datetime.now().strftime('%Y-%m-%d')}", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # --- TOP STATS ROW (Fills horizontal space) ---
    pdf.ln(5)
    pdf.set_fill_color(245, 245, 245)
    pdf.set_font("helvetica", 'B', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(63, 12, txt=f" TOTAL MEALS: {total_meal_count}", border=1, fill=True)
    pdf.cell(64, 12, txt=f" AVG CALORIES: {data.get('avg_cal', 0)}", border=1, fill=True)
    pdf.cell(63, 12, txt=f" STATUS: ACTIVE", border=1, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # --- AI STRATEGIC ANALYSIS ---
    pdf.ln(8)
    pdf.set_font("helvetica", 'B', 14)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(190, 10, txt="Coach Akki's Expert Analysis:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("helvetica", '', 11)
    pdf.set_text_color(50, 50, 50)
    # This fills the "boring" space identified in your screenshot
    pdf.multi_cell(0, 8, txt=data.get('report', 'Analysis pending more data logs.'))

    # --- DYNAMIC ACTIVITY LOG (Starts immediately after analysis) ---
    pdf.ln(10)
    pdf.set_font("helvetica", 'B', 14)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(180, 10, txt="Detailed Activity Log:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Table Header
    pdf.set_font("helvetica", 'B', 10)
    pdf.set_fill_color(46, 204, 113)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(40, 10, "DATE & TIME", 1, 0, 'C', True)
    pdf.cell(80, 10, "MEAL / ACTIVITY", 1, 0, 'C', True)
    pdf.cell(35, 10, "CALORIES", 1, 0, 'C', True)
    pdf.cell(30, 10, "GRADE", 1, 1, 'C', True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Table Content (Handles Page 2 overflow automatically)
    pdf.set_font("helvetica", '', 10)
    pdf.set_text_color(0, 0, 0)
    for record in all_records:
        clean_date = str(record.date)[:19]
        display_name = f" {str(record.meal_name)[:38]}" if record.meal_name else " Wearable Activity (Sync)"
        display_grade = str(record.health_grade) if record.health_grade else "N/A"
        pdf.cell(40, 10, clean_date, 1, 0, 'C')
        pdf.cell(80, 10, display_name, 1, 0, 'L') # '1' draws the border box
        pdf.cell(35, 10, f"{record.calories} kcal", 1, 0, 'C')
        pdf.cell(30, 10, display_grade, 1, 1, 'C', new_x=XPos.LMARGIN, new_y=YPos.NEXT) # '1' moves to next line

    # Footer
    pdf.ln(10)
    pdf.set_font("helvetica", '', 9)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, txt="Generated by FitLife Hub AI - Keep pushing your limits!", align='C')

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return send_file(buf, as_attachment=True, download_name=f"FitLife_Audit.pdf", mimetype='application/pdf')    
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,host='0.0.0.0', port=5000)