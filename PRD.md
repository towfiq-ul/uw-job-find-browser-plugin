# Product Requirements Document (PRD) – Upwork Job Finder & Proposal Generator

## Product Name
**Upwork Job Finder & Proposal Generator** – Chrome Extension

## Version
1.0.0

## Objective
Build a Chrome Extension that retrieves Upwork job postings (using mock data for demo; real API integration planned), filters them based on user-defined criteria, ranks jobs with a smart recommendation engine, and generates customised, copy‑ready proposals. The extension must provide a clean, efficient interface with persistent settings, infinite scrolling, and a focus on rapid job discovery.

---

## Requirements

### 1. Chrome Extension & UI Layout

| ID | Requirement |
|----|-------------|
| UI‑01 | The extension popup **fills the full height** of the popup window (`100vh`). |
| UI‑02 | The popup width should be **15% of the browser window width** (responsive, but users can resize; internal layout adapts). |
| UI‑03 | Two **tabs** are provided: **Jobs** (main job list) and **Settings** (user skills, proposal instructions). |
| UI‑04 | All user settings and filter preferences are **persisted** using `chrome.storage.sync` and survive browser restarts. |

### 2. Job Display & Infinite Scroll

| ID | Requirement |
|----|-------------|
| JD‑01 | Only the **job list** is visible by default in the Jobs tab. Filters are hidden behind a toggle button. |
| JD‑02 | Jobs are displayed in cards showing: title (clickable link), description, budget, client spending, client rating, posting time, and required skills. |
| JD‑03 | Each job title is a **clickable link** that opens the real Upwork job posting in a new tab. |
| JD‑04 | **Infinite scroll** is implemented: only **10 jobs** are loaded initially. When the user scrolls down to **80% of the scrollable area**, the next 10 jobs are automatically appended. |

### 3. Job Filtering

| ID | Requirement |
|----|-------------|
| FL‑01 | A **“Show Filters” / “Hide Filters”** toggle button reveals or hides the filter panel. |
| FL‑02 | Filters include: |
|      | - **Skills** (comma-separated, e.g. Java, Python) |
|      | - **Job Title** (text match) |
|      | - **Tags/Categories** (comma‑separated) |
|      | - **Time‑based filtering**: Last 1 hour, Last 24 hours, Last week, Last month, Custom date range |
| FL‑03 | All filter selections are **automatically saved** and restored when the extension reopens. |
| FL‑04 | An **“Apply Filters”** button refreshes the job list and resets the infinite scroll pagination. |

### 4. Job Recommendation Engine

| ID | Requirement |
|----|-------------|
| RE‑01 | Every job receives a **recommendation score** (0–100) based on: |
|      | - User skill match (40%) |
|      | - Job title relevance (15%) |
|      | - Budget (20%) |
|      | - Client total spending (10%) |
|      | - Client rating (10%) |
|      | - Recency (5%) |
| RE‑02 | Jobs in the list are **sorted by recommendation score** (highest first). |
| RE‑03 | A coloured badge (**Top Match**, **Strong Match**, **Good Match**, **Potential Match**) is shown on each job card. |

### 5. Proposal Generation

| ID | Requirement |
|----|-------------|
| PG‑01 | Each job card contains a **“Generate Proposal”** button. |
| PG‑02 | Clicking the button opens a **modal** with a customised proposal that includes: |
|      | - Job title and description |
|      | - The user’s saved skills |
|      | - The job budget |
|      | - The user’s **common proposal instructions** (from Settings tab) |
| PG‑03 | The proposal modal has a **“Copy Proposal”** button that copies the entire proposal text to the clipboard. |

### 6. Settings Tab

| ID | Requirement |
|----|-------------|
| ST‑01 | **User Skills** – a text area where the user lists their skills (comma‑separated). Saved skills are used by the recommendation engine. |
| ST‑02 | **Common Proposal Instructions** – a text area where the user writes reusable text (e.g., “Highlight my 5+ years of experience…”). These instructions are inserted into every generated proposal. |
| ST‑03 | Both fields have **Save** and **Clear** buttons. Data is stored persistently across sessions. |

### 7. Technical & Data Requirements

| ID | Requirement |
|----|-------------|
| TC‑01 | The extension uses **mock job data** for demonstration. The data structure mirrors real Upwick fields (title, description, skills, budget, client metrics, posting time, URL). |
| TC‑02 | A **“Refresh Jobs”** button reloads the mock data and re‑applies filters. |
| TC‑03 | All filtering, scoring, and infinite scroll logic runs locally – no external API calls required for the prototype. |
| TC‑04 | The extension requests only the `storage` permission. |

---

## Success Criteria

- [x] Users can quickly find relevant Upwork jobs using filters that **persist** between sessions.
- [x] The job list loads **10 jobs at a time** and automatically loads more when scrolling near the bottom.
- [x] Job titles are **clickable links** that open the original Upwork job post.
- [x] Jobs are **ranked by relevance** and show a clear badge.
- [x] Users can **generate and copy** a personalised proposal in one click.
- [x] Skills and common instructions are saved in the **Settings tab** and applied globally.
- [x] The interface is **full‑height**, tab‑based, and the filter panel is hidden by default for a clean job‑only view.

---

## Future Enhancements (Roadmap)

| ID | Planned Feature |
|----|-----------------|
| F‑01 | Replace mock data with live **Upwork RSS feed** or official API (requires CORS proxy / backend). |
| F‑02 | Add **automatic login detection** – use the user’s Upwork session to fetch personalised job recommendations. |
| F‑03 | Allow users to **save jobs** to a “watchlist” within the extension. |
| F‑04 | Integrate **AI model** (e.g., GPT) to generate more sophisticated, context‑aware proposals using the full job description. |

---