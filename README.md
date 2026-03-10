# 🏋️‍♂️ FitLife Hub | AI-Powered Health & Fitness Tracker

FitLife Hub is a comprehensive, full-stack web application designed to help users track their fitness journey, log meals using Artificial Intelligence, and generate professional health audits.

## ✨ Key Features
* **🤖 AI Meal Logger:** Upload a photo of your food, and our AI instantly identifies the meal, estimates calories, assigns a health grade, and provides a "burn-off" activity tip.
* **📊 Personal Progress Tracker:** Dynamic, interactive charts mapping weight and calorie trends over time.
* **📄 Professional Health Audits:** Generate detailed weekly or monthly PDF reports featuring AI-driven strategic analysis of your habits.
* **⌚ Wearable Sync Simulation:** Mock integration for syncing smartwatch data directly to the dashboard.
* **🌓 Sleek UI/UX:** Fully responsive design featuring a premium Glassmorphism aesthetic and seamless Dark/Light mode toggling.

## 🛠️ Tech Stack
* **Frontend:** React (Vite), CSS3 (CSS Variables for dynamic theming), Chart.js
* **Backend:** Python, Flask, SQLAlchemy (SQLite)
* **AI Integration:** Google Gemini 2.5 Flash (Vision/Image Analysis), Groq Llama 3 (Conversational Agent & Report Generation)

## 🚀 Local Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/fitlife-hub.git
cd fitlife-hub
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
*Create a `.env` file in the `backend` directory and add your API keys (GEMINI_API_KEY, GROQ_API_KEY, FLASK_SECRET_KEY, MAIL_APP_PASSWORD).*
```bash
python app.py
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Live Demo
[Link to Live Project] *(Coming Soon)*