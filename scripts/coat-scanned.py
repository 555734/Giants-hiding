"""Construct a separate hip-length travel coat in the native skinned rig.
The coat has its own topology, silhouette, woven UVs, collar, lapels and seams;
it is not a dye over the photographed short-sleeve shirt.
"""
from mathutils.kdtree import KDTree
world=body.matrix_world.copy();inverse=world.inverted()
points=[world@v.co for v in body.data.vertices];floor=min(p.z for p in points);factor=1.94459/(max(p.z for p in points)-floor)
hip=arm.matrix_world@arm.data.bones[prefix+'hip'].head_local
fwd=arm.matrix_world@arm.data.bones[prefix+'ball_l'].head_local-arm.matrix_world@arm.data.bones[prefix+'foot_l'].head_local;fwd.z=0;fwd.normalize()
right=fwd.cross(Vector((0,0,1))).normalized();origin=Vector((hip.x,hip.y,floor))
def native(x,y,z):return origin+(right*x+Vector((0,0,y))+fwd*z)/factor
nearest=KDTree(len(points))
for i,p in enumerate(points):nearest.insert(p,i)
nearest.balance()
coat=bpy.data.materials.new('Travel coat woven');coat.use_nodes=True
n=coat.node_tree.nodes;l=coat.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.96
for slot,file in [('Base Color','rough_linen-color.jpg'),('Normal','rough_linen-normal.jpg'),('Roughness','rough_linen-roughness.jpg')]:
 im=bpy.data.images.load(str((Path('public/assets/surfaces')/file).resolve()),check_existing=True)
 if slot!='Base Color':im.colorspace_settings.name='Non-Color'
 tex=n.new('ShaderNodeTexImage');tex.image=im
 if slot=='Normal':
  nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.24;l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
 else:l.new(tex.outputs['Color'],p.inputs[slot])
def sewn(name,coords,faces,mat,uvs=None):
 mesh=bpy.data.meshes.new(name);vertices=[native(*p) for p in coords];mesh.from_pydata([inverse@v for v in vertices],[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.parent=body.parent;obj.matrix_world=world.copy();mesh.materials.append(mat)
 for vg in body.vertex_groups:obj.vertex_groups.new(name=vg.name)
 for i,v in enumerate(vertices):
  _,index,_=nearest.find(v)
  for w in body.data.vertices[index].groups:obj.vertex_groups[w.group].add([i],w.weight,'REPLACE')
 if uvs:
  layer=mesh.uv_layers.new(name='woven-metres')
  for polygon in mesh.polygons:
   for li in polygon.loop_indices:layer.data[li].uv=uvs[mesh.loops[li].vertex_index]
 for face in mesh.polygons:face.use_smooth=True
 modifier=obj.modifiers.new('native-coat-rig','ARMATURE');modifier.object=arm
 return obj
# Chest, fitted waist, flared hips, and a visibly longer, uneven coat hem.
profile=[(.88,.211,.155),(.94,.207,.151),(1.02,.200,.147),(1.10,.191,.140),(1.18,.181,.132),(1.27,.186,.139),(1.37,.204,.154),(1.47,.220,.157),(1.54,.214,.148),(1.58,.176,.120),(1.63,.079,.075)]
original_profile=profile;profile=[]
for j in range(len(original_profile)-1):
 for i in range(5):
  t=i/5;profile.append(tuple(original_profile[j][k]*(1-t)+original_profile[j+1][k]*t for k in range(3)))
profile.append(original_profile[-1])
coords=[];uvs=[];segments=96
for row,(y,rx,rz) in enumerate(profile):
 for col in range(segments+1):
  a=col/segments*math.tau
  # Centimetre-scale gathered fabric folds, with a subdued central back vent.
  fold=(.003+.008*max(0,(1.20-y)/.32))*math.sin(a*11+.6*math.sin(y*24))+.002*math.sin(a*23-y*42)
  fold+=.004*math.exp(-((y-1.24)/.13)**2)*math.sin(y*91+math.sin(a*3)*2.4)
  fold+=.003*math.exp(-((y-1.46)/.08)**2)*math.sin(a*7+y*50)
  hem=(.012*math.cos(a*3)+.006*math.sin(a*7)) if row==0 else 0
  coords.append(((rx+fold)*math.sin(a),y+hem,(rz+fold)*math.cos(a)-.008));uvs.append((col/segments*3.7,(y-.88)/.3))
faces=[(r*(segments+1)+c,r*(segments+1)+c+1,(r+1)*(segments+1)+c+1,(r+1)*(segments+1)+c) for r in range(len(profile)-1) for c in range(segments)]
obj=sewn('travel-coat-body',coords,faces,coat,uvs)
# The lining and edge thickness survive grazing camera angles.
bpy.context.view_layer.objects.active=obj
solid=obj.modifiers.new('sewn-edge-thickness','SOLIDIFY');solid.thickness=.004/(factor*abs(world.to_scale().x));bpy.ops.object.modifier_apply(modifier=solid.name)
# A sewn central back seam and shoulder yoke deform with the coat cloth.
seam=bpy.data.materials.new('Travel seam');seam.use_nodes=True
seam.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.10,.14,.19,1)
seam.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.97
ribbon=[]
for row in range(len(profile)-1):
 # Back is angle pi, exactly on the authored folded surface.
 p=coords[row*(segments+1)+segments//2]
 ribbon.extend([(p[0]-.0016,p[1],p[2]-.0015),(p[0]+.0016,p[1],p[2]-.0015)])
sewn('travel-coat-back-seam',ribbon,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(profile)-2)],seam)
# Folded standing collar. The front tips descend onto the breast rather than
# appearing as flat paper triangles attached to the original t-shirt.
verts=[];uv=[]
for ring in [0,1,2]:
 for i in range(49):
  a=i/48*math.tau;front=max(0,math.cos(a));radius=[.080,.092,.107][ring]
  verts.append((math.sin(a)*radius,1.635+[0,.045,.020][ring]-.022*front,math.cos(a)*radius-.008));uv.append((i/48*2,ring*.2))
sewn('travel-coat-folded-collar',verts,[(r*49+i,r*49+i+1,(r+1)*49+i+1,(r+1)*49+i) for r in range(2) for i in range(48)],coat,uv)
for sign in [-1,1]:
 verts=[(sign*.05,1.61,.077),(sign*.12,1.55,.132),(sign*.067,1.40,.153),(sign*.027,1.48,.155),(sign*.063,1.55,.142)]
 sewn('travel-coat-lapel',verts,[(0,1,4),(1,2,3,4),(0,4,3)],coat,[(0,1),(.4,.8),(.2,0),(0,.3),(.2,.8)])
# Replace the short-sleeve surface appearance with the same woven coat cloth.
for o in list(bpy.data.objects):
 if o.type=='MESH' and o.name.startswith('tailored-work-sleeves'):
  o.data.materials.clear();o.data.materials.append(coat)
print('New skinned travel coat:',len(coords),'vertices, hip-length silhouette, volume collar/lapels')

# Retain a woven underlayer over the native shoulder joints. This closes the
# armholes while the separate coat supplies the new hem, silhouette and collar.
body.data.materials.append(coat);undercoat_id=len(body.data.materials)-1
for face in body.data.polygons:
 center=sum((world@body.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
 height=(center.z-floor)*factor
 influence=sum(sum(w for name,w in weights[i].items() if name.startswith(('hip','spine_','upperarm_','shoulder_'))) for i in face.vertices)/len(face.vertices)
 if face.material_index==shirt_id or (1.02<height<1.62 and influence>.45):face.material_index=undercoat_id
for item in [body,sleeves]:
 bpy.context.view_layer.objects.active=item
 modifier=item.modifiers.new('smooth-native-silhouette','SUBSURF');modifier.levels=1;bpy.ops.object.modifier_apply(modifier=modifier.name)
print('Woven coat underlayer closes shoulder and sleeve joints')
