# TimeTracking

A web application to track time spent on different tasks across multiple projects. Designed for teams or individuals needing structured time tracking, project management, and reporting.

## Purpose

TimeTracking enables users to:
- Track time spent on tasks within different projects.
- Assign tasks to users and monitor progress.
- Manage projects, tasks, and users with a simple interface.
- Generate insights about productivity and workload.

## Features

**Major features:**

- **Projects Management**
  - Create, edit, and delete projects.
  - View all projects, including their descriptions and owners.
  - Assign users to projects.

- **Tasks Management**
  - Create, edit, assign, and delete tasks.
  - Associate tasks with projects and users.
  - Track status and time spent on each task.
  - Filter tasks by user or project.

- **Dashboard**
  - View an overview of all projects and tasks.
  - Start, pause, and stop timers for tasks.
  - See total time spent and task status.

- **Users Management**
  - Create, edit, and delete user accounts.
  - Assign roles to users (e.g., "normal" users).
  - See list of users and their roles.

- **Notifications**
  - Get real-time updates for task assignments and changes (admin and assigned users).

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ancalvo10/TimeTracking.git
   cd TimeTracking
   
2. **Install Dependencies**
   ```bash
   npm install

3. **Configure Supabase**
  - Create a .env file with your Supabase credentials.
  - Update src/supabaseClient.js as needed.

4. **Start the Application**
    ```bash
    npm start
5. **Access the App**
   - Open your browser and go to
   ```web
   http://localhost:3000

## Usage Example
- **Add a Project:**
  Go to Projects Management, click "Add Project", fill in name and description.
- **Add a Task:**
  Go to Tasks Management, click "Add Task", select project and assignee, set details.
- **Track Time:**
  On the Dashboard, start the timer for a task when you begin working, pause or stop when finished.
- **Manage Users:**
  In Users Management, create new users or update existing ones.

## Technologies Used
- ReactJS
- Supabase (database and real-time)
- TailwindCSS (styling)
- Framer Motion (animations)
- Lucide React (icons)

## Citation Link
Repository: [ancalvo10/TimeTracking](https://github.com/ancalvo10/TimeTracking)
