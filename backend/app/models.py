from .extensions import db
from datetime import datetime
from sqlalchemy import func

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=False, default="default_tenant")
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    password = db.Column(db.String(60), nullable=False)
    
    # New Production-Ready Fields
    full_name = db.Column(db.String(100), nullable=True)
    subscription_tier = db.Column(db.String(20), default='Free', nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    last_active = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    
    # Premium Usage Tracking
    premium_uses_count = db.Column(db.Integer, default=0, nullable=False)
    premium_uses_reset_date = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Relationships
    progress_logs = db.relationship('Progress', backref='user', lazy=True, cascade="all, delete-orphan")
    ai_analyses = db.relationship('AIAnalysis', backref='user', lazy=True, cascade="all, delete-orphan")
    reports = db.relationship('Report', backref='user', lazy=True, cascade="all, delete-orphan")
    messages = db.relationship('Message', backref='user', lazy=True)

class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=False, default="default_tenant")
    date = db.Column(db.DateTime(timezone=True), server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Unified tracking
    source = db.Column(db.String(50), default='Manual', nullable=False) # e.g. Wearable Sync, AI Meal Logger, Manual
    weight = db.Column(db.Float, nullable=True)
    steps = db.Column(db.Integer, nullable=True)
    calories = db.Column(db.Integer, nullable=True)
    meal_name = db.Column(db.String(100), nullable=True)
    health_grade = db.Column(db.String(5), nullable=True)
    burn_off_tip = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"Progress('{self.date}', '{self.weight}kg')"

class AIAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=False, default="default_tenant")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    image_path = db.Column(db.String(255), nullable=True)
    identified_meal = db.Column(db.String(255), nullable=False)
    estimated_calories = db.Column(db.Integer, nullable=False)
    health_grade = db.Column(db.String(5), nullable=True)

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=False, default="default_tenant")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    report_type = db.Column(db.String(50), nullable=False) # 'Weekly', 'Monthly'
    generated_date = db.Column(db.DateTime(timezone=True), server_default=func.now())
    content_summary = db.Column(db.Text, nullable=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(50), nullable=False, default="default_tenant")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Nullable because non-users might send messages
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_sent = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), default='Unread', nullable=False) # 'Unread', 'Resolved'
