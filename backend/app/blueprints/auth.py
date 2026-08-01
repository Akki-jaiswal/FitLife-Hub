from flask import Blueprint, request, jsonify, session
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
    
    new_user = User(username=uname, email=uemail, password=pwd, phone_number=phone_number)
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Success! Now please login."}), 200
    except:
        return jsonify({"message": "Database error. Please try again."}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('identifier')
    pwd = data.get('password')
    phone_number = data.get('phone_number')
    
    user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()
    
    if user and user.password == pwd:
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
            return jsonify({"username": user.username, "tier": user.subscription_tier, "premium_uses": user.premium_uses_count}), 200
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
