import zipfile
import xml.etree.ElementTree as ET
import os

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
        # 1. Parse workbook.xml
        wb_xml = zip_ref.read('xl/workbook.xml')
        root_wb = ET.fromstring(wb_xml)
        
        # 2. Parse workbook.xml.rels
        rels_xml = zip_ref.read('xl/_rels/workbook.xml.rels')
        root_rels = ET.fromstring(rels_xml)
        
        # Map relation ID to target path
        r_map = {}
        for rel in root_rels.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rid = rel.get('Id')
            target = rel.get('Target')
            r_map[rid] = target

        print("Sheets in workbook:")
        for sheet in root_wb.findall('.//main:sheet', ns):
            name = sheet.get('name')
            rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            path = r_map.get(rid)
            print(f"Name: {name:15s} | RelId: {rid:10s} | Path: xl/{path}")

if __name__ == "__main__":
    main()
