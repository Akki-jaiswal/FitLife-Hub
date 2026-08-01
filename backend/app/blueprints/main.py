from flask import Blueprint, render_template, request, jsonify, current_app
import os
from twilio.rest import Client
from flask_mail import Message
from ..extensions import mail

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/send_message', methods=['POST'])
def send_message():
    try: 
        data = request.get_json()
        user_email = data.get('email')
        user_name = data.get('name')
        user_phone = data.get('phone', '')
        
        # Store in DB
        from ..models import Message as DBMessage
        from ..extensions import db
        import flask
        
        user_id = flask.session.get('user_id')
        db_msg = DBMessage(
            user_id=user_id,
            name=user_name,
            email=user_email,
            content=data.get('message')
        )
        db.session.add(db_msg)
        db.session.commit()

        admin_msg = Message(
            subject=f"New FitLife Hub Inquiry: {user_name}",
            sender=current_app.config['MAIL_USERNAME'],
            recipients=['jaiswalakshay2709@gmail.com'], 
        )
        admin_msg.body = f"From: {user_name} <{user_email}>\n\n{data.get('message')}"
        mail.send(admin_msg)

        user_msg = Message(
            subject="Thanks for reaching out to FitLife Hub! \U0001F957",
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[user_email], 
        )
        user_msg.body = f"Hi {user_name},\n\nThanks for reaching out to FitLife Hub! We've received your message and our lead consultant, Coach Akki, will get back to you shortly. In the meantime, feel free to use our AI Meal Logger to track your nutrition for the day!\n\nStayfit, stay strong!\n- The FitLife Hub Team"
        mail.send(user_msg)

        # 2. Send via WhatsApp (Twilio)
        TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'mock_sid')
        TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'mock_token')
        TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        OWNER_WHATSAPP_NUMBER = os.environ.get('OWNER_WHATSAPP_NUMBER', 'whatsapp:+919999999999')
        
        if TWILIO_ACCOUNT_SID != 'mock_sid':
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            # Send to Owner
            wa_owner_msg = f"New FitLife Support Ticket\n\n*Name:* {user_name}\n*Email:* {user_email}\n*Phone:* {user_phone}\n*Message:* {data.get('message')}"
            try:
                client.messages.create(body=wa_owner_msg, from_=TWILIO_WHATSAPP_NUMBER, to=OWNER_WHATSAPP_NUMBER)
            except Exception as e:
                print(f"Twilio Error (Owner): {e}")
                
            # Send to User
            if user_phone:
                # Ensure the user_phone is formatted correctly for WhatsApp
                user_wa_number = f"whatsapp:{user_phone}" if not user_phone.startswith('whatsapp:') else user_phone
                wa_user_msg = f"Hi {user_name}, thanks for reaching out to FitLife Hub! Coach Akki will get back to you shortly."
                try:
                    client.messages.create(body=wa_user_msg, from_=TWILIO_WHATSAPP_NUMBER, to=user_wa_number)
                except Exception as e:
                    print(f"Twilio Error (User): {e}")
        else:
            print(f"Mock Twilio WhatsApp Sent to Owner and User ({user_phone})")

        return jsonify({"message": "Message Sent Successfully! \U0001f680"}), 200
    
    except Exception as e:
        return jsonify({"message": str(e)}), 500
