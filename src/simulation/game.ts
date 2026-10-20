import RAPIER from '@dimforge/rapier3d-compat';
import {segmentIntersectsBox} from './sight';
import {cargoHeight,clamp,replayInput,smooth,type Input} from './replay';
export type State={t:number;distance:number;x:number;y:number;z:number;vx:number;vz:number;vy:number;yaw:number;grounded:boolean;onCargo:boolean;unlatched:boolean;interactProgress:number;crouch:number;grip:number;handRetreat:number;cargoY:number;cargoZ:number;giantRise:number;inspect:number;visible:boolean;mode:'replay'|'explore'};
export class Game {
 world!:RAPIER.World;player!:RAPIER.RigidBody;collider!:RAPIER.Collider;motor!:RAPIER.KinematicCharacterController;tray!:RAPIER.RigidBody;hand!:RAPIER.RigidBody;
 state!:State;lastJump=false;events:{t:number;name:string}[]=[];
 async init(){await RAPIER.init();this.reset();}
 reset(){
  if(this.world)this.world.free();this.world=new RAPIER.World({x:0,y:-11.6,z:0});this.world.timestep=1/60;
  const platform=(x:number,y:number,z:number,w:number,d:number)=>{const b=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,y-.15,z));this.world.createCollider(RAPIER.ColliderDesc.cuboid(w/2,.15,d/2).setFriction(.9),b);return b};
  platform(0,4,-10,4.7,14);this.hand=platform(0,4,0,3.5,6.6);this.tray=platform(4.75,4,4.5,4,7);
  this.player=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,4.86,-10.2));
  this.collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.61,.23),this.player);
  this.motor=this.world.createCharacterController(.015);this.motor.enableAutostep(.3,.25,true);this.motor.enableSnapToGround(.25);
  this.state={t:0,distance:0,x:0,y:4,z:-10.2,vx:0,vz:0,vy:0,yaw:0,grounded:true,onCargo:false,unlatched:false,interactProgress:0,crouch:0,grip:0,handRetreat:0,cargoY:4,cargoZ:0,giantRise:0,inspect:0,visible:false,mode:'replay'};this.lastJump=false;this.events=[];
 }
 step(dt=1/60,manual?:Input){
  const s=this.state,t=s.t, i=manual??replayInput(t,s.x,s.z-s.cargoZ), oldY=s.y;
  s.vx=i.x;s.vz=i.z;
  if(Math.hypot(i.x,i.z)>.12){let target=(i.grip||i.crouch)?0:Math.atan2(i.x,i.z),d=Math.atan2(Math.sin(target-s.yaw),Math.cos(target-s.yaw));s.yaw+=d*Math.min(1,dt*9)}
  const inReach=s.onCargo&&Math.hypot(s.x-4.35,s.z-2.4)<1.3;
  if(i.interact&&inReach&&!s.unlatched){s.interactProgress+=dt;if(s.interactProgress>=.85){s.unlatched=true;this.events.push({t,name:'latch'})}}
  s.cargoY=cargoHeight(t,s.unlatched);s.cargoZ=s.unlatched?1.8*smooth(27,36,t):0;
  s.giantRise=s.unlatched?smooth(15,24,t):0;s.inspect=smooth(20.4,24.2,t)*(1-smooth(26.6,29.2,t));
  s.handRetreat=s.onCargo||t>12?smooth(11.6,14,t):0;
  this.hand.setNextKinematicTranslation({x:-8*s.handRetreat,y:3.85+11*s.handRetreat,z:0});
  this.tray.setNextKinematicTranslation({x:4.75,y:s.cargoY-.15,z:4.5+s.cargoZ});
  if(i.jump&&!this.lastJump&&s.grounded){s.vy=4.3;s.grounded=false;s.onCargo=false;this.events.push({t,name:'jump'})}this.lastJump=i.jump;
  s.crouch+=(Number(i.crouch)*.72-s.crouch)*Math.min(1,dt*7);s.grip+=(Number(i.grip)-s.grip)*Math.min(1,dt*5);
  const carry=s.onCargo&&s.grounded;
  const support=(x:number,z:number):number|undefined=>{
   if(x>=-2.35&&x<=2.35&&z>=-17&&z<=-3)return 4;
   if(s.handRetreat<.02&&Math.abs(x)<=1.75&&z>=-3.3&&z<=3.3)return 3.95+.4*smooth(-.5,1.5,z);
   if(x>=2.75&&x<=6.75&&z>=1+s.cargoZ&&z<=8+s.cargoZ)return s.cargoY;
  };
  if(carry){
   s.x+=i.x*dt;s.z+=i.z*dt+(s.cargoZ-(this.tray.translation().z-4.5));
   s.y=s.cargoY;s.vy=0;
   // The same moving support carries the capsule in world space. Leaving its bounds releases it.
   if(s.x<2.75||s.x>6.75||s.z<1+s.cargoZ||s.z>8+s.cargoZ){s.onCargo=false;s.grounded=false}
  }else if(s.grounded){
   // Exact planar support avoids a capsule repeatedly colliding at TOI=0 with its own floor.
   // Airborne motion still uses Rapier sweeps, and stepping past a support edge releases gravity.
   s.x+=i.x*dt;s.z+=i.z*dt;
   const floor=support(s.x,s.z);
   if(floor!==undefined&&Math.abs(floor-s.y)<.31){s.y=floor;s.vy=0}
   else{s.grounded=false;s.vy=0}
  }else{
   s.vy-=11.6*dt;
   this.motor.computeColliderMovement(this.collider,{x:i.x*dt,y:s.vy*dt,z:i.z*dt});
   const m=this.motor.computedMovement();s.x+=m.x;s.y+=m.y;s.z+=m.z;
   s.grounded=this.motor.computedGrounded();if(s.grounded){s.vy=0;const floor=support(s.x,s.z);if(floor!==undefined)s.y=floor}
   if(s.x>2.75&&s.x<6.75&&s.z>1&&s.z<8&&s.vy<=0&&s.y<=s.cargoY+.025&&s.y>=s.cargoY-.35){
    s.onCargo=true;s.grounded=true;s.y=s.cargoY;s.vy=0;this.events.push({t,name:'land'})
   }
  }
  this.player.setNextKinematicTranslation({x:s.x,y:s.y+.855,z:s.z});this.world.step();
  if(s.grounded&&oldY-s.y>.07)this.events.push({t,name:'step'});
  const eye={x:1,y:s.cargoY+5,z:12+s.cargoZ},head={x:s.x,y:s.y+1.65-s.crouch,z:s.z};
  const occluded=segmentIntersectsBox(eye,head,{x:3.4,y:s.cargoY,z:3.19+s.cargoZ},{x:6.1,y:s.cargoY+1.31,z:6.45+s.cargoZ});
  s.visible=s.inspect>.65&&s.onCargo&&!occluded;
  if(s.grounded)s.distance+=Math.hypot(i.x,i.z)*dt;
  s.t+=dt;
 }
 seek(t:number){this.reset();const n=Math.round(t*60);for(let k=0;k<n;k++)this.step();return this.state}
}
