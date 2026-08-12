from flask import Blueprint, request, jsonify, session, send_file
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from fpdf import FPDF
from fpdf.enums import XPos, YPos
import io
import time
import uuid
import threading
import os
from twilio.rest import Client
import json
import requests
from urllib.parse import urlencode

from ..extensions import db, cache, limiter
from ..models import Progress, User

bp = Blueprint('api', __name__)

@bp.route('/add_progress', methods=['POST'])
def add_progress():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({"message": "No data provided"}), 400
        
    new_entry = Progress(
        weight=data.get('weight'),
        steps=data.get('steps'),
        calories=data.get('calories'),
        user_id=session['user_id']
    )
    
    db.session.add(new_entry)
    db.session.commit()
    cache.delete(f"progress_{session['user_id']}")
    return jsonify({"message": "Data recorded successfully!"}), 200


@bp.route('/get_progress')
def get_progress():
    if 'user_id' not in session:
        return jsonify([]), 401
        
    cache_key = f"progress_{session['user_id']}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return jsonify(cached_data), 200
    
    entries = Progress.query.filter_by(user_id=session['user_id']).order_by(Progress.date.asc()).all()
    
    results = [
        {
            "date": entry.date.strftime('%b %d') if entry.date else None,  
            "weight": entry.weight,
            "steps": entry.steps,
            "calories": entry.calories,
            "meal_name": entry.meal_name,
            "health_grade": entry.health_grade,
            "burn_off_tip": entry.burn_off_tip
        } for entry in entries
    ]
    cache.set(cache_key, results, timeout=60)
    return jsonify(results), 200


@bp.route('/analyze_meal', methods=['POST'])
@limiter.limit('10 per minute')
def analyze_meal():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
        
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    file = request.files.get('meal_image')
    if not file:
        return jsonify({"message": "No image provided"}), 400
        
    if user.subscription_tier == 'Free':
        from ..models import Progress
        meals_used = Progress.query.filter(Progress.user_id == user.id, Progress.meal_name != None).count()
        if meals_used >= 3:
            return jsonify({"message": "UPGRADE_REQUIRED", "reason": "Free limit reached (3/3 AI Meal Logs)."}), 402
        
        
    image_bytes = file.read()
    mime_type = file.mimetype or "image/jpeg"
    
    import hashlib
    import random
    from ..models import Progress
    
    image_hash = hashlib.md5(image_bytes).hexdigest()
    recent_meals = Progress.query.filter_by(user_id=user.id).order_by(Progress.date.desc()).limit(7).all()
    duplicate_meal = next((m for m in recent_meals if m.image_hash == image_hash), None)
    
    if duplicate_meal and duplicate_meal.meal_name and 'unrecognized' not in duplicate_meal.meal_name.lower() and 'unknown' not in duplicate_meal.meal_name.lower():
        base_cals = duplicate_meal.calories or 0
        variation = random.randint(int(-base_cals * 0.05), int(base_cals * 0.05)) if base_cals else 0
        new_cals = max(0, base_cals + variation)
        
        ai_data = {
            "meal_name": duplicate_meal.meal_name,
            "calories": new_cals,
            "health_grade": duplicate_meal.health_grade,
            "burn_off_tip": duplicate_meal.burn_off_tip
        }
    else:
        from ..services.ai_service import analyze_meal_image
        ai_data = analyze_meal_image(image_bytes, mime_type)
    
    new_entry = Progress(
        meal_name=ai_data.get('meal_name', 'Unknown Meal'),
        calories=ai_data.get('calories', 0),
        health_grade=ai_data.get('health_grade', 'N/A'),
        burn_off_tip=ai_data.get('burn_off_tip', ''),
        image_hash=image_hash,
        user_id=session['user_id']
    )
    
    meal_name_lower = ai_data.get('meal_name', 'Unknown Meal').lower()
    if 'unrecognized' not in meal_name_lower and 'unknown' not in meal_name_lower:
        db.session.add(new_entry)
        
        # --- Community Cheer Feed Trigger ---
        # Automatically post to the global feed if it's a healthy meal (Grade A or B)
        health_grade = ai_data.get('health_grade', '')
        if health_grade and (health_grade.startswith('A') or health_grade.startswith('B')):
            from ..models import CommunityFeed
            if user:
                feed_post = CommunityFeed(
                    user_id=user.id,
                    username=user.username,
                    action_type='Meal',
                    description=f"just logged a Grade {health_grade} healthy meal: {ai_data.get('meal_name')}! 🥗"
                )
                db.session.add(feed_post)
        
        db.session.commit()
        cache.delete(f"progress_{session['user_id']}")
        
    return jsonify(ai_data), 200


from datetime import datetime, timedelta

@bp.route('/generate_report', methods=['POST'])
@limiter.limit('5 per minute')
def generate_report():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
        
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    data = request.get_json() or {}
    range_days = int(data.get('range', 7))
    
    if user.subscription_tier == 'Free':
        from ..models import Report
        reports_used = Report.query.filter(Report.user_id == user.id).count()
        if reports_used >= 7:
            return jsonify({"message": "UPGRADE_REQUIRED", "reason": "Free limit reached (7/7 Strategic Analytics)."}), 402
    
    cutoff_date = datetime.utcnow() - timedelta(days=range_days)
    progress_logs_query = Progress.query.filter(Progress.user_id == user.id, Progress.date >= cutoff_date).order_by(Progress.date.desc()).all()
    
    # Filter out unrecognized meals
    progress_logs = []
    for log in progress_logs_query:
        name = log.meal_name or ""
        if "unrecognized" in name.lower() or "unknown" in name.lower():
            continue
        progress_logs.append(log)
    
    total_meals = sum(1 for log in progress_logs if log.meal_name)
    total_calories = sum(log.calories or 0 for log in progress_logs)
    avg_cal = total_calories // total_meals if total_meals > 0 else 0
    total_steps = sum(log.steps or 0 for log in progress_logs)
    avg_steps = total_steps // len(progress_logs) if progress_logs else 0
    
    # Generate Insights with AI
    from ..services.ai_service import analyze_fitness_query
    period = "Week" if range_days == 7 else "Month"
    ai_prompt = f"Act as a professional fitness coach. The user has requested a {period}ly report. They have logged {total_meals} meals, with an average of {avg_cal} kcal per meal, and averaged {avg_steps} steps per day over the last {range_days} days. Provide 3 bullet points of short, encouraging, and actionable insights based on these numbers. Don't use markdown formatting like ** or *, just plain text."
    
    try:
        report_text = analyze_fitness_query(ai_prompt)
        # Remove any bolding if the AI ignores the prompt
        report_text = report_text.replace('**', '').replace('*', '')
    except Exception as e:
        report_text = f"Based on your recent logs, you have consumed an average of {avg_cal} kcal over {total_meals} meals tracked. Keep focusing on balanced nutrition to reach your goals faster!"
        
    # Send Report via WhatsApp (Twilio)
    if user.phone_number:
        try:
            import os
            from twilio.rest import Client
            TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'mock_sid')
            TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'mock_token')
            TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
            
            wa_phone = user.phone_number.strip().replace(" ", "")
            if not wa_phone.startswith('+'):
                wa_phone = '+' + wa_phone
            wa_phone = f"whatsapp:{wa_phone}"
            
            if TWILIO_ACCOUNT_SID != 'mock_sid':
                client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                report_msg = f"📊 *Your FitLife {period}ly Report* 📊\n\n{report_text}\n\n- Avg Steps: {avg_steps}\n- Avg Calories: {avg_cal} kcal"
                client.messages.create(body=report_msg, from_=TWILIO_WHATSAPP_NUMBER, to=wa_phone)
                print(f"Twilio WhatsApp Report sent to {wa_phone}!")
            else:
                print(f"Mock Twilio WhatsApp Report Sent to {wa_phone}")
        except Exception as e:
            print(f"Failed to send Twilio WhatsApp Report: {e}")
    
    # Record report generation for tracking
    from ..models import Report
    new_report = Report(user_id=user.id, report_type=f"{period}ly", content_summary=report_text[:255])
    db.session.add(new_report)
    db.session.commit()
    
    return jsonify({
        "report": report_text,
        "avg_cal": avg_cal,
        "total_meals": total_meals,
        "avg_steps": avg_steps,
        "range_days": range_days
    }), 200

@bp.route('/download_report', methods=['POST'])
@limiter.limit('5 per minute')
def download_report():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    user = User.query.get(session['user_id'])
    
    data = request.get_json() or {}
    report_text = data.get('report', 'No report available.')
    avg_cal = data.get('avg_cal', 0)
    total_meals = data.get('total_meals', 0)
    range_days = int(data.get('range_days', 7))
    
    # Fetch logs for the table
    cutoff_date = datetime.utcnow() - timedelta(days=range_days)
    progress_logs_query = Progress.query.filter(Progress.user_id == user.id, Progress.date >= cutoff_date).order_by(Progress.date.desc()).all()
    
    # Filter out unrecognized meals
    progress_logs = []
    for log in progress_logs_query:
        name = log.meal_name or ""
        if "unrecognized" in name.lower() or "unknown" in name.lower():
            continue
        progress_logs.append(log)
    
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Helvetica", 'B', 22)
    pdf.set_text_color(46, 204, 113) # #2ecc71
    pdf.cell(0, 10, txt="FitLife Hub: Health Audit", ln=True, align="C")
    
    # Subtitle
    pdf.set_font("Helvetica", 'B', 10)
    pdf.set_text_color(127, 140, 141) # Gray
    gen_date = datetime.utcnow().strftime('%Y-%m-%d')
    pdf.cell(0, 10, txt=f"Report Period: Last {range_days} Days | Generated: {gen_date}", ln=True, align="C")
    pdf.ln(5)
    
    # Info Box (3 cells)
    pdf.set_font("Helvetica", 'B', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.set_fill_color(245, 245, 245)
    col_w = 63
    pdf.cell(col_w, 10, txt=f" TOTAL MEALS: {total_meals}", border=1, fill=True)
    pdf.cell(col_w, 10, txt=f" AVG CALORIES: {avg_cal}", border=1, fill=True)
    pdf.cell(col_w, 10, txt=" STATUS: ACTIVE", border=1, fill=True, ln=True)
    pdf.ln(10)
    
    # Coach Analysis
    pdf.set_font("Helvetica", 'B', 14)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 10, txt="Coach Akki's Expert Analysis:", ln=True)
    
    pdf.set_font("Helvetica", '', 11)
    pdf.set_text_color(60, 60, 60)
    safe_text = report_text.encode('ascii', 'replace').decode('ascii').replace('?', '-')
    pdf.multi_cell(0, 7, txt=safe_text)
    pdf.ln(10)
    
    # Detailed Activity Log
    pdf.set_font("Helvetica", 'B', 14)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 10, txt="Detailed Activity Log:", ln=True)
    
    # Table Header
    pdf.set_font("Helvetica", 'B', 9)
    pdf.set_fill_color(46, 204, 113)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(45, 8, "DATE & TIME", border=1, fill=True, align="C")
    pdf.cell(75, 8, "MEAL / ACTIVITY", border=1, fill=True, align="C")
    pdf.cell(35, 8, "CALORIES", border=1, fill=True, align="C")
    pdf.cell(35, 8, "GRADE", border=1, fill=True, align="C")
    pdf.ln()
    
    # Table Rows
    pdf.set_font("Helvetica", '', 9)
    pdf.set_text_color(0, 0, 0)
    for log in progress_logs:
        date_str = log.date.strftime('%Y-%m-%d %H:%M') if log.date else "N/A"
        name = "Wearable Activity (Sync)" if log.source == 'wearable' else (log.meal_name or "Unknown")
        name = (name[:35] + '...') if len(name) > 35 else name
        cals = f"{log.calories} kcal" if log.calories else "0 kcal"
        grade = log.health_grade if log.health_grade else "N/A"
        
        pdf.cell(45, 8, date_str, border=1, align="C")
        pdf.cell(75, 8, " " + name, border=1)
        pdf.cell(35, 8, cals, border=1, align="C")
        pdf.cell(35, 8, grade, border=1, align="C")
        pdf.ln()
        
    pdf.ln(15)
    pdf.set_font("Helvetica", '', 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 10, txt="Generated by FitLife Hub AI - Keep pushing your limits!", align="C")
    
    response_io = io.BytesIO(pdf.output())
    response_io.seek(0)
    
    return send_file(
        response_io,
        mimetype='application/pdf',
        as_attachment=True,
        download_name='FitLife_Report.pdf'
    )


@bp.route('/process_payment', methods=['POST'])
def process_payment():
    if 'user_id' not in session:
        return jsonify({"message": "Please login to upgrade."}), 401
    
    data = request.get_json() or {}
    payment_method = data.get('paymentMethod', 'card')
    
    if payment_method == 'upi':
        utr = data.get('utr', '').strip()
        
        # 1. Validate Format
        if len(utr) != 12 or not utr.isdigit():
            return jsonify({"message": "Invalid format. UTR must be exactly 12 digits."}), 400
            
        # 2. Automated Webhook Simulator (Only accepts Test UTR)
        time.sleep(2.0) # Simulating bank connection
        if utr != "999999999999":
            return jsonify({"message": f"Bank Verification Failed: No funds received for UTR {utr}. Please try again or use the test UTR '999999999999'."}), 402
            
        # If it reaches here, the simulated bank returned Success!
        time.sleep(1.0)
    else:
        # Simulate Stripe Card Processing
        time.sleep(2.0) 
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    try:
        # Upgrade user in database safely
        user.subscription_tier = 'Pro'
        db.session.commit()
        
        # Generate receipt details
        receipt_id = f"REC-{str(uuid.uuid4())[:8].upper()}"
        
        from flask_mail import Message
        from ..extensions import mail
        from flask import current_app
        app = current_app._get_current_object()
        
        def send_async_email(app, msg):
            with app.app_context():
                try:
                    mail.send(msg)
                except Exception as e:
                    print(f"Background Email Error: {e}", flush=True)

        # 1. Send Email to User
        user_subject = "Welcome to FitLife Pro! Your Receipt"
        user_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #2ecc71;">Welcome to FitLife Pro, {user.username}!</h2>
                <p>Your payment was successful. You now have unlimited access to all AI features.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Receipt ID:</strong> {receipt_id}</p>
                    <p><strong>Amount Paid:</strong> $9.00</p>
                    <p><strong>Payment Method:</strong> {payment_method.upper()}</p>
                    <p><strong>Date:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                <p>Happy Tracking!</p>
            </body>
        </html>
        """
        try:
            msg_user = Message(subject=user_subject, recipients=[user.email], html=user_body)
            threading.Thread(target=send_async_email, args=(app, msg_user)).start()
        except Exception:
            pass
        
        # 2. Send Email to Owner (Admin)
        owner_email = os.environ.get('MAIL_USERNAME', "jaiswalakshay2709@gmail.com")
        owner_subject = f"💰 New Pro Sale: {user.username}"
        owner_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="color: #27ae60;">Cha-Ching! New Sale! 💰</h2>
                <p><strong>User:</strong> {user.username} ({user.email})</p>
                <p><strong>Amount:</strong> $9.00</p>
                <p><strong>Method:</strong> {payment_method.upper()}</p>
                <p><strong>Receipt:</strong> {receipt_id}</p>
            </body>
        </html>
        """
        try:
            msg_owner = Message(subject=owner_subject, recipients=[owner_email], html=owner_body)
            threading.Thread(target=send_async_email, args=(app, msg_owner)).start()
        except Exception:
            pass
        
        return jsonify({"message": "Payment successful!"}), 200
    except Exception as e:
        return jsonify({"message": "An error occurred during upgrade."}), 500


@bp.route('/wearable/apple_health', methods=['POST'])
def apple_health_webhook():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid payload"}), 400
        
    try:
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        new_log = Progress(
            user_id=user.id,
            source="Apple HealthKit Sync",
            steps=data.get('steps', 0),
            calories=data.get('calories', 0)
        )
        db.session.add(new_log)
        db.session.commit()
        
        cache_key = f"progress_{user.id}"
        cache.delete(cache_key)
        
        return jsonify({"status": "success", "message": "Data ingested"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# GOOGLE FIT OAUTH ARCHITECTURE
# ==========================================
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_FIT_CLIENT_ID", "mock_client_id")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_FIT_CLIENT_SECRET", "mock_secret")
# Note: For production, this should match the exact URI registered in Google Cloud Console
# We dynamically build it below to support local network mobile testing
@bp.route('/oauth/google/login', methods=['GET'])
def google_oauth_login():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
    
    import os
    frontend_origin = request.headers.get("Origin") or os.environ.get("FRONTEND_URL", "http://localhost:5173")
    dynamic_redirect_uri = f"{frontend_origin}/oauth/callback"
    
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": dynamic_redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.nutrition.read",
        "access_type": "offline",
        "prompt": "consent"
    }
    return jsonify({"auth_url": f"{auth_url}?{urlencode(params)}"}), 200

@bp.route('/oauth/google/callback', methods=['POST'])
def google_oauth_callback():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
        
    data = request.get_json()
    code = data.get('code')
    if not code:
        return jsonify({"message": "No authorization code provided"}), 400
        
    if GOOGLE_CLIENT_ID == "mock_client_id":
        # Architecture Simulation for Portfolio / Dev Environment
        session['google_access_token'] = "mock_access_token_123"
        return jsonify({"message": "Successfully connected Google Fit!"}), 200
        
    import os
    frontend_origin = request.headers.get("Origin") or os.environ.get("FRONTEND_URL", "http://localhost:5173")
    dynamic_redirect_uri = f"{frontend_origin}/oauth/callback"
    
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": dynamic_redirect_uri
    }
    
    try:
        res = requests.post(token_url, data=payload)
        res_data = res.json()
        if "access_token" in res_data:
            session['google_access_token'] = res_data['access_token']
            return jsonify({"message": "Successfully connected Google Fit!"}), 200
        return jsonify({"message": "Failed to get access token", "details": res_data}), 400
    except Exception as e:
        return jsonify({"message": f"OAuth Error: {str(e)}"}), 500

@bp.route('/wearable/sync', methods=['POST'])
def wearable_sync():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
        
    user = User.query.get(session['user_id'])
    
    access_token = session.get('google_access_token')
    if not access_token:
        return jsonify({"message": "Google Fit not connected. Please connect first."}), 403
        
    if access_token == "mock_access_token_123":
        import random
        # Generate realistic data for the demonstration
        steps = random.randint(3000, 12000)
        calories_burned = int(steps * 0.04) 
        
        new_log = Progress(
            user_id=user.id,
            source="Google Fit API",
            steps=steps,
            calories=calories_burned
        )
        db.session.add(new_log)
        db.session.commit()
        cache.delete(f"progress_{user.id}")
        return jsonify({"message": f"Synced {steps} steps from Google Fit!", "steps": steps, "calories": calories_burned}), 200
        
    # --- LIVE API INTEGRATION ---
    import time
    end_time = int(time.time() * 1000)
    start_time = end_time - (86400 * 1000) # 24 hours ago
    
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
      "aggregateBy": [{
        "dataTypeName": "com.google.step_count.delta",
        "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
      }],
      "bucketByTime": { "durationMillis": 86400000 },
      "startTimeMillis": start_time,
      "endTimeMillis": end_time
    }
    
    try:
        res = requests.post("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", headers=headers, json=payload)
        res_data = res.json()
        
        steps = 0
        if "bucket" in res_data:
            for bucket in res_data["bucket"]:
                for dataset in bucket.get("dataset", []):
                    for point in dataset.get("point", []):
                        for value in point.get("value", []):
                            steps += value.get("intVal", 0)
                            
        calories_burned = int(steps * 0.04) 
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing_log = Progress.query.filter(
            Progress.user_id == user.id,
            Progress.source == "Google Fit API",
            Progress.date >= today_start
        ).first()

        if existing_log:
            existing_log.steps = steps
            existing_log.calories = calories_burned
        else:
            new_log = Progress(
                user_id=user.id,
                source="Google Fit API",
                steps=steps,
                calories=calories_burned
            )
            db.session.add(new_log)
            
        db.session.commit()
        cache.delete(f"progress_{user.id}")
        return jsonify({"message": f"Synced {steps} steps from Google Fit!", "steps": steps, "calories": calories_burned}), 200
        
    except Exception as e:
        return jsonify({"message": f"Google Fit API Error: {str(e)}"}), 500

@bp.route('/generate_workout', methods=['POST'])
@limiter.limit('3 per minute')
def generate_workout():
    if 'user_id' not in session:
        return jsonify({"message": "Please login first"}), 401
        
    user = User.query.get(session['user_id'])
    if user.subscription_tier == 'Free':
        return jsonify({"message": "UPGRADE_REQUIRED", "reason": "AI Workout Generation is a Premium feature."}), 402
        
    data = request.get_json(silent=True) or {}
    days_range = data.get("days_range", "1-3")
        
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    progress_logs = Progress.query.filter(Progress.user_id == user.id, Progress.date >= cutoff_date).all()
    
    total_meals = sum(1 for log in progress_logs if log.meal_name)
    total_calories = sum(log.calories or 0 for log in progress_logs)
    avg_cal = total_calories // total_meals if total_meals > 0 else 0
    
    from ..services.ai_service import analyze_fitness_query
    
    day_instruction = "Generate a personalized 3-day workout plan (Days 1, 2, and 3)."
    if days_range == "4-6":
        day_instruction = "Generate an extended 3-day workout plan for Days 4, 5, and 6, assuming the user has already completed days 1-3. Focus on progressive overload or active recovery as appropriate."
    prompt = f"""Act as a world-class fitness coach. 
The user has consumed an average of {avg_cal} calories over the last 7 days. 
{day_instruction}
CRITICAL RULES:
1. Tailor this plan specifically for an Indian audience (accessible exercises, culturally relevant). DO NOT use forced stereotypes or clichés.
2. DO NOT include any medical disclaimers, warnings, or advice to "consult a healthcare professional".
3. DO NOT include any conversational filler (e.g. "Here is your plan"). Provide ONLY the markdown plan.
4. DO NOT generate Markdown tables (e.g. `| column |`). The frontend cannot render them. Use standard nested bullet points instead.
Format the response strictly in Markdown with headers and bullet points."""
    
    try:
        workout_plan = analyze_fitness_query(prompt)
        
        # --- Community Cheer Feed Trigger ---
        from ..models import CommunityFeed
        # Spam prevention: Check if they already posted a workout to the feed today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing_post = CommunityFeed.query.filter(
            CommunityFeed.user_id == user.id,
            CommunityFeed.action_type == 'Workout',
            CommunityFeed.timestamp >= today
        ).first()
        
        if not existing_post:
            feed_post = CommunityFeed(
                user_id=user.id,
                username=user.username,
                action_type='Workout',
                description=f"just generated a killer AI-powered {days_range} Day Workout Plan! 💪"
            )
            db.session.add(feed_post)
            db.session.commit()
        
        return jsonify({"plan": workout_plan}), 200
    except Exception as e:
        return jsonify({"message": "Error generating workout", "details": str(e)}), 500

@bp.route('/support/contact', methods=['POST'])
def contact_support():
    """
    Handles contact form submissions via Flask-Mail AND Twilio WhatsApp.
    """
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message_content = data.get('message')
    
    if not all([name, email, message_content]):
        return jsonify({"error": "Missing fields"}), 400
        
    try:
        # 1. Send via Email (Flask-Mail)
        from flask_mail import Message
        from ..extensions import mail
        
        msg = Message(subject=f"Support Request from {name}",
                      recipients=[os.environ.get('SUPPORT_EMAIL', 'support@fitlifehub.com')],
                      body=f"From: {name} <{email}>\n\n{message_content}")
        try:
            mail.send(msg)
            print("Email sent successfully via Flask-Mail!")
        except Exception as e:
            print(f"SMTP Error: {e}", flush=True)
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500
            
        # 2. Send via WhatsApp (Twilio)
        from twilio.rest import Client
        
        TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'mock_sid')
        TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'mock_token')
        TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        OWNER_WHATSAPP_NUMBER = os.environ.get('OWNER_WHATSAPP_NUMBER', 'whatsapp:+919999999999') # Dummy
        
        # We only send if we have actual credentials (or we simulate success)
        if TWILIO_ACCOUNT_SID != 'mock_sid':
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            wa_msg = f"🚨 New FitLife Support Ticket 🚨\n\n*Name:* {name}\n*Email:* {email}\n*Message:* {message_content}"
            try:
                client.messages.create(
                    body=wa_msg,
                    from_=TWILIO_WHATSAPP_NUMBER,
                    to=OWNER_WHATSAPP_NUMBER
                )
                print("WhatsApp message sent successfully via Twilio!")
            except Exception as e:
                print(f"Twilio Error: {e}")
        else:
            print(f"Mock Twilio WhatsApp Sent to Owner:\nFrom: {name}\nMessage: {message_content}")
            
        return jsonify({"status": "success", "message": "Support ticket dispatched via Email & WhatsApp!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/chat_with_ai', methods=['POST'])
def chat_with_ai():
    data = request.get_json()
    user_query = data.get('query') or data.get('message')
    history = data.get('history', [])
    if not user_query:
        return jsonify({"message": "Empty query"}), 400
        
    try:
        user_context = ""
        if 'user_id' in session:
            from datetime import datetime, timedelta
            user = User.query.get(session['user_id'])
            if user:
                cutoff_date = datetime.utcnow() - timedelta(days=7)
                progress_logs = Progress.query.filter(Progress.user_id == user.id, Progress.date >= cutoff_date).all()
                total_meals = sum(1 for log in progress_logs if log.meal_name)
                total_calories = sum(log.calories or 0 for log in progress_logs)
                avg_cal = total_calories // total_meals if total_meals > 0 else 0
                meals_list = ", ".join(set([log.meal_name for log in progress_logs if log.meal_name and log.meal_name != 'Unknown Meal']))
                user_context = f"The user has tracked {total_meals} meals in the last 7 days. Average calories: {avg_cal} kcal. Foods they recently ate: {meals_list if meals_list else 'None'}."
                
        from ..services.ai_service import analyze_fitness_query
        reply = analyze_fitness_query(user_query, history, user_context=user_context)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        print(f"Chat error: {e}", flush=True)
        return jsonify({"message": f"Error connecting to AI Coach: {str(e)}"}), 500

@bp.route('/voice_stream', methods=['POST'])
def voice_stream():
    data = request.get_json()
    user_query = data.get('query')
    language = data.get('language', 'en-US')
    history = data.get('history', [])
    
    if not user_query:
        return jsonify({"error": "No query provided"}), 400
        
    try:
        user_context = ""
        if 'user_id' in session:
            from datetime import datetime, timedelta
            from ..models import User, Progress
            user = User.query.get(session['user_id'])
            if user:
                cutoff_date = datetime.utcnow() - timedelta(days=7)
                progress_logs = Progress.query.filter(Progress.user_id == user.id, Progress.date >= cutoff_date).all()
                total_meals = sum(1 for log in progress_logs if log.meal_name)
                total_calories = sum(log.calories or 0 for log in progress_logs)
                avg_cal = total_calories // total_meals if total_meals > 0 else 0
                meals_list = ", ".join(set([log.meal_name for log in progress_logs if log.meal_name and log.meal_name != 'Unknown Meal']))
                user_context = f"The user has tracked {total_meals} meals in the last 7 days. Average calories: {avg_cal} kcal. Foods they recently ate: {meals_list if meals_list else 'None'}."
                
        from ..services.ai_coach_voice_service import generate_coach_audio
        import base64
        
        # This will hit Groq for the response text, then use Edge-TTS to get MP3 bytes
        ai_text, audio_bytes = generate_coach_audio(user_query, language, user_context, history)
        
        # Encode the binary audio data as a base64 string to safely send via JSON
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return jsonify({
            "text": ai_text,
            "audio_b64": audio_b64
        }), 200
    except Exception as e:
        print(f"Voice Stream Error: {e}", flush=True)
        return jsonify({"error": str(e)}), 500

# --- COMMUNITY FEED ENDPOINTS ---

@bp.route('/community_feed', methods=['GET'])
def get_community_feed():
    from ..models import CommunityFeed
    # Auto-clear: Fetch only posts from the last 7 days
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=7)
    posts = CommunityFeed.query.filter(CommunityFeed.timestamp >= cutoff).order_by(CommunityFeed.timestamp.desc()).limit(50).all()
    feed_data = []
    for post in posts:
        # Return ISO string with 'Z' so the frontend knows it's UTC and can convert to local time
        dt = post.timestamp
        iso_time = dt.isoformat() + 'Z' if dt else ''
        feed_data.append({
            "id": post.id,
            "username": post.username,
            "action_type": post.action_type,
            "description": post.description,
            "timestamp": iso_time,
            "cheers_count": post.cheers_count
        })
    return jsonify(feed_data), 200

@bp.route('/cheer/<int:post_id>', methods=['POST'])
def cheer_post(post_id):
    from ..models import CommunityFeed
    post = CommunityFeed.query.get_or_404(post_id)
    post.cheers_count += 1
    db.session.commit()
    return jsonify({"message": "Cheered!", "cheers_count": post.cheers_count}), 200
