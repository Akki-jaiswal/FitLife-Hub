import codecs
import re

with codecs.open('backend/app/blueprints/api.py', 'r', 'utf-8') as f:
    content = f.read()

# Fix Line 140 (Apple)
content = re.sub(
    r'description=f\"just logged a Grade \{health_grade\} healthy meal: \{ai_data.get\(\'meal_name\'\)\}! [^\"]+\"',
    'description=f\"just logged a Grade {health_grade} healthy meal: {ai_data.get(\\\'meal_name\\\')}! 🍎\"',
    content
)

# Fix Line 687 (Muscle)
content = re.sub(
    r'description=f\"just generated a killer AI-powered \{days_range\} Day Workout Plan! [^\"]+\"',
    'description=f\"just generated a killer AI-powered {days_range} Day Workout Plan! 💪\"',
    content
)

# Fix Line 732 (Alerts)
content = re.sub(
    r'wa_msg = f\"[^\"]+ New FitLife Support Ticket [^\"]+\\\\n\\\\n\*Name:\* \{name\}\\\\n\*Email:\* \{email\}\\\\n\*Message:\* \{message_content\}\"',
    'wa_msg = f\"🚨 New FitLife Support Ticket 🚨\\\\n\\\\n*Name:* {name}\\\\n*Email:* {email}\\\\n*Message:* {message_content}\"',
    content
)

with codecs.open('backend/app/blueprints/api.py', 'w', 'utf-8') as f:
    f.write(content)
