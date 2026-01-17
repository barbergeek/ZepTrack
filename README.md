# ZepTrack

ZepTrack is a modern, responsive web application designed to track weight loss progress and Zepbound dosage history. It features a sophisticated dashboard with interactive analytics and SQLite database persistence.

## Features

- **Dashboard**: Visual overview of current stats, progress trends, and quick actions.
- **Weight & Dosage Tracking**: Easy entry form defaulting to the current date and the previous dosage.
- **Interactive Charts**: Visual history of weight loss and BMI over time using Recharts.
- **Data Persistence**: SQLite database for reliable, persistent storage.
- **Bulk Management**: Select multiple entries to delete or manage history efficiently.
- **Data Portability**: Export and import your history via JSON files in the Settings menu.
- **Responsive Design**: Mobile-first approach with Tailwind CSS.
- **Docker Support**: Easy deployment with Docker and docker-compose.

## Getting Started

### Development Mode

To run the application locally for development:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Servers** (Frontend & Backend):
    ```bash
    npm run dev:all
    ```

    Or run them separately:
    ```bash
    # Terminal 1 - Frontend
    npm run dev

    # Terminal 2 - Backend
    npm run dev:server
    ```

3.  **Open Browser**:
    Navigate to `http://localhost:3010` for the frontend. The backend API runs on `http://localhost:3000`.

### Docker Deployment

The easiest way to deploy ZepTrack is using Docker:

1.  **Build and Run with Docker Compose**:
    ```bash
    npm run docker:run
    ```

    Or use docker-compose directly:
    ```bash
    docker-compose up -d
    ```

2.  **Access the Application**:
    Navigate to `http://localhost:3000`

3.  **View Logs**:
    ```bash
    npm run docker:logs
    ```

4.  **Stop the Application**:
    ```bash
    npm run docker:stop
    ```

### Manual Docker Build

If you prefer to build manually:

```bash
docker build -t zeptrack .
docker run -d -p 3000:3000 -v zeptrack-data:/app/data zeptrack
```

## Data Storage

- **Database**: SQLite database stored in `/app/data/zeptrack.db` (Docker) or `./data/zeptrack.db` (local)
- **Persistence**: Data is persisted in a Docker volume named `zeptrack-data`
- **Backups**: Use the "Export JSON" feature in the Settings tab to create backups
- **Privacy**: All data remains on your server/container

## Configuration

Environment variables can be configured in `.env` file (copy from `.env.example`):

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `DB_PATH`: Path to SQLite database file
- `VITE_API_URL`: API endpoint URL for frontend (development only)

## Production Deployment

For production deployment without Docker:

1.  **Build the Frontend**:
    ```bash
    npm run build
    ```

2.  **Start the Server**:
    ```bash
    npm start
    ```

The server will serve both the API and the built frontend on the configured port.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Container**: Docker