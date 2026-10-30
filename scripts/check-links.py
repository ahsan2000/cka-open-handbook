"""Optional online link review. Run after collecting URLs into outputs/links.json."""
import json
import socket
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'outputs/links.json').read_text())
# Fail quickly if the execution environment blocks DNS, rather than reporting every link broken.
socket.getaddrinfo('kubernetes.io', 443)

def check(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'CKA-Open-Handbook-Link-Review/1.0'})
        with urllib.request.urlopen(req, timeout=20) as response:
            return {'url': url, 'status': response.status, 'final': response.url}
    except urllib.error.HTTPError as error:
        return {'url': url, 'status': error.code}
    except Exception as error:
        return {'url': url, 'error': str(error)}

with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, data['urls']))
video_results = []
for video in data['videos']:
    url = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + video + '&format=json'
    video_results.append(check(url))
report = {'links': results, 'video_metadata': video_results}
(root / 'outputs/link-review.json').write_text(json.dumps(report, indent=2))
for row in results + video_results:
    if row.get('status') != 200:
        print(json.dumps(row))
print(f"HTTP 200: {sum(r.get('status') == 200 for r in results)}/{len(results)} links; {sum(r.get('status') == 200 for r in video_results)}/{len(video_results)} video metadata endpoints. Metadata availability does not verify playback.")
