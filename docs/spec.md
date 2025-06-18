https://aistudio.google.com/prompts/17GoXXFbMQjYgN-0gQ3zjH11peyNdS_AL

## Software Design Document: App Stats Store

**Version:** 1.1
**Date:** June 17, 2025
**Author:** AI Assistant

### 1. Introduction

#### 1.1. Project Overview

App Stats Store is a web-based analytics platform designed to ingest and visualize system profile data from applications using the Sparkle update framework. The platform provides a centralized, modern dashboard for developers to track key metrics like installations, user demographics (macOS version, hardware), and application version adoption over time. The project will be hosted at `stats.store`.

#### 1.2. Scope

- A backend API endpoint to receive data from Sparkle feeds.
- A Supabase (PostgreSQL) database to store and aggregate this data.
- A responsive, modern frontend dashboard for data visualization.
- Filtering capabilities by application and time period.
- User authentication to protect access to the main dashboard.

#### 1.3. Target Audience

This platform is for application developers who use the Sparkle framework and want to gain insight into their user base.

### 2. System Architecture

The system is built on a modern serverless architecture, ensuring scalability, performance, and a streamlined developer experience.

- **Frontend & Backend API:** A **Next.js** application hosted on **Vercel**. This co-locates the UI and the API logic, simplifying development. The frontend uses Server-Side Rendering (SSR) for fast, dynamic dashboard loads, and the backend logic is handled by Next.js API Routes.
- **Database & Authentication:** **Supabase** serves as the data persistence and user authentication layer. It provides a PostgreSQL database and a ready-to-use authentication service.

- **Data Flow:**
  1.  A user's application running Sparkle sends a profile report during an update check to `https://stats.store/api/ingest`.
  2.  The Next.js API Route at `/api/ingest` receives the request.
  3.  The API route validates the report by checking the `bundle_identifier` against the `apps` table in the Supabase database.
  4.  Upon successful validation, the route sanitizes the data and inserts it into the `reports` table.
  5.  A developer logs into the `stats.store` dashboard.
  6.  The Next.js frontend, running on the server and client, calls the Supabase API to fetch aggregated statistical data for the authenticated user.
  7.  The dashboard renders beautiful, interactive charts and tables.

### 3. Data Model (PostgreSQL Schema)

The data will be stored in a Supabase PostgreSQL database. The schema is designed for efficient querying of time-series and categorical data.

#### 3.1. Table: `apps`

Stores information about each tracked application. An application must be registered here to have its reports accepted.

\`\`\`sql
-- Stores metadata for each application being tracked.
CREATE TABLE public.apps (
  -- A unique identifier for the app.
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user-facing name of the application, e.g., "My Awesome App".
  name TEXT NOT NULL UNIQUE,

  -- The app's bundle identifier, e.g., "com.mycompany.myawesomeapp".
  -- This is the key used to validate incoming reports.
  bundle_identifier TEXT NOT NULL UNIQUE,

  -- Timestamp of when the app was added.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security to control data access.
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
\`\`\`

#### 3.2. Table: `reports`

Stores sanitized data from each individual Sparkle profile report.

\`\`\`sql
-- Stores every individual, sanitized profile report received.
CREATE TABLE public.reports (
  -- A unique, auto-incrementing identifier for each report.
  id BIGSERIAL PRIMARY KEY,

  -- A foreign key linking this report to an app in the 'apps' table.
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,

  -- Timestamp of when the report was received by the server.
  received_at TIMESTAMPTZ DEFAULT now(),

  -- A SHA-256 hash of the user's IP address salted with the current date.
  -- This allows for counting daily unique users without storing PII.
  ip_hash TEXT NOT NULL,

  -- Application version, e.g., "1.2.3".
  app_version TEXT,

  -- macOS version, e.g., "14.5".
  os_version TEXT,

  -- CPU architecture: 'arm64' or 'x86_64'.
  cpu_arch TEXT,

  -- Number of CPU cores.
  core_count INT,

  -- The user's primary system language code, e.g., "en".
  language TEXT,

  -- The Mac model identifier, e.g., "MacBookPro17,1".
  model_identifier TEXT,

  -- System RAM in megabytes.
  ram_mb INT
);

-- Indexes to optimize common query patterns.
CREATE INDEX idx_reports_app_id_received_at ON public.reports(app_id, received_at DESC);
CREATE INDEX idx_reports_os_version ON public.reports(os_version);
CREATE INDEX idx_reports_cpu_arch ON public.reports(cpu_arch);

-- Enable Row Level Security.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
\`\`\`

### 4. API Design (Next.js API Routes)

The API is implemented as **Next.js API Routes**, keeping all code within a single project repository for simplicity.

#### 4.1. `POST /api/ingest`

- **Purpose:** The public endpoint to receive new profile data from Sparkle clients.
- **Security:** This endpoint is open but validates incoming data. It checks that the `bundle_identifier` in the payload matches an application pre-registered in the `apps` table. This prevents data from unknown applications from being stored. It is a deliberate design choice to accept that a malicious actor could send fake data for a known application.
- **Request Body:**
  \`\`\`json
  {
    "bundleIdentifier": "com.mycompany.myawesomeapp",
    "ip": "123.45.67.89",
    "appVersion": "1.2.3",
    "osVersion": "14.5",
    "cputype": "16777228",
    "ncpu": "8",
    "lang": "en",
    "model": "MacBookPro17,1",
    "ramMB": "16384"
  }
  \`\`\`
- **Action:**
  1.  The API route receives the JSON payload.
  2.  It extracts the `bundleIdentifier`.
  3.  It queries the `apps` table in Supabase to find a matching record.
  4.  If no match is found, it returns a `403 Forbidden` status.
  5.  If a match is found, it sanitizes the data, hashes the IP with a daily salt, and inserts a new record into the `reports` table.
  6.  It returns a `201 Created` status on success.

#### 4.2. `GET /api/stats`

- **Purpose:** This is not a public API route. Instead, this logic resides in the server-side data-fetching functions of the Next.js dashboard pages (`getServerSideProps` or Route Handlers in the App Router).
- **Security:** The dashboard page itself requires user authentication via Supabase Auth. The data-fetching logic on the server will use the authenticated user's session to query Supabase directly and securely.
- **Query Logic (Server-Side):**
  - Filter by `app_id` (optional, UUID).
  - Filter by `start_date` and `end_date` (optional, ISO 8601).
- **Response Payload (Passed as props to the dashboard component):**
  \`\`\`json
  {
    "kpis": {
      "unique_installs": 12543,
      "reports_this_period": 876,
      "latest_version": "1.2.3"
    },
    "installs_timeseries": [
      { "date": "2025-06-10", "count": 150 },
      { "date": "2025-06-11", "count": 165 }
    ],
    "os_breakdown": [
      { "name": "macOS 14 Sonoma", "value": 6012 },
      { "name": "macOS 13 Ventura", "value": 4531 }
    ],
    "cpu_breakdown": [
      { "name": "Apple Silicon", "value": 9876 },
      { "name": "Intel", "value": 2667 }
    ]
  }
  \`\`\`

### 5. Frontend Design (UI/UX)

The dashboard will be clean, modern, and data-focused, using a dark theme with vibrant accent colors for charts.

#### 5.1. Dashboard Wireframe & Layout

\`\`\`
/-------------------------------------------------------------------------------------\
| [App Stats Store]                                               [User: dev@email] |
|-------------------------------------------------------------------------------------|
|                                                                                     |
|  Filters: [All Apps ▼]   Date Range: [Last 30 Days ▼]   [Refresh]                   |
|                                                                                     |
|-------------------------------------------------------------------------------------|
|                                                                                     |
|  /-----------------------\   /-----------------------\   /-----------------------\   |
|  | TOTAL INSTALLS        |   | ACTIVE LAST 30D       |   | LATEST VERSION        |   |
|  | 45,102                |   | 8,675                 |   | 2.1.0                 |   |
|  \-----------------------/   \-----------------------/   \-----------------------/   |
|                                                                                     |
|-------------------------------------------------------------------------------------|
|                                                                                     |
|  /---------------------------------------|  /-----------------------------------\  |
|  |▼ Installations Over Time              |  |▼ macOS Version Distribution       |  |
|  |                                       |  |                                   |  |
|  | (Line Chart showing daily installs)   |  | (Bar chart showing OS versions)    |  |
|  |                                       |  |                                   |  |
|  \---------------------------------------|  \-----------------------------------/  |
|                                                                                     |
|-------------------------------------------------------------------------------------|
|                                                                                     |
|  /---------------------------\  /-----------------------------------------------\  |
|  |▼ CPU Architecture         |  |▼ Top Models                                   |  |
|  |                           |  |-----------------------------------------------|  |
|  | (Doughnut chart for CPU)  |  | MacBook Pro (16-inch, 2023) ....... 2,450     |  |
|  |                           |  | Mac mini (M2, 2023) ............... 1,832     |  |
|  |                           |  | MacBook Air (13-inch, M1, 2020) ... 1,567     |  |
|  \---------------------------/  \-----------------------------------------------/  |
|                                                                                     |
\-------------------------------------------------------------------------------------/
\`\`\`

#### 5.2. Key UI Components and Technology Choices

- **Filter Bar:** Allows selection of one or more apps and a predefined (Last 7 days, 30 days, 90 days) or custom date range.
- **KPI Cards, Charts, and Tables:** The UI components will be built using **Tremor**, a React library specifically designed for creating beautiful, modern dashboards with minimal effort. It provides components for charts, cards, and tables that are perfectly suited for this project.
- **Charting Library:** Tremor internally uses **Recharts**, which will power the line, bar, and doughnut charts.

### 6. Implementation & Deployment

1.  **Setup Supabase:** Create the project, define the database schema using the SQL above, and configure authentication. Pre-populate the `apps` table with the applications you wish to track.
2.  **Develop Ingest API Route:** Create the `pages/api/ingest.ts` file in your Next.js project. Implement the validation and data insertion logic using the Supabase client library.
3.  **Bootstrap Next.js App:** Use `create-next-app` to initialize the project.
4.  **Implement Authentication:** Use `Supabase.js` to create login pages and protect the dashboard route.
5.  **Build UI Components:** Use Tremor to build the dashboard layout, KPI cards, charts, and tables.
6.  **Implement Data Fetching:** On the main dashboard page, use server-side data fetching to query Supabase securely for statistical data and pass it as props to the page component.
7.  **Deploy:** Connect the project's GitHub repository to **Vercel** for continuous, automatic deployments. Configure environment variables in Vercel for your Supabase URL and keys.
