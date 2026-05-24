import os
import zipfile

def main():
    zip_path = 'scratch/fastag_data.zip'
    if not os.path.exists(zip_path):
        print(f"Zip file not found: {zip_path}")
        return
        
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            names = z.namelist()
            print(f"Total files in ZIP: {len(names)}")
            print("First 50 files:")
            for name in names[:50]:
                print(f"- {name}")
    except Exception as e:
        print(f"Error reading zip: {e}")

if __name__ == '__main__':
    main()
