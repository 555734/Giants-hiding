import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import {Character}from'../src/render/characters.ts';import {Game}from'../src/simulation/game.ts';
async function asset(p:string){const b=fs.readFileSync(p);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
test('worker pose at a frame is identical in sequential and distributed capture',async()=>{
 const base=await asset('public/assets/human-base.glb');const geo=new T.SphereGeometry(1,6,4),mat=new T.MeshStandardMaterial(),cloth=new T.Texture();
 const continuous=new Character(base.scene,geo,mat,60,true,cloth),direct=new Character(base.scene,geo,mat,60,true,cloth),g=new Game();await g.init();
 for(let n=0;n<=1530;n++){continuous.updateGiant(g.state);if(n===1530)break;g.step()}
 direct.updateGiant(g.state);
 for(const name of ['handL','handR','spine004']){
  assert.ok(continuous.bones[name].getWorldPosition(new T.Vector3()).distanceTo(direct.bones[name].getWorldPosition(new T.Vector3()))<1e-7);
 }
 assert.ok(continuous.head.getWorldQuaternion(new T.Quaternion()).angleTo(direct.head.getWorldQuaternion(new T.Quaternion()))<1e-6);
 g.world.free();
});
