import os

filepath = 'backend/app/blueprints/api.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace send_async_email definition
old_def = '''        from flask_mail import Message
        from ..extensions import mail
        from flask import current_app
        app = current_app._get_current_object()
        
        def send_async_email(app, msg):
            with app.app_context():
                try:
                    mail.send(msg)
                except Exception as e:
                    print(f"Background Email Error: {e}", flush=True)'''

new_def = '''        from ..email_service import send_email
        from flask import current_app
        app = current_app._get_current_object()
        
        def send_async_email(app, subject, recipients, html):
            try:
                send_email(subject, recipients, html_body=html)
            except Exception as e:
                print(f"Background Email Error: {e}", flush=True)'''

content = content.replace(old_def, new_def)

# Replace User Email Send
old_send_user = '''        try:
            msg_user = Message(subject=user_subject, recipients=[user.email], html=user_body)
            threading.Thread(target=send_async_email, args=(app, msg_user)).start()
        except Exception:
            pass'''
new_send_user = '''        try:
            threading.Thread(target=send_async_email, args=(app, user_subject, [user.email], user_body)).start()
        except Exception:
            pass'''
content = content.replace(old_send_user, new_send_user)

# Replace Admin Email Send
old_send_admin = '''        try:
            msg_owner = Message(subject=owner_subject, recipients=[owner_email], html=owner_body)
            threading.Thread(target=send_async_email, args=(app, msg_owner)).start()
        except Exception:
            pass'''
new_send_admin = '''        try:
            threading.Thread(target=send_async_email, args=(app, owner_subject, [owner_email], owner_body)).start()
        except Exception:
            pass'''
content = content.replace(old_send_admin, new_send_admin)

# Replace Contact Form
old_contact = '''        # 1. Send via Email (Flask-Mail)
        from flask_mail import Message
        from ..extensions import mail
        
        msg = Message(subject=f"Support Request from {name}",
                      recipients=[os.environ.get('SUPPORT_EMAIL', 'support@fitlifehub.com')],
                      body=f"From: {name} <{email}>\\n\\n{message_content}")
        try:
            mail.send(msg)
            print("Email sent successfully via Flask-Mail!")
        except Exception as e:
            print(f"SMTP Error: {e}", flush=True)
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500'''

new_contact = '''        # 1. Send via Email API
        from ..email_service import send_email
        
        subject = f"Support Request from {name}"
        body = f"From: {name} <{email}>\\n\\n{message_content}"
        try:
            send_email(subject, [os.environ.get('SUPPORT_EMAIL', 'support@fitlifehub.com')], text_body=body)
            print("Email sent successfully via API!")
        except Exception as e:
            print(f"API Error: {e}", flush=True)
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500'''
content = content.replace(old_contact, new_contact)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("api.py successfully refactored!")
