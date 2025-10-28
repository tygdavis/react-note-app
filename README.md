# React Note App

A simple note-taking app built with **React** and **Supabase**, deployed on **Vercel**.  
Users can add, edit, and delete notes with persistent storage via Supabase.

---

## Features
- Add, edit, and delete text notes
- Search notes by content, created at, updated at
- User authentication with Supabase Auth  
- Cloud storage using Supabase Database  
- Deployed on Vercel with automatic CI/CD  
- Optional visitor analytics via Vercel Web Analytics

---

## Prerequisites
Before you begin, make sure you have:
- Node.js (v18 or newer)
- A Supabase account and project
- A Vercel account

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/tygdavis/react-note-app.git
cd react-note-app
npm install
```

### 2. Configure environment variables
Create a file named `.env` or `.env.local` in the project root and add:
```bash
VITE_SUPABASE_URL=PASTE_YOUR_PROJECT_URL_HERE
VITE_SUPABASE_ANON_KEY=PASTE_YOUR_ANON_KEY_HERE
```

---

## Supabase Setup
1. Open your Supabase project and go to **SQL Editor**  
2. Open the file `tables.sql` from this repository  
3. Copy its contents into a new SQL query and click **Run**  
4. Verify that the tables appear under **Table Editor**

---

## Deploying to Vercel
1. Push your project to a GitHub repository  
2. On [Vercel](https://vercel.com), create a new project and import your repository  
3. Add the same environment variables from your `.env` file in the Vercel dashboard  
4. Click **Deploy**

Your app will be live at your Vercel domain.

---

## Optional: Enable Vercel Analytics
To collect visitor and page-view data:

```bash
npm install @vercel/analytics
```

Then add the following to your `App.jsx`:
```jsx
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      {/* App content */}
      <Analytics />
    </>
  );
}
```

---

## Example Screenshot
![React Note App Screenshot](
<p align="center">
  <img src="./public/screenshot.png" width="800" alt="App screenshot">
</p>
)

---

## License
MIT License © 2025 [Tyler Davis](https://github.com/tygdavis)
