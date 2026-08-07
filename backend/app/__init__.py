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
    cors.init_app(app, supports_credentials=True, origins=re.compile(r"http://.*"))
    
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
        
    return app
