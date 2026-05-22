import pymysql
import json

conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='Harsh@101845', db='ai_hiring_applications', cursorclass=pymysql.cursors.DictCursor)
try:
    with conn.cursor() as cur:
        sql = "SELECT id, job_id, candidate_id, candidate_email, resume_path, resume_status, resume_score, current_round, overall_status, aptitude_status, aptitude_score, created_at, updated_at FROM applications WHERE candidate_email = %s OR candidate_id = %s"
        candidate = 'ajmeriyaharsh932@gmail.com'
        cur.execute(sql, (candidate, candidate))
        rows = cur.fetchall()
        print(json.dumps(rows, default=str, indent=2))
finally:
    conn.close()
