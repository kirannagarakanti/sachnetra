import zipfile
import xml.etree.ElementTree as ET
import os

def inspect_xlsx(file_path):
    print(f"\n==========================================")
    print(f"Inspecting XLSX: {file_path}")
    print(f"==========================================")
    
    if not os.path.exists(file_path):
        print("File does not exist.")
        return
        
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            # 1. Read workbook.xml to get sheet names
            workbook_xml = zip_ref.read('xl/workbook.xml')
            root_wb = ET.fromstring(workbook_xml)
            
            # Namespaces are usually present in openxml files
            ns = {
                'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
            }
            
            sheets = []
            for sheet_elem in root_wb.findall('.//main:sheet', ns):
                name = sheet_elem.get('name')
                sheet_id = sheet_elem.get('sheetId')
                r_id = sheet_elem.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                sheets.append((name, sheet_id, r_id))
                
            print(f"Sheets found ({len(sheets)}):")
            for name, sheet_id, r_id in sheets:
                print(f"  - Name: '{name}', Sheet ID: {sheet_id}, Rel ID: {r_id}")
                
            # 2. Read shared strings to resolve text values
            shared_strings = []
            if 'xl/sharedStrings.xml' in zip_ref.namelist():
                ss_xml = zip_ref.read('xl/sharedStrings.xml')
                root_ss = ET.fromstring(ss_xml)
                for si in root_ss.findall('.//main:t', ns):
                    shared_strings.append(si.text or '')
                print(f"Shared strings count: {len(shared_strings)}")
            else:
                print("No sharedStrings.xml found.")
                
            # 3. Read sheet1.xml (which represents the table data)
            sheet_files = [name for name in zip_ref.namelist() if name.startswith('xl/worksheets/sheet')]
            print(f"Worksheet files found: {sheet_files}")
            
            for sheet_file in sheet_files[:2]: # Inspect first 2 sheets
                print(f"\n--- Snippet of {sheet_file} ---")
                sheet_xml = zip_ref.read(sheet_file)
                root_sheet = ET.fromstring(sheet_xml)
                
                # Print the first 20 rows of data
                rows = root_sheet.findall('.//main:row', ns)
                print(f"Total rows in this sheet: {len(rows)}")
                
                for row in rows[:15]:
                    row_num = row.get('r')
                    cells = []
                    for c in row.findall('./main:c', ns):
                        cell_ref = c.get('r')
                        cell_type = c.get('t') # 's' for shared string, 'n' for number, etc.
                        v = c.find('main:v', ns)
                        val_str = ""
                        if v is not None:
                            val = v.text
                            if cell_type == 's' and shared_strings:
                                try:
                                    val_str = shared_strings[int(val)]
                                except:
                                    val_str = f"SS_{val}"
                            else:
                                val_str = val
                        cells.append(f"{cell_ref}:{val_str}")
                    print(f"Row {row_num}: {' | '.join(cells[:8])}")
                    
    except Exception as e:
        print(f"Error inspecting XLSX: {e}")

def main():
    inspect_xlsx("scratch/rbi_wss_t4_sample.xlsx")
    inspect_xlsx("scratch/rbi_wss_sample.xlsx")

if __name__ == "__main__":
    main()
