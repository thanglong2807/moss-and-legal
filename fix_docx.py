"""Remove Google Docs customXml from all docx files in LLC2 folder."""
import zipfile, io, glob, re, os, shutil, sys
sys.stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8', closefd=False)

folder = "app/templates/tldn/LLC2"
skip = {'customXml/item1.xml', 'customXml/itemProps1.xml', 'customXml/_rels/item1.xml.rels'}

files = glob.glob(f"{folder}/*.docx")
for src in files:
    if '_fixed' in src or '_clean' in src:
        continue
    with zipfile.ZipFile(src, 'r') as zin:
        names = zin.namelist()
        if 'customXml/item1.xml' not in names:
            print(f"SKIP (no google xml): {os.path.basename(src)}")
            continue

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in skip:
                    continue
                data = zin.read(item.filename)
                if item.filename == '[Content_Types].xml':
                    text = data.decode('utf-8')
                    text = re.sub(r'<Override PartName="/customXml/itemProps1\.xml"[^/]*/>', '', text)
                    data = text.encode('utf-8')
                if 'document.xml.rels' in item.filename:
                    text = data.decode('utf-8')
                    text = re.sub(r'<Relationship[^>]*customXml/item1\.xml[^>]*/>', '', text)
                    data = text.encode('utf-8')
                zout.writestr(item, data)

    backup = src + '.bak'
    shutil.copy2(src, backup)
    with open(src, 'wb') as f:
        f.write(buf.getvalue())
    print(f"FIXED: {os.path.basename(src)}")

print("Done")
