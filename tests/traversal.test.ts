import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Game} from '../src/simulation/game.ts';
import {cargoHeight} from '../src/simulation/replay.ts';
test('one continuous input replay jumps, lands, unlatches and remains on the moving cargo',async()=>{
 const g=new Game();await g.init();let maxStep=0,previous={...g.state};let checked=0;
 for(let n=0;n<1800;n++){
  g.step();const s=g.state;maxStep=Math.max(maxStep,Math.hypot(s.x-previous.x,s.y-previous.y,s.z-previous.z));
  if(s.t>24&&s.t<27)assert.equal(s.visible,false,'timber blocks the inspection sightline');
  if(s.t>15){assert.equal(s.onCargo,true);assert.equal(s.grounded,true);assert.ok(Math.abs(s.y-s.cargoY)<1e-5);checked++}previous={...s};
 }
 assert.ok(checked>850);assert.ok(maxStep<.12,'no teleport between fixed steps');
 const e=g.events;assert.ok(e.some(x=>x.name==='jump'&&x.t>10&&x.t<11));assert.ok(e.some(x=>x.name==='land'&&x.t>10.8&&x.t<11.3));assert.ok(e.some(x=>x.name==='latch'&&x.t>13&&x.t<15));assert.equal(g.state.cargoY,38);g.world.free();
});
test('cargo never lifts unless its latch is operated in reach',async()=>{
 const g=new Game();await g.init();for(let n=0;n<1800;n++)g.step(1/60,{x:0,z:0,jump:false,interact:true,crouch:false,grip:false});assert.equal(g.state.unlatched,false);assert.equal(g.state.cargoY,4);assert.equal(cargoHeight(24,false),4);g.world.free();
});
test('reset and seek reproduce the same state',async()=>{
 const g=new Game();await g.init();const a={...g.seek(25.5)},b={...g.seek(25.5)};assert.deepEqual(a,b);g.world.free();
});
