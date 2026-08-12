from flask import Flask
from .config import Config
from .extensions import db, mail, cors
import os

def create_app(config_class=Config):
    app = Flask(__name__, template_folder='../../templates', static_folder='../../static')
    app.config.from_object(config_class)
    
    # Initialize extensions
    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 60
    
    from .extensions import db, cache, limiter
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    mail.init_app(app)
    import re
    cors.init_app(app, supports_credentials=True, origins=re.compile(r"https?://.*"))
    
    # Register blueprints
    from .blueprints.auth import bp as auth_bp
    from .blueprints.main import bp as main_bp
    from .blueprints.api import bp as api_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        
    # Error Handlers
    from werkzeug.exceptions import HTTPException
    from flask import jsonify
    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return jsonify({"message": e.description}), e.code
        # Prevent stack trace leakage in production
        import logging
        logging.error(f"Internal Server Error: {e}")
        return jsonify({"message": "Internal Server Error"}), getattr(e, 'code', 500)

    # Security Headers
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response
        
    return app
