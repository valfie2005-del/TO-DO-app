# Database Migrations

## 20241028000001_initial_schema.sql

Creates the core schema for 40 Days.

### Tables

#### `public.tasks`
| Column         | Type        | Notes                                      |
|----------------|-------------|--------------------------------------------|
| id             | UUID PK     | gen_random_uuid()                          |
| user_id        | UUID FK     | → auth.users, ON DELETE CASCADE            |
| title          | TEXT        | 1–120 chars after trim                     |
| type           | TEXT        | 'challenge' \| 'single'                    |
| start_date     | DATE        | First scheduled calendar day               |
| duration_days  | INTEGER     | 1–365                                      |
| due_date       | DATE        | Auto-maintained: start + duration - 1      |
| created_at     | TIMESTAMPTZ | default now()                              |

Constraints:
- Single tasks must have duration_days = 1 and due_date = start_date
- Challenge duration 1–365

#### `public.completions`
| Column        | Type        | Notes                                      |
|---------------|-------------|--------------------------------------------|
| id            | UUID PK     |                                            |
| task_id       | UUID FK     | → tasks, ON DELETE CASCADE                 |
| completed_on  | DATE        | Calendar date of completion                |
| created_at    | TIMESTAMPTZ |                                            |

Unique constraint on (task_id, completed_on).

### Row Level Security
- **tasks**: authenticated users can CRUD only their own rows (`auth.uid() = user_id`)
- **completions**: access authorized through the owning task. Insert also requires the date to be inside the task schedule (via `is_date_in_task_schedule`).

### Applying
```bash
# With Supabase CLI
supabase db push

# Or paste the SQL into the Supabase SQL Editor
```
