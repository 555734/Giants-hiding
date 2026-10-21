"""Licensed transient actor source; never publish its model or texture data."""
from pathlib import Path
import urllib.request,zipfile,io,hashlib,json
url='https://renderpeople.com/sample/free/rp_eric_rigged_001_FBX.zip'
expected='55b763ebea36cc8747a57a26cc46252fb0fa195c92ef87a12f0cf42f23264383'
data=urllib.request.urlopen(url,timeout=180).read()
if hashlib.sha256(data).hexdigest()!=expected:raise RuntimeError('Worker source differs from reviewed official sample')
out=Path('private-assets/eric');out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(io.BytesIO(data)) as z:
 for info in z.infolist():
  relative=Path(info.filename.replace('\\','/'))
  if relative.is_absolute() or '..' in relative.parts:raise RuntimeError('Invalid member')
 z.extractall(out)
(out/'source.json').write_text(json.dumps({'url':url,'sha256':expected,'redistribute_assets':False}))
print('Prepared private Eric source')
