import * as T from 'three';
/** Phong subdivision with bone-weight interpolation. No topology/model hierarchy changes. */
export function refineBody(source:T.BufferGeometry,levels=1){
 let g=source.clone();
 for(let level=0;level<levels;level++){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight'),index=g.getIndex()!;
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[],weights:number[]=[],tri:number[]=[],edges=new Map<string,number>();
  for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));if(uv)uvs.push(uv.getX(i),uv.getY(i));for(let k=0;k<4;k++){indices.push(si.getComponent(i,k));weights.push(sw.getComponent(i,k));}}
  const edge=(a:number,b:number)=>{
   const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key)!;
   const pa=new T.Vector3().fromBufferAttribute(p,a),pb=new T.Vector3().fromBufferAttribute(p,b),na=new T.Vector3().fromBufferAttribute(n,a),nb=new T.Vector3().fromBufferAttribute(n,b),mid=pa.clone().add(pb).multiplyScalar(.5);
   const projected=mid.clone().addScaledVector(na,-.5*mid.clone().sub(pa).dot(na)).addScaledVector(nb,-.5*mid.clone().sub(pb).dot(nb));
   const out=positions.length/3;positions.push(...projected.toArray());normals.push(...na.add(nb).normalize().toArray());if(uv)uvs.push((uv.getX(a)+uv.getX(b))*.5,(uv.getY(a)+uv.getY(b))*.5);
   const w=new Map<number,number>();for(const i of [a,b])for(let k=0;k<4;k++){const bone=si.getComponent(i,k);w.set(bone,(w.get(bone)||0)+sw.getComponent(i,k)*.5);}
   const top=[...w].sort((a,b)=>b[1]-a[1]).slice(0,4);while(top.length<4)top.push([0,0]);const total=top.reduce((s,x)=>s+x[1],0);for(const [bone,value]of top){indices.push(bone);weights.push(value/total)}edges.set(key,out);return out;
  };
  const groups=g.groups.length?g.groups:[{start:0,count:index.count,materialIndex:0}];const next=new T.BufferGeometry();
  for(const group of groups){const start=tri.length;for(let i=group.start;i<group.start+group.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),ab=edge(a,b),bc=edge(b,c),ca=edge(c,a);tri.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca)}next.addGroup(start,tri.length-start,group.materialIndex)}
  next.setIndex(tri);next.setAttribute('position',new T.Float32BufferAttribute(positions,3));next.setAttribute('normal',new T.Float32BufferAttribute(normals,3));if(uv)next.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));next.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));next.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.dispose();g=next;
 }
 return g;
}
export function tailorBody(g:T.BufferGeometry){
 const p=g.getAttribute('position'),normal=g.getAttribute('normal'),idx=g.getIndex()!,tags=new Uint8Array(p.count);
 for(const group of g.groups)for(let i=group.start;i<group.start+group.count;i++)tags[idx.getX(i)]=group.materialIndex??0;
 for(let i=0;i<p.count;i++){const mat=tags[i];if(mat!==1&&mat!==2)continue;
  const x=p.getX(i),y=p.getY(i)+.996932,z=p.getZ(i),nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
  const crease=mat===1?(.004*Math.sin(y*67+x*18)*Math.sin(z*24+x*14)+.003*Math.sin(y*112+z*29)):(.003*Math.sin(y*85+x*31)+.002*Math.sin(z*42-y*43));
  const puff=mat===1?.021:.012;const d=puff+crease;
  p.setXYZ(i,x+nx*d,p.getY(i)+ny*d,z+nz*d);
 }p.needsUpdate=true;g.computeVertexNormals();return g;
}
