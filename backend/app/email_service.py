import os
import requests
import threading

def send_email(subject, recipients, html_body=None, text_body=None):
    """
    Sends an email using the Resend API (HTTP POST) to completely bypass Render's SMTP Port 587 block.
    Runs asynchronously so the web request doesn't hang.
    """
    def _send():
        api_key = os.environ.get('RESEND_API_KEY', 're_mock_key_for_local_testing')
        
        if api_key == 're_mock_key_for_local_testing':
            print(f"[MOCK EMAIL] Sent to {recipients}. Subject: {subject}")
            return
            
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        sender_email = os.environ.get('MAIL_DEFAULT_SENDER', 'onboarding@resend.dev')
        
        payload = {
            "from": f"FitLife-Hub <{sender_email}>",
            "to": recipients,
            "subject": subject
        }
        
        if html_body:
            payload["html"] = html_body
        elif text_body:
            payload["text"] = text_body
        else:
            payload["text"] = "No content provided."
            
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code not in [200, 201]:
                print(f"Resend API Error: {response.text}")
            else:
                print(f"API Email successfully sent to {recipients}")
        except Exception as e:
            print(f"Failed to send HTTP Email: {str(e)}")

    thread = threading.Thread(target=_send)
    thread.start()
