import pymysql
import json

conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='Harsh@101845', db='ai_hiring_applications', cursorclass=pymysql.cursors.DictCursor)
try:
    with conn.cursor() as cur:
        candidate = 'ajmeriyaharsh932@gmail.com'
        # Count before
        cur.execute("SELECT COUNT(*) AS cnt FROM applications WHERE candidate_email = %s OR candidate_id = %s", (candidate, candidate))
        before = cur.fetchone()['cnt']
        print(f"Found {before} application(s) for {candidate} — deleting...")
        # Delete
        cur.execute("DELETE FROM applications WHERE candidate_email = %s OR candidate_id = %s", (candidate, candidate))
        deleted = cur.rowcount
        conn.commit()
        print(f"Deleted {deleted} row(s).")
        # Show remaining rows for candidate (should be 0)
        cur.execute("SELECT id, job_id, candidate_email, resume_status, overall_status FROM applications WHERE candidate_email = %s OR candidate_id = %s", (candidate, candidate))
        rows = cur.fetchall()
        print(json.dumps(rows, default=str, indent=2))
finally:
    conn.close()
