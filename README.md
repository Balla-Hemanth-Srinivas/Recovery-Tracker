# 🛡️ Recovery Tracker

Recovery Tracker is a polished, production-quality, mobile-first Progressive Web Application (PWA) designed to help you track and overcome undesirable habits. It functions as a premium personal companion, providing detailed progress tracking, streaks, success rates, annual heatmaps, and trend charts.

All your data is stored locally in your browser and synchronized securely and privately across devices using your own **GitHub Gist**.

---
Live Demo: [Recovery Tracker](https://balla-hemanth-srinivas.github.io/Recovery-Tracker/)

## ✨ Features

- **📱 Mobile-First Design**: Designed to feel like a premium native mobile application with fluid transitions, rounded cards, and responsive touch gestures.
- **🎨 Dynamic Theme Support**: Seamlessly follows your operating system's theme preference (System Default) or allows explicit Light/Dark mode toggling.
- **🛡️ Secure Local-First Data**: All records are encrypted/hashed locally. Passwords are salted and hashed using the browser's native **Web Crypto API** (SHA-256).
- **🔄 Auto-Synchronization**: Automatically pulls and merges data on startup, after modifications, or when network connectivity is restored. Powered by a private GitHub Gist, using a last-write-wins merge strategy to ensure no data is lost.
- **📊 Rich Visualizations**:
  - **Color-Coded Calendar**: Highlights daily progress (Green for clean days, Amber/Red for days exceeding thresholds).
  - **GitHub-style Heatmap**: Displays a 52-week overview of your journey.
  - **Trend Graphs**: Interactive line and bar charts showing daily and monthly trends.
- **⚙️ Advanced Settings**: Customizable daily occurrence thresholds per habit, import/export data as JSON, and change password or perform a total data reset.

---

## 🛠️ Technology Stack

- **Core**: Vanilla HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3.
- **Charts**: [Chart.js](https://www.chartjs.org/) (loaded via CDN).
- **Icons & Fonts**: Google Fonts (Inter) and SVG vector icons.
- **Security**: Web Crypto API (SHA-256 password hashing).
- **Offline / PWA**: Web Manifest and Service Worker with a Cache-First strategy.
- **Database / Cloud Sync**: LocalStorage & GitHub Gist API.

---

## 🚀 Quick Start

### 1. Prerequisites
To enable cross-device synchronization, you need a **GitHub Personal Access Token (Classic)**.
- Go to [GitHub Developer Settings](https://github.com/settings/tokens).
- Generate a new token with the `gist` scope.
- Copy and save this token securely.

### 2. Running Locally
Simply open the `index.html` file in any modern web browser, or serve it using a lightweight local web server:

```bash
# Using python
python -m http.server 8000

# Using Node.js / npx
npx http-server -p 8000
```
Then navigate to `http://localhost:8000`.

### 3. Setting Up the App
1. When you first launch the app, click **Register**.
2. Enter your desired **Username** and **Password** (min 6 characters).
3. Paste your **GitHub Personal Access Token**.
4. The application will automatically create a private Gist under your GitHub account to store your data securely.
5. You are ready to start tracking!

---

## 📄 Documentation

For detailed information on design, architecture, and setup:
- [Architecture Guide (Docs/ARCHITECTURE.docx)](file:///c:/Users/bhema/OneDrive/Desktop/My%20Projects/Recovery_Tracker/Docs/ARCHITECTURE.docx) — Under-the-hood design, data models, and sync merge strategy.
- [Setup & Deployment Guide (Docs/SETUP_GUIDE.docx)](file:///c:/Users/bhema/OneDrive/Desktop/My%20Projects/Recovery_Tracker/Docs/SETUP_GUIDE.docx) — Step-by-step instructions for deploying to GitHub Pages and installation as a PWA on mobile.
