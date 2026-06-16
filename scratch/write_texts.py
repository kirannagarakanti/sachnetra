import urllib.request
import ssl
import html.parser

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

for name, url in [
    ("Rupee", "https://www.thehindubusinessline.com/markets/forex/rupee-rallies-as-oil-slump-sparks-unwinding-of-dollar-longs/article71093244.ece"),
    ("Nifty", "https://www.thehindubusinessline.com/markets/bank-nifty-tops-56000-leads-market-rally-as-softer-crude-and-easing-us-iran-tensions-boost-sentiment/article71092672.ece"),
    ("ET_ECB", "https://economictimes.indiatimes.com/news/company/corporate-trends/indian-firms-raise-3-76-bn-via-ecbs-in-april-reliance-industries-air-india-indian-oil-renew-surya-roshni-renewable-energy/articleshow/131663383.cms")
]:
    print(f"Fetching {name}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
        
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
        
        parser = MyHTMLParser()
        parser.feed(html_content)
        text = parser.get_data()
        with open(f"scratch/{name}_text.txt", "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"Failed {name}: {e}")
