import os
from pypdf import PdfReader

def extract_pdf(pdf_path, txt_path):
    print(f"\n--- Extracting PDF: {pdf_path} ---")
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return
        
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"Total Pages: {num_pages}")
        
        full_text = []
        # Just extract first 5 pages to see what it is
        for i in range(min(5, num_pages)):
            page = reader.pages[i]
            text = page.extract_text()
            full_text.append(f"--- PAGE {i+1} ---\n{text}")
            
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(full_text))
        print(f"Extracted text saved to: {txt_path}")
            
    except Exception as e:
        print(f"Error reading PDF: {e}")

def main():
    pdf_path = "scratch/fastag_monthly_etc_data.pdf"
    txt_path = "scratch/fastag_monthly_etc_text.txt"
    extract_pdf(pdf_path, txt_path)

if __name__ == "__main__":
    main()
