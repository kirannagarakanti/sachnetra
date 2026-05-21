import urllib.request
import os

def main():
    url = "https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.XLSX"
    dest = "scratch/python_wss_sample.xlsx"
    
    print(f"Downloading {url} via Python urllib...")
    try:
        # Try default headers (no custom user agent)
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read()
            print(f"Status Code: {response.status}")
            print(f"Content Length: {len(content)} bytes")
            print(f"Headers: {response.headers}")
            
            # Check if it's HTML
            if content.startswith(b"<!DOCTYPE html>") or content.startswith(b"<html>"):
                print("Warning: Body starts with HTML. It is likely a challenge page!")
                # Print first 200 chars
                print(content[:200].decode('utf-8', errors='ignore'))
            else:
                print("Success! Body is binary (not HTML). Saving file...")
                with open(dest, "wb") as f:
                    f.write(content)
                print(f"Saved to {dest}")
                
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    main()
