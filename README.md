# ZepTrack

ZepTrack is a modern, responsive web application designed to track weight loss progress and Zepbound dosage history. It features a sophisticated dashboard with interactive analytics and persistent local storage.

## Features

- **Dashboard**: Visual overview of current stats, progress trends, and quick actions.
- **Weight & Dosage Tracking**: Easy entry form defaulting to the current date and the previous dosage.
- **Interactive Charts**: Visual history of weight loss and BMI over time using Recharts.
- **Data Persistence**: Uses browser `localStorage` to persist data directly on your device.
- **Bulk Management**: Select multiple entries to delete or manage history efficiently.
- **Data Portability**: Export and import your history via JSON files in the Settings menu.
- **Responsive Design**: Mobile-first approach with Tailwind CSS.

## Getting Started

To run the application locally for testing or personal use:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open Browser**:
    Navigate to the URL provided in your terminal (typically `http://localhost:3010`).

## Deployment

This is a client-side static web application. To deploy it to a web server:

1.  **Build the Project**:
    ```bash
    npm run build
    ```
2.  **Host the Output**:
    Upload the contents of the generated `dist/` folder to any static hosting service (e.g., Vercel, Netlify, GitHub Pages, or a traditional web server like Nginx or Apache).

## Privacy & Storage

This application is designed with privacy in mind:
- **Local Storage**: All your health data is stored directly in your browser's `localStorage`. No data is ever sent to a server.
- **Backups**: Use the "Export JSON" feature in the Settings tab to keep a physical copy of your data for safe keeping.
- **Persistence**: Data is persistent on the specific browser and device you use. Note that clearing browser cache or using Private/Incognito mode may remove your data.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts