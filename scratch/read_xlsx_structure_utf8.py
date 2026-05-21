import zipfile
import xml.etree.ElementTree as ET
import os
import sys

# Ensure stdout encodes to utf-8 or replaces characters safely
sys.stdout.reconfigure(encoding='utf-8')

def get_sheet_data(zip_ref, sheet_path, shared_strings, ns):
    if sheet_path not in zip_ref.namelist():
        return []
    
    sheet_xml = zip_ref.read(sheet_path)
    root_sheet = ET.fromstring(sheet_xml)
    
    rows_data = []
    for row in root_sheet.findall('.//main:row', ns):
        row_num = int(row.get('r'))
        row_cells = {}
        for c in row.findall('./main:c', ns):
            cell_ref = c.get('r')
            cell_type = c.get('t')
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
            
            # Extract column letter (e.g., A from A1, B from B12)
            col_letter = ''.join([char for char in cell_ref if char.isalpha()])
            row_cells[col_letter] = val_str
            
        rows_data.append((row_num, row_cells))
    return rows_data

def print_sheet_rows(sheet_name, rows_data, max_rows=35):
    print(f"\n==========================================")
    print(f"Sheet: {sheet_name} (Showing first {max_rows} rows)")
    print(f"==========================================")
    for row_num, cells in rows_data[:max_rows]:
        cols = sorted(cells.keys())
        col_str = " | ".join([f"{col}:{cells[col]}" for col in cols])
        # Clean special chars that might crash print
        col_str = col_str.replace('\u20b9', 'INR')
        print(f"Row {row_num:2d}: {col_str}")

def main():
    file_path = "scratch/rbi_wss_sample.xlsx"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    ns = {
        'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        # Load shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in zip_ref.namelist():
            ss_xml = zip_ref.read('xl/sharedStrings.xml')
            root_ss = ET.fromstring(ss_xml)
            for si in root_ss.findall('.//main:t', ns):
                shared_strings.append(si.text or '')
                
        # We know sheet mappings:
        # T_1 -> xl/worksheets/sheet1.xml
        # T_2 -> xl/worksheets/sheet2.xml
        # T_4 -> xl/worksheets/sheet4.xml
        # T_6 -> xl/worksheets/sheet6.xml
        # T_7 -> xl/worksheets/sheet7.xml
        
        t1_data = get_sheet_data(zip_ref, 'xl/worksheets/sheet1.xml', shared_strings, ns)
        print_sheet_rows('T_1 (RBI Liabilities & Assets)', t1_data, 30)
        
        t2_data = get_sheet_data(zip_ref, 'xl/worksheets/sheet2.xml', shared_strings, ns)
        print_sheet_rows('T_2 (Foreign Exchange Reserves)', t2_data, 20)
        
        t4_data = get_sheet_data(zip_ref, 'xl/worksheets/sheet4.xml', shared_strings, ns)
        print_sheet_rows('T_4 (SCB Business in India)', t4_data, 35)
        
        t6_data = get_sheet_data(zip_ref, 'xl/worksheets/sheet6.xml', shared_strings, ns)
        print_sheet_rows('T_6 (Money Stock)', t6_data, 30)
        
        t7_data = get_sheet_data(zip_ref, 'xl/worksheets/sheet7.xml', shared_strings, ns)
        print_sheet_rows('T_7 (Reserve Money)', t7_data, 30)

if __name__ == "__main__":
    main()
