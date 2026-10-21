import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {seeded} from './materials';
/** Authored three-dimensional façades replace the former box-house generator. */
export async function buildArchitecture(scene:T.Scene,height:(x:number,z:number)=>number){
 const roofMaps=await Promise.all(['color','normal','roughness'].map(k=>new T.TextureLoader().loadAsync('./assets/surfaces/roof-'+k+'.jpg')));
 roofMaps.forEach((map,i)=>{map.flipY=false;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;if(i===0)map.colorSpace=T.SRGBColorSpace;});
 const asset=await new GLTFLoader().loadAsync('./assets/city-kit.glb');asset.scene.updateMatrixWorld(true);
 const variants=[2,3,4,5,7,8],random=seeded(619),placements=new Map<string,T.Matrix4[]>(),dummy=new T.Object3D();
 for(let row=0;row<9;row++)for(const side of [-1,1])for(let col=0;col<7;col++){
  const x=side*(39+col*31)+(random()-.5)*3,z=27+row*33+(random()-.5)*3;
  const id=variants[(row*3+col+(side>0?1:0))%variants.length],scale=.61+random()*.10;
  const lod=Math.hypot(x,z)<112?'high':'low',name=`Palazzo_${String(id).padStart(2,'0')}_${lod}`;
  dummy.position.set(x,height(x,z),z);dummy.rotation.set(0,(col===0?(side>0?-Math.PI/2:Math.PI/2):Math.floor(random()*4)*Math.PI/2),0);dummy.scale.set(scale,scale*(.91+random()*.15),scale);dummy.updateMatrix();
  if(!placements.has(name))placements.set(name,[]);placements.get(name)!.push(dummy.matrix.clone());
 }
 let triangles=0;
 for(const [name,matrices]of placements){
  const root=asset.scene.getObjectByName(name);if(!root)throw Error('Architecture prefab missing: '+name);
  const extent=new T.Box3().setFromObject(root).getSize(new T.Vector3());if(extent.y<10||extent.y>60||Math.max(extent.x,extent.z)>80)throw Error('Architecture units invalid: '+name+' '+extent.toArray());
  root.traverse(o=>{if(!(o as T.Mesh).isMesh)return;const source=o as T.Mesh;
   const materials=Array.isArray(source.material)?source.material:[source.material];
   for(const mat of materials){const m=mat as T.MeshStandardMaterial;m.envMapIntensity=.55;if(/Concrete|Brick_Large_Beige|Building_Details/.test(m.name))m.color.set(0xc9bba2);if(/Roofing/.test(m.name)){m.map=roofMaps[0];m.normalMap=roofMaps[1];m.roughnessMap=roofMaps[2];m.metalness=0;m.roughness=1;m.color.set(0xe0b18c);m.normalScale.setScalar(.6);}
   if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalMap.anisotropy=4;}
   const mesh=new T.InstancedMesh(source.geometry,source.material,matrices.length);mesh.name='city-'+name;mesh.castShadow=mesh.receiveShadow=true;
   matrices.forEach((placement,i)=>mesh.setMatrixAt(i,placement.clone().multiply(source.matrixWorld)));mesh.computeBoundingSphere();scene.add(mesh);
   triangles+=(source.geometry.index?.count??source.geometry.getAttribute('position').count)/3*matrices.length;
  });
 }
 scene.userData.architecture={source:'ORCA Bistro',buildings:[...placements.values()].reduce((n,a)=>n+a.length,0),triangles};
}
