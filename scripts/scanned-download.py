from pathlib import Path
import urllib.request,json,zipfile,io,hashlib,os
out=Path('private-assets');out.mkdir(exist_ok=True)
url='https://renderpeople.com/sample/free/renderpeople_free_animated_people_FBX.zip'
data=urllib.request.urlopen(url,timeout=180).read();checksum=hashlib.sha256(data).hexdigest()
expected=os.environ.get('RP_EXPECTED_SHA256')
if expected and expected!=checksum:raise RuntimeError('Actor bundle differs from the reviewed source')
print('Actor bundle SHA256:',checksum)
if os.environ.get('GITHUB_OUTPUT'):
 with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('sha='+checksum+'\n')
with zipfile.ZipFile(io.BytesIO(data)) as bundle:
 entry=next(n for n in bundle.namelist() if 'nathan' in n.lower() and n.lower().endswith('.zip'))
 with zipfile.ZipFile(io.BytesIO(bundle.read(entry))) as z:
  for info in z.infolist():
   relative=Path(info.filename.replace('\\','/'))
   if relative.is_absolute() or '..' in relative.parts:raise RuntimeError('Invalid archive member')
   dest=out/'nathan'/relative
   if info.is_dir():dest.mkdir(parents=True,exist_ok=True)
   else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(info))
(out/'source.json').write_text(json.dumps({'url':url,'license':'https://renderpeople.com/general-terms-and-conditions/','redistribute_assets':False,'sha256':checksum},indent=2))
print('Prepared transient Nathan source files; model data will not be published.')
