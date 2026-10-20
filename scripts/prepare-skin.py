from pathlib import Path
import urllib.request,zipfile,io,hashlib,json,re
from PIL import Image,ImageOps
out=Path('public/assets/surfaces');out.mkdir(parents=True,exist_ok=True)
url='https://download.cc0-textures.com/st/human_skin_2-4K.zip'
req=urllib.request.Request(url,headers={'User-Agent':'GiantsHiding-PV/0.2 github.com/555734/Giants-hiding'})
data=urllib.request.urlopen(req,timeout=120).read()
with zipfile.ZipFile(io.BytesIO(data)) as z:
 names=[n for n in z.namelist() if n.lower().endswith(('.png','.jpg','.jpeg')) and not n.startswith('__MACOSX')]
 print('Skin source maps:',names)
 def select(keys,exclude=()):
  matches=[n for n in names if any(k in n.lower() for k in keys) and not any(k in n.lower() for k in exclude)]
  assert matches,(keys,names)
  return sorted(matches,key=lambda n:('gl' not in n.lower() if 'normal' in keys else False,len(n)))[0]
 chosen={'color':select(('albedo','basecolor','base_color','diffuse','color'),('rough','normal','height')),
         'normal':select(('normal','nor_gl'),('dx','directx')),
         'roughness':select(('rough','smoothness'))}
 for key,name in chosen.items():
  with Image.open(io.BytesIO(z.read(name))) as im:
   im=im.convert('RGB')
   if key=='roughness' and 'smooth' in name.lower():im=ImageOps.invert(im)
   im.thumbnail((2048,2048),Image.Resampling.LANCZOS);im.save(out/('skin-'+key+'.jpg'),quality=94)
 (out/'skin-provenance.json').write_text(json.dumps({'source':url,'license':'CC0','author':'Share Textures','source_sha256':hashlib.sha256(data).hexdigest(),'maps':chosen},indent=2))
