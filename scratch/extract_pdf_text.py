import os
from pypdf import PdfReader

def check_pdf(pdf_path):
    print(f"\n--- Checking PDF: {pdf_path} ---")
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return
        
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"Total Pages: {num_pages}")
        
        # Try to extract text from page 1
        page1 = reader.pages[0]
        text = page1.extract_text()
        
        if text.strip():
            print("PDF is TEXT-EXTRACTABLE (contains digital text).")
            print("Length of Page 1 text:", len(text))
            print("Page 1 preview (first 1000 characters):")
            print("-" * 50)
            print(text[:1000])
            print("-" * 50)
        else:
            print("PDF appears to be SCANNED / IMAGE-ONLY (no text extracted).")
            
    except Exception as e:
        print(f"Error reading PDF: {e}")

def main():
    check_pdf("scratch/rbi_wss_sample.pdf")
    check_pdf("scratch/rbi_wss_t4_sample.pdf")

if __name__ == "__main__":
    main()
