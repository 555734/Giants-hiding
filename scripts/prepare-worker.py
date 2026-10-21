import sys
sys.path.append('/usr/lib/python3/dist-packages')
import bpy,json,math,shutil
from pathlib import Path
from mathutils import Vector,Matrix
from PIL import Image,ImageOps
bpy.ops.wm.read_factory_settings(use_empty=True)
private=Path('private-assets/eric');files=list(private.glob('*_zup_t.fbx'));assert files
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
 if kind=='color':shutil.copyfile(file,dest)
 else:
  with Image.open(file) as im:
   im=im.convert('RGB');limit=4096 if kind=='normal' else 2048;im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
   if kind=='roughness':im=ImageOps.invert(im).point(lambda x:max(118,min(245,x+42)))
   im.save(dest,quality=96)
 img=bpy.data.images.load(str(dest.resolve()),check_existing=True)
 if kind!='color':img.colorspace_settings.name='Non-Color'
 return img
color=texture('_dif.jpg','color');normal=texture('_norm.jpg','normal');rough=texture('_gloss.jpg','roughness')
for mat in bpy.data.materials:
 if hasattr(mat,'blend_method'):mat.blend_method='OPAQUE'
 mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
 p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.75
 out=nodes.new('ShaderNodeOutputMaterial');links.new(p.outputs['BSDF'],out.inputs['Surface'])
 for image,slot in [(color,'Base Color'),(rough,'Roughness')]:
  n=nodes.new('ShaderNodeTexImage');n.image=image;links.new(n.outputs['Color'],p.inputs[slot])
 n=nodes.new('ShaderNodeTexImage');n.image=normal;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;links.new(n.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
prefix=''
aliases={'spine':prefix+'hip','spine001':prefix+'spine_01','spine002':prefix+'spine_02','spine003':prefix+'spine_03','spine004':prefix+'head'}
for side in ['L','R']:
 for alias,suffix in [('thigh','upperleg'),('shin','lowerleg'),('foot','foot'),('upper_arm','upperarm'),('forearm','lowerarm'),('hand','hand')]:aliases[alias+side]=prefix+suffix+'_'+side.lower()
 for alias,suffix in [('f_index','index'),('f_middle','middle'),('f_ring','ring'),('f_pinky','pinky'),('thumb','thumb')]:
  for segment in ['01','02','03']:aliases[alias+segment+side]=prefix+suffix+'_'+segment+'_'+side.lower()
assert all(n in arm.data.bones for n in aliases.values())
# Identify photographed garment surfaces before export; skin uses the original scan material.
body=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
base=body.data.materials[0]
shirt=base.copy();shirt.name='Worker linen'
trousers=base.copy();trousers.name='Worker trousers'
boots=base.copy();boots.name='Worker boots'
hair=base.copy();hair.name='Scanned hair'
cuff=base.copy();cuff.name='Worker waistcoat'
eyes=base.copy();eyes.name='Worker eyes';body.data.materials.append(eyes);eyes_id=len(body.data.materials)-1
for mat in [shirt,trousers,boots,hair,cuff]:body.data.materials.append(mat)
shirt_id=len(body.data.materials)-5;trousers_id=shirt_id+1;boots_id=shirt_id+2;hair_id=shirt_id+3;cuff_id=shirt_id+4
photo=Image.open(processed/'color.jpg').convert('RGB');pixel=photo.load();pw,ph=photo.size
uv_layer=body.data.uv_layers.active.data
def influences(vertex):
 out={}
 for group in vertex.groups:
  name=body.vertex_groups[group.group].name.removeprefix(prefix)
  out[name]=out.get(name,0)+group.weight
 return out
weights=[influences(vertex) for vertex in body.data.vertices]
body_points=[body.matrix_world@vertex.co for vertex in body.data.vertices]
floor=min(p.z for p in body_points);height_scale=1.94459/(max(p.z for p in body_points)-floor)
hip_world=arm.matrix_world@arm.data.bones[prefix+'hip'].head_local
for polygon in body.data.polygons:
 group={}
 for vi in polygon.vertices:
  for key,value in weights[vi].items():group[key]=group.get(key,0)+value/len(polygon.vertices)
 u=sum(uv_layer[li].uv.x for li in polygon.loop_indices)/len(polygon.loop_indices)
 vv=sum(uv_layer[li].uv.y for li in polygon.loop_indices)/len(polygon.loop_indices)
 rgb=pixel[min(pw-1,max(0,int(u*pw))),min(ph-1,max(0,int((1-vv)*ph)))]
 white=min(rgb)>75 and max(rgb)-min(rgb)<44
 torso=sum(value for key,value in group.items() if key.startswith(('hip','spine_','upperarm_','shoulder_','neck')))
 legs=sum(value for key,value in group.items() if key.startswith(('upperleg_','lowerleg_')))
 feet=sum(value for key,value in group.items() if key.startswith(('foot_','ball_')))
 center=sum((body_points[vi] for vi in polygon.vertices),Vector())/len(polygon.vertices)
 relative_height=(center.z-floor)*height_scale
 if group.get('eye_l',0)+group.get('eye_r',0)>.55:polygon.material_index=eyes_id;continue
 protected=sum(value for key,value in group.items() if key.startswith(('head','neck','jaw','eye','mouth','hand','thumb','index','middle','ring','pinky')))
 if protected>.22:continue
 if (torso>.45 and white) or sum(v for k,v in group.items() if k.startswith(('upperarm','lowerarm')) )>.55:polygon.material_index=shirt_id
 elif torso>.45 and relative_height<1.70:polygon.material_index=cuff_id
 elif feet>.48:polygon.material_index=boots_id
 elif legs>.60 or (group.get('hip',0)>.50 and center.z<hip_world.z+.05):polygon.material_index=trousers_id
 elif group.get('head',0)>.5 and relative_height>1.845 and max(rgb)<145:polygon.material_index=hair_id
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
bpy.ops.export_scene.gltf(filepath=str((out/'worker-actor.glb').resolve()),export_format='GLB',export_animations=False,export_skins=True,export_yup=True,export_apply=False)
contract={'height':1.94459,'aliases':aliases,'source':'Renderpeople Eric Rigged 001','license':'https://renderpeople.com/general-terms-and-conditions/','redistribute_assets':False}
(out/'worker-actor.json').write_text(json.dumps(contract,indent=2))
print('Prepared transient actor GLB:',(out/'worker-actor.glb').stat().st_size,'normalization',scale,yaw,list(lo),list(hi))
