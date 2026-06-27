import sqlite3
import datetime

db_path = "c:\\Users\\Navni Mahendroo\\Desktop\\PROJECTS\\DRIFT 2.0\\drift-backend\\drift.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tasks
cursor.execute("SELECT id, title, created_at FROM tasks")
tasks = cursor.fetchall()
print("Tasks in database:")
for t in tasks:
    print(t)

# Update tasks to simulate different days
# Let's set task 1 to 2 days ago, and task 2 to 1 day ago
now = datetime.datetime.utcnow()
two_days_ago = (now - datetime.timedelta(days=2)).isoformat()
one_day_ago = (now - datetime.timedelta(days=1)).isoformat()

if len(tasks) >= 2:
    cursor.execute("UPDATE tasks SET created_at = ? WHERE id = ?", (two_days_ago, tasks[0][0]))
    cursor.execute("UPDATE tasks SET created_at = ? WHERE id = ?", (one_day_ago, tasks[1][0]))
    conn.commit()
    print("Successfully updated created_at times for task 1 and task 2 to plot the graph!")
else:
    print("Not enough tasks in database to update.")

conn.close()
