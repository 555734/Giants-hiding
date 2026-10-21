import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import {ScannedCharacter}from'../src/render/scanned.ts';import {Game}from'../src/simulation/game.ts';
async function actor(name='scanned-actor'){
 const raw=fs.readFileSync('public/assets/'+name+'.glb'),jsonLength=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jsonLength).toString());
 // Geometry/rig test: remove image use so the actual licensed rig can load in Node.
 for(const mesh of doc.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 delete doc.materials;delete doc.textures;delete doc.images;delete doc.samplers;
 const text=Buffer.from(JSON.stringify(doc)),padding=(4-text.length%4)%4,j=Buffer.concat([text,Buffer.alloc(padding,32)]),bin=raw.subarray(20+jsonLength),header=Buffer.alloc(20);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+bin.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const b=Buffer.concat([header,j,bin]);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
test('scanned actor keeps the same carrying hand and gaze in continuous and distributed captures',async()=>{
 const asset=await actor('worker-actor'),contract=JSON.parse(fs.readFileSync('public/assets/worker-actor.json','utf8'));
 const a=new ScannedCharacter(asset.scene,contract,60,true),b=new ScannedCharacter(asset.scene,contract,60,true),g=new Game();await g.init();
 for(let n=0;n<=1530;n++){a.updateGiant(g.state);if(n<1530)g.step();}
 b.updateGiant(g.state);
 for(const bone of ['handL','handR','spine004']){
  const pa=a.bones[bone].getWorldPosition(new T.Vector3()),pb=b.bones[bone].getWorldPosition(new T.Vector3());
  assert.ok(pa.toArray().every(Number.isFinite));assert.ok(pa.distanceTo(pb)<1e-7);
 }
 // FBX transforms can carry minute scale/decomposition drift; quaternion angles require unit inputs.
 const qa=a.head.getWorldQuaternion(new T.Quaternion()),qb=b.head.getWorldQuaternion(new T.Quaternion());
 const gazeAngle=qa.clone().normalize().angleTo(qb.clone().normalize());
 console.log('Scanned gaze comparison',JSON.stringify({continuousQuaternionLength:qa.length(),distributedQuaternionLength:qb.length(),gazeAngle}));
 assert.ok(gazeAngle<1e-6, 'Head orientation differs by '+gazeAngle+' radians');
 const humanSource=await actor(),humanContract=JSON.parse(fs.readFileSync('public/assets/scanned-actor.json','utf8'));
 const human=new ScannedCharacter(humanSource.scene,humanContract,1.7,false);g.seek(25.5);human.updatePlayer(g.state);
 for(const side of ['L','R'])assert.ok(Math.abs(human.bones['foot'+side].getWorldPosition(new T.Vector3()).y-(g.state.y+.075))<.03);
 g.world.free();
});
