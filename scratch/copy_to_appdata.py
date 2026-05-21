import os
import shutil

def main():
    src_dir = "scratch"
    dest_dir = r"C:\Users\Daniel Reddy\.gemini\antigravity\brain\fa119086-8527-4709-8f57-0ec605d0826d\scratch"
    
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        print(f"Created directory: {dest_dir}")
        
    files_to_copy = [
        "rbi_wss_sample.xlsx",
        "rbi_wss_sample.pdf",
        "download_rbi_files.mjs",
        "test_node_python_ua.mjs",
        "write_xlsx_structure_file.py",
        "xlsx_structure_utf8.txt"
    ]
    
    for f in files_to_copy:
        src_path = os.path.join(src_dir, f)
        dest_path = os.path.join(dest_dir, f)
        if os.path.exists(src_path):
            shutil.copy2(src_path, dest_path)
            print(f"Copied {f} to {dest_path}")
        else:
            print(f"Source file not found: {src_path}")

if __name__ == "__main__":
    main()
