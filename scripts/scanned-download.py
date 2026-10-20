from pathlib import Path
import urllib.request,re,html,json,zipfile,io
out=Path('private-assets');out.mkdir(exist_ok=True)
page=urllib.request.urlopen('https://renderpeople.com/free-3d-people/').read().decode()
page=html.unescape(page.replace('\\/','/'))
urls=sorted(set(re.findall(r"""['"]([^'"]+\.zip(?:\?[^'"]*)?)['"]""",page)))
urls=[u if u.startswith('http') else 'https://renderpeople.com/'+u.lstrip('/') for u in urls]
print('Official free download ZIPs:',json.dumps(urls,indent=2))
fbx=[u for u in urls if 'fbx' in u.lower() and ('nathan' in u.lower() or 'animated' in u.lower())]
if not fbx:
 print('Page download fragments:',re.findall(r'.{0,100}(?:nathan|animated_003|FBX.zip).{0,160}',page)[:20]);raise RuntimeError('Animated FBX URL not found in official download page')
url=fbx[0];print('Selected official sample:',url)
data=urllib.request.urlopen(url,timeout=180).read()
with zipfile.ZipFile(io.BytesIO(data)) as z:
 print('Sample archive files:',json.dumps(z.namelist(),indent=2))
 z.extractall(out)
(out/'source.json').write_text(json.dumps({'url':url,'license':'https://renderpeople.com/general-terms-and-conditions/','redistribute_assets':False},indent=2))
