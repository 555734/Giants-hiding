import sys
sys.path.append('/usr/lib/python3/dist-packages')
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
from PIL import Image,ImageOps
bpy.ops.wm.read_factory_settings(use_empty=True)
private=Path('private-assets');files=sorted(p for p in private.rglob('*') if p.suffix.lower()=='.fbx');assert files
bpy.ops.import_scene.fbx(filepath=str(files[0].resolve()),use_anim=False)
for o in bpy.data.objects:
 if o.animation_data:o.animation_data_clear()
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');arm.data.pose_position='REST'
for pb in arm.pose.bones:pb.matrix_basis.identity()
bpy.context.view_layer.update()
processed=private/'processed';processed.mkdir(exist_ok=True)
def texture(suffix,kind):
 file=next(p for p in private.rglob('*') if p.name.lower().endswith(suffix))
 dest=processed/(kind+'.jpg')
 with Image.open(file) as im:
  im=im.convert('RGB');im.thumbnail((4096,4096),Image.Resampling.LANCZOS)
  if kind=='roughness':im=ImageOps.invert(im).point(lambda x:max(76,min(245,x+25)))
  im.save(dest,quality=96)
 img=bpy.data.images.load(str(dest.resolve()),check_existing=True)
 if kind!='color':img.colorspace_settings.name='Non-Color'
 return img
color=texture('_dif.jpg','color');normal=texture('_norm.jpg','normal');rough=texture('_gloss.jpg','roughness')
for mat in bpy.data.materials:
 mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
 p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.75
 out=nodes.new('ShaderNodeOutputMaterial');links.new(p.outputs['BSDF'],out.inputs['Surface'])
 for image,slot in [(color,'Base Color'),(rough,'Roughness')]:
  n=nodes.new('ShaderNodeTexImage');n.image=image;links.new(n.outputs['Color'],p.inputs[slot])
 n=nodes.new('ShaderNodeTexImage');n.image=normal;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;links.new(n.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
prefix='rp_nathan_animated_003_walking_'
aliases={'spine':prefix+'hip','spine001':prefix+'spine_01','spine002':prefix+'spine_02','spine003':prefix+'spine_03','spine004':prefix+'head'}
for side in ['L','R']:
 for alias,suffix in [('thigh','upperleg'),('shin','lowerleg'),('foot','foot'),('upper_arm','upperarm'),('forearm','lowerarm'),('hand','hand')]:aliases[alias+side]=prefix+suffix+'_'+side.lower()
 for alias,suffix in [('f_index','index'),('f_middle','middle'),('f_ring','ring'),('f_pinky','pinky'),('thumb','thumb')]:
  for segment in ['01','02','03']:aliases[alias+segment+side]=prefix+suffix+'_'+segment+'_'+side.lower()
assert all(n in arm.data.bones for n in aliases.values())
points=[o.matrix_world@Vector(c) for o in bpy.data.objects if o.type=='MESH' for c in o.bound_box]
lo=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)));hi=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
hip=arm.matrix_world@arm.data.bones[prefix+'hip'].head_local
ball=arm.matrix_world@arm.data.bones[prefix+'ball_l'].head_local;foot=arm.matrix_world@arm.data.bones[prefix+'foot_l'].head_local;forward=ball-foot
yaw=-math.pi/2-math.atan2(forward.y,forward.x)
scale=1.94459/(hi.z-lo.z);anchor=Vector((hip.x,hip.y,lo.z))
root=bpy.data.objects.new('actor-normalization',None);bpy.context.collection.objects.link(root)
for o in list(bpy.data.objects):
 if o!=root and o.parent is None:
  world=o.matrix_world.copy();o.parent=root;o.matrix_world=world
root.matrix_world=Matrix.Scale(scale,4)@Matrix.Rotation(yaw,4,'Z')@Matrix.Translation(-anchor)
bpy.context.view_layer.update()
out=Path('public/assets');out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str((out/'scanned-actor.glb').resolve()),export_format='GLB',export_animations=False,export_skins=True,export_yup=True,export_apply=False)
contract={'height':1.94459,'aliases':aliases,'source':'Renderpeople Nathan Animated 003 Walking','license':'https://renderpeople.com/general-terms-and-conditions/','redistribute_assets':False}
(out/'scanned-actor.json').write_text(json.dumps(contract,indent=2))
print('Prepared transient actor GLB:',(out/'scanned-actor.glb').stat().st_size,'normalization',scale,yaw,list(lo),list(hi))
