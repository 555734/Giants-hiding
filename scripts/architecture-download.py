"""Fetch the publicly redistributable CC-BY 4.0 architecture source once."""
from pathlib import Path
import urllib.request,zipfile,hashlib
out=Path('private-assets/bistro');out.mkdir(parents=True,exist_ok=True)
archive=out/'bistro.zip'
if not archive.exists():
 request=urllib.request.Request('https://developer.nvidia.com/bistro',headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(request,timeout=240) as source,archive.open('wb') as target:
  while block:=source.read(1024*1024):target.write(block)
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
if checksum!='0d50e3c724c6c5da19f8eb99ad3f53e36fec37ffa2df9621f9ccf0603f3934e1':raise RuntimeError('Architecture source differs from the reviewed Bistro v5.2')
print('Bistro SHA256',checksum)
with zipfile.ZipFile(archive) as z:
 for info in z.infolist():
  relative=Path(info.filename)
  if relative.is_absolute() or '..' in relative.parts:raise ValueError('Unsafe archive member')
 z.extractall(out)
