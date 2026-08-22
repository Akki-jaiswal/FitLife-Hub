from flask import Blueprint, render_template, request, jsonify, current_app
import os
from twilio.rest import Client
from ..email_service import send_email
import threading

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return jsonify({"status": "FitLife Backend is Live and connected to Supabase!"}), 200

@bp.route('/send_message', methods=['POST'])
def send_message():
    try: 
        data = request.get_json()
        user_email = data.get('email')
        user_name = data.get('name')
        user_phone = data.get('phone', '')
        
        # Store in DB asynchronously to bypass cloud latency
        from ..models import Message as DBMessage
        from ..extensions import db
        import flask
        
        user_id = flask.session.get('user_id')
        app = current_app._get_current_object()

        def background_db_save(app_context, uid, uname, uemail, umsg):
            with app_context.app_context():
                try:
                    db_msg = DBMessage(user_id=uid, name=uname, email=uemail, content=umsg)
                    db.session.add(db_msg)
                    db.session.commit()
                except Exception as e:
                    print(f"Background DB Save Error: {e}")

        # Fire and forget!
        threading.Thread(target=background_db_save, args=(app, user_id, user_name, user_email, data.get('message'))).start()

        # Send notification to admin
        admin_subject = f"New FitLife Hub Inquiry: {user_name}"
        admin_body = f"From: {user_name} <{user_email}>\n\n{data.get('message')}"
        send_email(admin_subject, [os.environ.get('SUPPORT_EMAIL', 'jaiswalakshay2709@gmail.com')], text_body=admin_body)

        # Send receipt to user with beautiful HTML formatting
        user_subject = "Thanks for reaching out to FitLife Hub! \U0001F957"
        user_html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px; border-top: 5px solid #2ecc71;">
            <h2 style="color: #2c3e50; text-align: center;">Welcome to FitLife Hub!</h2>
            <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #2ecc71;">{user_name}</strong>,</p>
                <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                    Thanks for reaching out to <strong>FitLife Hub!</strong> We've received your message and our lead consultant, <span style="color: #e74c3c; font-weight: bold;">Coach Akki</span>, will get back to you shortly.
                </p>
                <div style="background-color: #e8f8f5; border-left: 4px solid #1abc9c; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #16a085; font-style: italic;">In the meantime, feel free to use our AI Meal Logger to track your nutrition for the day!</p>
                </div>
                <p style="color: #34495e; font-size: 16px; font-weight: bold; text-align: center; margin-top: 30px;">
                    Stay fit, stay strong! ðŸ’ª<br>
                    <span style="color: #7f8c8d; font-size: 14px;">- The FitLife Hub Team</span>
                </p>
            </div>
        </div>
        """
        send_email(user_subject, [user_email], html_body=user_html)
        
        import time
        time.sleep(1.5) # Artificial delay to make the sending process feel more authentic
        
        return jsonify({"message": "Message sent successfully! We will get back to you shortly."}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to send message.", "error": str(e)}), 500

