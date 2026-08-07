import os
import secrets

def load_env(file_path='.env'):
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()

# Try to use python-dotenv if available, else fallback to custom parser
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    load_env()

class Config:
    # Use environment variable if set, otherwise generate a secure random key
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'development_secret_key_12345'
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Mail Config
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')
    
    # API Keys
    GENAI_API_KEY = os.environ.get('GENAI_API_KEY')
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
