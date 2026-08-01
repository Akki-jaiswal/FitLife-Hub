# FitLife-Hub Project Status & Architecture

## Current State of the Application
We are building a full-stack, highly aesthetic fitness subscription platform. 
- **Frontend**: Built with Vite, React, and standard CSS. Emphasizes modern, glassmorphic, and dynamic UI elements (glow effects, premium UI). Uses `react-router-dom` for navigation (`/`, `/subscription`, `/checkout`).
- **Backend**: Built with Python, Flask, and SQLite. Database is named `site.db` and is located in the `backend/instance/` directory. Handles authentication, subscriptions, and simulated email dispatch logic.

## Recent Milestones Completed
1. **React Migration**: Successfully transitioned the frontend from raw HTML to a modular React App structure.
2. **SQLite Integration**: Rewrote the backend to use SQLAlchemy with a `site.db` file. The `User` model tracks `username`, `email`, `password_hash`, and `subscription_tier` (defaults to 'Free', upgrades to 'Pro').
3. **Dual Checkout Gateway**: Built a custom, highly secure Checkout page featuring a toggle between Credit Card and UPI payments.
4. **Secure UPI Verification**: The UPI payment flow requires the user to input a 12-digit UTR (Unique Transaction Reference) number, which the backend strictly verifies before upgrading their account to 'Pro'.

## Next Steps / Pending Tasks
- Further refine the UTR manual verification flow if the owner wants an admin dashboard.
- Continue building out the premium dashboard features that users see *after* successfully purchasing FitLife Pro.
- Any new features the user requests.

*Note for AI: The user prefers extremely premium frontend aesthetics (Tailwind is NOT used, stick to custom CSS) and values high-security business logic in the backend.*
