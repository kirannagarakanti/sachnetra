import pypdf

def run():
    pdf_path = 'scratch/posoco_psp_latest.pdf'
    print(f"Reading PDF: {pdf_path}")
    
    reader = pypdf.PdfReader(pdf_path)
    num_pages = len(reader.pages)
    print(f"Total Pages: {num_pages}")
    
    with open('scratch/pdf_text.txt', 'w', encoding='utf-8') as f_out:
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            f_out.write(f"\n======================================\n")
            f_out.write(f"PAGE {i + 1}\n")
            f_out.write(f"======================================\n")
            f_out.write(text)
            f_out.write("\n")
            
            # Search for temperature
            for term in ['temp', 'temperature', 'degree', 'weather']:
                if term in text.lower():
                    print(f"--> Found search term '{term}' on page {i + 1}!")
    print("PDF text extracted to scratch/pdf_text.txt")

run()
