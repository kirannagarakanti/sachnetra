import urllib.request
import urllib.error
import ssl
import html.parser
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

urls = {
    "Hindu Rupee": "https://www.thehindubusinessline.com/markets/forex/rupee-rallies-as-oil-slump-sparks-unwinding-of-dollar-longs/article71093244.ece",
    "Hindu Bank Nifty": "https://www.thehindubusinessline.com/markets/bank-nifty-tops-56000-leads-market-rally-as-softer-crude-and-easing-us-iran-tensions-boost-sentiment/article71092672.ece",
    "ET ECB": "https://economictimes.indiatimes.com/news/company/corporate-trends/indian-firms-raise-3-76-bn-via-ecbs-in-april-reliance-industries-air-india-indian-oil-renew-surya-roshni-renewable-energy/articleshow/131663383.cms"
}

class MyHTMLParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.fed = []
        self.in_script_or_style = False
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.in_script_or_style = True
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.in_script_or_style = False
    def handle_data(self, data):
        if not self.in_script_or_style:
            self.fed.append(data)
    def get_data(self):
        return ''.join(self.fed)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

for name, url in urls.items():
    print(f"=== {name} ===")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            parser = MyHTMLParser()
            parser.feed(html_content)
            text = parser.get_data()
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            print(f"Total lines: {len(lines)}")
            # Filter lines that have more than 50 characters to see if we got the article content
            long_lines = [l for l in lines if len(l) > 100]
            print(f"Long lines count: {len(long_lines)}")
            for idx, line in enumerate(long_lines[:15]):
                print(f"  [{idx}]: {line[:150]}")
    except Exception as e:
        print(f"Failed to fetch {name}: {e}")
