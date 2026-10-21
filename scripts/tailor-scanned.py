"""Fitted, skinned garment construction; never distribute the derived scan."""
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
import bmesh

# Work in metres, with +Z up and -Y forward, independently of FBX units.
world=body.matrix_world.copy();inverse=world.inverted()
points=[world@vertex.co for vertex in body.data.vertices]
lo=min(p.z for p in points);hi=max(p.z for p in points)
factor=1.94459/(hi-lo)
hip=arm.matrix_world@arm.data.bones[prefix+'hip'].head_local
fwd=arm.matrix_world@arm.data.bones[prefix+'ball_l'].head_local-arm.matrix_world@arm.data.bones[prefix+'foot_l'].head_local
fwd.z=0;fwd.normalize();right=fwd.cross(Vector((0,0,1))).normalized()
anchor=Vector((hip.x,hip.y,lo))
def model(p):
 d=p-anchor
 return Vector((d.dot(right)*factor,d.z*factor,d.dot(fwd)*factor))
def native(p):return anchor+(right*p.x+Vector((0,0,p.y))+fwd*p.z)/factor
coords=[model(p) for p in points]
normal_matrix=world.to_3x3().inverted().transposed()

# Give the existing photographed folds fabric volume and a longer jacket hem.
garment={vi for polygon in body.data.polygons if polygon.material_index==shirt_id for vi in polygon.vertices}
for vi in garment:
 vertex=body.data.vertices[vi];p=coords[vi];n=(normal_matrix@vertex.normal).normalized()
 waist=max(0,1-abs(p.y-1.14)/.24)
 fold=.0035*math.sin(p.y*66+p.x*14)*math.sin(p.x*31+p.z*23)
 d=.010+waist*.006+fold
 q=points[vi]+n*d
 if p.y<1.13:q.z-=max(0,1-(p.y-1.01)/.12)*.035
 vertex.co=inverse@q
body.data.update()

tree=KDTree(len(points))
for i,p in enumerate(points):tree.insert(p,i)
tree.balance()
bvh=BVHTree.FromPolygons([world@v.co for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
def surface(x,y,front=True,offset=.0018):
 origin=native(Vector((x,y,.65 if front else -.65)))
 direction=-fwd if front else fwd
 hit,normal,_,_=bvh.ray_cast(origin,direction,1.3/factor)
 if hit is None:raise RuntimeError('Garment surface missing at '+str((x,y,front)))
 return hit+normal*offset/factor

trim=bpy.data.materials.new('Jacket seams');trim.use_nodes=True
trim.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.98
lining=bpy.data.materials.new('Linen collar');lining.use_nodes=True
lining.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
button=bpy.data.materials.new('Horn buttons');button.use_nodes=True
button.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.56
collar=bpy.data.materials.new('Fitted jacket collar');collar.use_nodes=True
collar.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
shirt_tree=KDTree(len(garment))
for i in garment:shirt_tree.insert(points[i],i)
shirt_tree.balance()

created=[]
source_uv={}
for polygon in body.data.polygons:
 for li in polygon.loop_indices:source_uv[body.data.loops[li].vertex_index]=body.data.uv_layers.active.data[li].uv.copy()
def skinned(name,vertices,polygons,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([inverse@p for p in vertices],[],polygons);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.parent=body.parent;obj.matrix_world=world.copy();mesh.materials.append(material)
 for vg in body.vertex_groups:obj.vertex_groups.new(name=vg.name)
 for i,p in enumerate(vertices):
  _,index,_=tree.find(p)
  for vg in body.data.vertices[index].groups:obj.vertex_groups[vg.group].add([i],vg.weight,'REPLACE')
 if material==shirt:
  uv=mesh.uv_layers.new(name='scan-fitted-cloth-uv')
  for polygon in mesh.polygons:
   for li in polygon.loop_indices:
    _,index,_=shirt_tree.find(vertices[mesh.loops[li].vertex_index]);uv.data[li].uv=source_uv[index]
 modifier=obj.modifiers.new('native-garment-skin','ARMATURE');modifier.object=arm
 for polygon in mesh.polygons:polygon.use_smooth=True
 created.append(obj);return obj

def ribbon(name,path,width=.003,front=True,material=trim):
 vertices=[]
 for i,(x,y) in enumerate(path):
  previous=Vector(path[max(0,i-1)]);following=Vector(path[min(len(path)-1,i+1)])
  tangent=(following-previous).normalized();side=Vector((-tangent.y,tangent.x))*width*.5
  for sign in [-1,1]:vertices.append(surface(x+side.x*sign,y+side.y*sign,front))
 return skinned(name,vertices,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)],material)

def sample_line(a,b,n=20):return [(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n) for i in range(n+1)]

# Flat seams lie on the body, including the back visible to the follow camera.
for front in [True,False]:
 for side in [-1,1]:
  ribbon('jacket-shoulder-seam',sample_line((side*.065,1.61),(side*.19,1.55)),.003,front)
  ribbon('jacket-side-seam',sample_line((side*.142,1.53),(side*.155,1.055)),.003,front)
 ribbon('jacket-hem-stitch',[(x,1.055+.005*math.sin(x*25)) for x in [-.16+i*.008 for i in range(41)]],.003,front)
 # A central tailored back seam catches the grazing light without a pasted decal.
 if not front:ribbon('jacket-back-seam',sample_line((0,1.60),(0,1.055)),.0025,False)

ribbon('jacket-front-placket',sample_line((.004,1.55),(.004,1.055)),.022,True,shirt)
for side in [-1,1]:
 # Patch pockets with sewn edges, scaled to the actual torso rather than boxes.
 path=[(side*.052,1.23),(side*.142,1.23),(side*.142,1.12),(side*.052,1.12)]
 vertices=[surface(x,y,True,.0025) for x,y in path]
 skinned('jacket-pocket',vertices,[(0,1,2),(0,2,3)],shirt)
 ribbon('pocket-stitch',path+[path[0]],.003,True)

for y in [1.12,1.22,1.32,1.42,1.52]:
 center=surface(.004,y,True,.006);vertices=[]
 for ring in [0,1]:
  for i in range(12):
   a=i*math.tau/12;vertices.append(center+right*math.cos(a)*.006/factor+Vector((0,0,math.sin(a)*.006/factor))+fwd*(ring*.003/factor))
 faces=[tuple(range(12,24))]+[(i,(i+1)%12,(i+1)%12+12,i+12) for i in range(12)]
 skinned('horn-button',vertices,faces,button)

# Separate the two actual eyeballs by connected component. A body-wide scan
# material made the entire iris nearly black at giant scale.
adj=[[] for vertex in body.data.vertices]
for edge in body.data.edges:
 a,b=edge.vertices;adj[a].append(b);adj[b].append(a)
seen=set();eye_vertices=set()
for vi in range(len(adj)):
 if vi in seen:continue
 stack=[vi];seen.add(vi);component=[]
 while stack:
  i=stack.pop();component.append(i)
  for j in adj[i]:
   if j not in seen:seen.add(j);stack.append(j)
 center=sum((coords[i] for i in component),Vector())/len(component)
 if not (1.78<center.y<1.84 and .015<abs(center.x)<.055 and len(component)<1000):continue
 eye_vertices.update(component)
 subset=set(component);faces=[p for p in body.data.polygons if all(i in subset for i in p.vertices)]
 lookup={old:i for i,old in enumerate(component)}
 eye_mat=bpy.data.materials.get('Anatomical eye') or bpy.data.materials.new('Anatomical eye')
 eye_mat.use_nodes=True;eye_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.20
 eye=skinned('anatomical-eye-left' if center.x>0 else 'anatomical-eye-right',[points[i] for i in component],[[lookup[i] for i in p.vertices] for p in faces],eye_mat)
 uv=eye.data.uv_layers.new(name='anatomical-eye-uv')
 for polygon in eye.data.polygons:
  for li in polygon.loop_indices:
   direction=(coords[component[eye.data.loops[li].vertex_index]]-center).normalized()
   uv.data[li].uv=(.5+math.atan2(direction.x,direction.z)/math.tau,.5+math.asin(max(-1,min(1,direction.y)))/math.pi)
 modifier=eye.modifiers.new('eye-silhouette','SUBSURF');modifier.levels=1
 bpy.context.view_layer.objects.active=eye;bpy.ops.object.modifier_apply(modifier=modifier.name)
if len(eye_vertices)==0:raise RuntimeError('Native eyeball components were not found')
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[bm.verts[i] for i in eye_vertices],context='VERTS');bm.to_mesh(body.data);bm.free()
print('Separate anatomical eyes:',len(eye_vertices),'source vertices')

# Bake the small sewn pieces into one skinned draw per material.
groups=[[o for o in created if o.data.materials[0]==material] for material in [trim,lining,button,cloth,shirt,collar]]
for objects in groups:
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()

# Smooth silhouette and joints before runtime. Keep the authored bone weights.
for obj in [body,sleeves]:
 bpy.context.view_layer.objects.active=obj
 modifier=obj.modifiers.new('garment-silhouette','SUBSURF');modifier.levels=1;modifier.render_levels=1
 # Applying subdivision after the Armature modifier is safe in rest pose.
 bpy.ops.object.modifier_apply(modifier=modifier.name)
print('Tailored jacket: fitted seams, pockets, articulated cloth')
