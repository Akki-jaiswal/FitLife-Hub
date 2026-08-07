from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_
from ..models import User
from ..extensions import db

bp = Blueprint('auth', __name__)

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    uname = data.get('username')
    uemail = data.get('email')
    pwd = data.get('password')
    phone_number = data.get('phone_number')
    
    user_exists = User.query.filter(or_(User.username == uname, User.email == uemail)).first()
    if user_exists:
        return jsonify({"message": "Username or Email already exists."}), 409
    
    hashed_password = generate_password_hash(pwd)
    new_user = User(username=uname, email=uemail, password=hashed_password, phone_number=phone_number)
    try:
        db.session.add(new_user)
        db.session.commit()
        
        # 1. Send Welcome Email
        try:
            from flask_mail import Message
            from ..extensions import mail
            msg = Message("Welcome to FitLife Hub!", recipients=[uemail])
            msg.html = f"<h3>Hello {uname},</h3><p>Welcome to <b>FitLife Hub</b>! We are thrilled to have you start your fitness journey with us.</p>"
            mail.send(msg)
            print(f"Welcome email sent to {uemail}!")
        except Exception as e:
            print(f"Failed to send email: {e}")
            
        # 2. Send Welcome WhatsApp (Twilio)
        if phone_number:
            try:
                import os
                from twilio.rest import Client
                TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'mock_sid')
                TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'mock_token')
                TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
                
                # Format phone number
                wa_phone = phone_number.strip().replace(" ", "")
                if not wa_phone.startswith('+'):
                    wa_phone = '+' + wa_phone
                wa_phone = f"whatsapp:{wa_phone}"
                
                if TWILIO_ACCOUNT_SID != 'mock_sid':
                    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                    welcome_msg = f"Hello {uname}! Welcome to FitLife Hub. 🏋️‍♂️\n\nYour fitness journey begins now. Generate your first AI report today!"
                    client.messages.create(body=welcome_msg, from_=TWILIO_WHATSAPP_NUMBER, to=wa_phone)
                    print(f"Twilio WhatsApp welcome sent to {wa_phone}!")
                else:
                    print(f"Mock Twilio WhatsApp Welcome Sent to {wa_phone}")
            except Exception as e:
                print(f"Failed to send Twilio WhatsApp: {e}")

        return jsonify({"message": "Success! Now please login."}), 200
    except Exception as e:
        print(f"Registration DB Error: {e}")
        return jsonify({"message": "Database error. Please try again."}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('identifier')
    pwd = data.get('password')
    phone_number = data.get('phone_number')
    
    user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()
    
    if user and check_password_hash(user.password, pwd):
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify({"message": "Login successful! Redirecting...", "username": user.username, "tier": user.subscription_tier, "premium_uses": user.premium_uses_count}), 200
    return jsonify({"message": "Invalid credentials"}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@bp.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            from ..models import Progress, Report
            meals_used = Progress.query.filter(Progress.user_id == user.id, Progress.meal_name != None).count()
            reports_used = Report.query.filter(Report.user_id == user.id).count()
            return jsonify({
                "username": user.username, 
                "tier": user.subscription_tier, 
                "meal_logs_used": meals_used,
                "reports_used": reports_used,
                "google_fit_connected": session.get('google_access_token') is not None
            }), 200
    return jsonify({"message": "No session"}), 401

@bp.route('/upgrade_to_pro', methods=['POST'])
def upgrade_to_pro():
    if 'user_id' not in session:
        return jsonify({"message": "Unauthorized"}), 401
    user = User.query.get(session['user_id'])
    if user:
        user.subscription_tier = 'Pro'
        db.session.commit()
        return jsonify({"message": "Successfully upgraded to Pro!", "tier": "Pro"}), 200
    return jsonify({"message": "User not found"}), 404
