import bpy,json
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
files=sorted(Path('private-assets').rglob('*.fbx'));assert files,list(Path('private-assets').rglob('*'))
bpy.ops.import_scene.fbx(filepath=str(files[0].resolve()),use_anim=False)
for o in bpy.data.objects:
 if o.animation_data:o.animation_data_clear()
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');arm.data.pose_position='REST'
data={'source':json.loads(Path('private-assets/source.json').read_text()),'armature':arm.name,'bones':[{'name':b.name,'parent':b.parent.name if b.parent else None,'head':list(b.head_local),'tail':list(b.tail_local)}for b in arm.data.bones],
'objects':[{'name':o.name,'type':o.type,'vertices':len(o.data.vertices) if o.type=='MESH' else None,'materials':[m.name for m in o.data.materials] if o.type=='MESH' else None}for o in bpy.data.objects],
'images':[{'name':im.name,'path':im.filepath,'size':list(im.size)}for im in bpy.data.images]}
Path('scan-inspection.json').write_text(json.dumps(data,indent=2));print('SCANNED_ACTOR_INSPECTION',json.dumps(data))
