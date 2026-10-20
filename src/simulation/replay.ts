export type Input={x:number;z:number;jump:boolean;interact:boolean;crouch:boolean;grip:boolean};
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export const cargoHeight=(t:number,unlatched=true)=>4+(unlatched?34*smooth(15,24,t):0);
export function replayInput(t:number,x:number,z:number):Input {
 const i:Input={x:0,z:0,jump:false,interact:t>=13&&t<14.3,crouch:t>=21,grip:t>=15&&t<21};
 const steer=(tx:number,tz:number,speed:number)=>{const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d>.025){i.x=dx/d*Math.min(speed,d*10);i.z=dz/d*Math.min(speed,d*10)}};
 if(t<3)steer(0,-4.7,1.85);
 else if(t<6)steer(0,-1.5,1.1);
 else if(t<9)steer(1.15,1.35,1.08);
 else if(t<10.3)steer(1.62,2.28,.8);
 else if(t<11.1){i.x=2.6;i.z=.1;i.jump=t<10.32}
 else if(t<13)steer(4.35,2.35,.9);
 else if(t<15)steer(4.35,2.4,.55);
 else if(t<18)steer(4.35,2.4,.5);
 else if(t<21)steer(5.25,2.4,.4);
 else if(t<24)steer(5.25,2.58,.15);
 else if(t>=27)steer(5.65,2.78,.25);
 return i;
}
export const beats=[
 [0,3,'Approach the hand'],[3,6,'Step onto the fingers'],[6,9,'Cross the hand'],[9,12,'Jump onto the cargo'],[12,15,'Release the latch'],[15,18,'Hold on as the tray rises'],[18,21,'Move behind the timber'],[21,24,'The worker checks the load'],[24,27,'Hide below his gaze'],[27,30,'The route to the wall opens']
];
