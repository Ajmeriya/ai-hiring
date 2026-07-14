import urllib.request, json, sys

def get_testcases(question_id):
    url = f'http://localhost:8087/api/dsa/questions/{question_id}/test-cases?include_hidden=true'
    with urllib.request.urlopen(url) as resp:
        data = resp.read().decode()
        return json.loads(data)


def post_submission(payload, url):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

if __name__ == '__main__':
    qid = 1
    tcs = get_testcases(qid)
    if isinstance(tcs, dict) and 'value' in tcs:
        tcs = tcs['value']
    cases = []
    for item in tcs:
        cases.append({
            'inputData': item.get('inputData') or item.get('input_data') or '',
            'expectedOutput': item.get('expectedOutput') or item.get('expected_output') or '',
            'hidden': bool(item.get('hidden', False))
        })
    code = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cout<<"2 -1 2";
    return 0;
}
'''
    payload = {
        'language': 'cpp',
        'code': code,
        'questionId': qid,
        'testCases': cases,
        'timeoutSeconds': 5
    }
    gateway_url = 'http://localhost:8080/api/execute/submit'
    print('Posting to', gateway_url)
    resp = post_submission(payload, gateway_url)
    print(json.dumps(resp, indent=2))
