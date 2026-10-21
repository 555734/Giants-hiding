"""Extract six architectural prefabs from the CC-BY 4.0 ORCA Bistro scene.
Run with Blender. Only building geometry is retained; source street props,
vehicles, signs and antennas are not used. Authored UVs and PBR maps survive.
"""
import bpy,sys,os,re,json,math
sys.path.append('/usr/lib/python3/dist-packages')
from pathlib import Path
from mathutils import Vector,Matrix
from PIL import Image,ImageOps
import numpy as np
source=Path(os.environ.get('BISTRO_SOURCE','private-assets/bistro/Bistro_v5_2'))
cache=Path('private-assets/architecture-textures');cache.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str((source/'BistroExterior.fbx').resolve()),use_anim=False)
objects=[o for o in bpy.data.objects if o.type=='MESH']
def bounds(o):
 p=[o.matrix_world@Vector(c) for c in o.bound_box]
 return Vector([min(v[i] for v in p) for i in range(3)]),Vector([max(v[i] for v in p) for i in range(3)])
selected=[];variants=[]
for number in [2,3,4,5,7,8]:
 candidates=[o for o in objects if re.search('paris_building_0'+str(number),o.name,re.I)]
 anchor=max(candidates,key=lambda o:len(o.data.polygons));lo,hi=bounds(anchor)
 cluster=[]
 for o in candidates:
  a,b=bounds(o);center=(a+b)*.5
  if all(lo[i]-2<center[i]<hi[i]+2 for i in [0,1]):cluster.append(o)
 extent=[bounds(o) for o in cluster]
 floor=min(a.z for a,b in extent);cx=(lo.x+hi.x)*.5;cy=(lo.y+hi.y)*.5
 # Preserve metre units. Each runtime placement has its own uniform scale.
 transform=Matrix.Translation(Vector((-cx,-cy,-floor)))
 root=bpy.data.objects.new('Palazzo_%02d_high'%number,None);bpy.context.collection.objects.link(root)
 for o in cluster:
  o.data=o.data.copy();o.data.transform(transform@o.matrix_world);o.parent=root;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=Matrix.Identity(4)
  o.name='architecture-%02d-%s'%(number,o.name[-12:]);selected.append(o)
 variants.append((number,root,cluster))
keep=set(selected)
for o in list(bpy.data.objects):
 if o.type=='MESH' and o not in keep:bpy.data.objects.remove(o,do_unlink=True)
used={m for o in selected for m in o.data.materials if m}
print('ARCHITECTURE',len(selected),'meshes',len(used),'materials',flush=True)
def texture(name,kind):
 path=source/'Textures'/name
 if not path.exists():return None
 output=cache/(path.stem+('-opengl-v2.png' if kind=='normal' else '.jpg'))
 if output.exists():
  try:
   with Image.open(output) as cached:cached.load()
  except (OSError,ValueError,SyntaxError):output.unlink()
 if not output.exists():
  with Image.open(path) as im:
   im=im.convert('RGB');im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
   if kind=='normal':
    # ORCA uses BC5 two-channel tangent normals: DDS has R/G but zero B.
    # Reconstruct positive Z before DirectX-to-OpenGL green inversion.
    a=np.array(im,dtype=np.float32)
    if a[:,:,2].max()<2:
     x=a[:,:,0]/127.5-1;y=a[:,:,1]/127.5-1
     a[:,:,2]=(np.sqrt(np.maximum(0,1-x*x-y*y))*.5+.5)*255
    a[:,:,1]=255-a[:,:,1];im=Image.fromarray(np.rint(a).clip(0,255).astype('uint8'),'RGB')
   if kind=='color' and any(s in name.lower() for s in ['roof','tiles']):
    # Adapt the Paris slate roof palette to the game's warm port city.
    gray=ImageOps.grayscale(im);im=ImageOps.colorize(gray,'#322c29','#a87855')
   temporary=output.with_name(output.stem+'.building'+output.suffix)
   if output.suffix=='.png':im.save(temporary,format='PNG')
   else:im.save(temporary,format='JPEG',quality=90)
   temporary.replace(output)
 image=bpy.data.images.load(str(output.resolve()),check_existing=True)
 if not image.packed_file:image.pack()
 if kind!='color':image.colorspace_settings.name='Non-Color'
 return image
for mat in used:
 paths=[Path(n.image.filepath).name for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if mat.use_nodes else []
 names={k:next((n for n in paths if n.endswith(s)),None) for k,s in [('color','_BaseColor.dds'),('normal','_Normal.dds'),('orm','_Specular.dds')]}
 if hasattr(mat,'blend_method'):mat.blend_method='OPAQUE'
 mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
 p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.8
 out=nodes.new('ShaderNodeOutputMaterial');links.new(p.outputs['BSDF'],out.inputs['Surface'])
 for kind,name in names.items():
  if not name:continue
  im=texture(name,kind)
  if not im:continue
  node=nodes.new('ShaderNodeTexImage');node.image=im
  if kind=='color':links.new(node.outputs['Color'],p.inputs['Base Color'])
  elif kind=='normal':
   nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.75;links.new(node.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
  else:
   separate=nodes.new('ShaderNodeSeparateColor');links.new(node.outputs['Color'],separate.inputs['Color']);links.new(separate.outputs['Green'],p.inputs['Roughness']);links.new(separate.outputs['Blue'],p.inputs['Metallic'])
 # Building glazing is opaque dark glass, avoiding layered transparency costs.
 if 'Glass' in mat.name:p.inputs['Roughness'].default_value=.25
 mat.name='Bistro '+mat.name
# Join each prefab so the exporter groups primitives by material; then make a
# separate simplified LOD. Both LODs share texture images in the single GLB.
for number,root,cluster in variants:
 bpy.ops.object.select_all(action='DESELECT')
 for o in cluster:o.select_set(True)
 bpy.context.view_layer.objects.active=cluster[0];bpy.ops.object.join();mesh=bpy.context.object
 mesh.name='Palazzo_%02d_mesh'%number
 for polygon in mesh.data.polygons:polygon.use_smooth=True
 lowroot=bpy.data.objects.new('Palazzo_%02d_low'%number,None);bpy.context.collection.objects.link(lowroot)
 low=mesh.copy();low.data=mesh.data.copy();bpy.context.collection.objects.link(low);low.parent=lowroot;low.name='Palazzo_%02d_lod'%number
 bpy.context.view_layer.objects.active=low
 dec=low.modifiers.new('distant-silhouette','DECIMATE');dec.ratio=.12;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 print('PREFAB',number,len(mesh.data.polygons),len(low.data.polygons),flush=True)
# Remove non-mesh source hierarchy, cameras and lights; retain the prefab roots.
roots={v[1] for v in variants}|{o for o in bpy.data.objects if o.name.startswith('Palazzo_') and o.type=='EMPTY'}
for o in list(bpy.data.objects):
 if o.type!='MESH' and o not in roots:bpy.data.objects.remove(o,do_unlink=True)
out=Path('public/assets');out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str((out/'city-kit.glb').resolve()),export_format='GLB',export_animations=False,export_yup=True,export_cameras=False,export_lights=False)
(out/'city-kit.json').write_text(json.dumps({'source':'Amazon Lumberyard Bistro / NVIDIA ORCA','url':'https://developer.nvidia.com/orca/amazon-lumberyard-bistro','license':'CC-BY-4.0','converter':bpy.app.version_string,'normal_maps':'BC5 positive Z reconstruction and DirectX-to-OpenGL green inversion','modifications':'Architecture-only extraction, metre pivots, converted PBR maps, recolored roofs, generated LODs','variants':[v[0] for v in variants]},indent=2))
print('EXPORTED', (out/'city-kit.glb').stat().st_size,flush=True)
