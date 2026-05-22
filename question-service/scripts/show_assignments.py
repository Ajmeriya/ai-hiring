import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config
import pymysql
import json

conn = pymysql.connect(host=config.MYSQL_HOST, port=config.MYSQL_PORT, user=config.MYSQL_USER, password=config.MYSQL_PASSWORD, db=config.MYSQL_DATABASE, charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
with conn:
    with conn.cursor() as cur:
        cur.execute('''SELECT a.application_id, q.id as question_id, q.source, q.question_text, a.sequence_order, q.created_at
                       FROM aptitude_question_assignments a
                       JOIN aptitude_question_bank q ON q.id = a.question_id
                       ORDER BY a.created_at DESC
                       LIMIT 50''')
        rows = cur.fetchall()
        for r in rows:
            if isinstance(r.get('created_at'), (bytes, bytearray)):
                r['created_at'] = r['created_at'].decode('utf-8')
            elif hasattr(r.get('created_at'), 'isoformat'):
                r['created_at'] = r['created_at'].isoformat()
        print(json.dumps(rows, indent=2, ensure_ascii=False))
