export type Point={x:number;y:number;z:number};
export function segmentIntersectsBox(from:Point,to:Point,min:Point,max:Point){
 let enter=0,exit=1;
 for(const k of ['x','y','z'] as const){const d=to[k]-from[k];if(Math.abs(d)<1e-8){if(from[k]<min[k]||from[k]>max[k])return false}else{let a=(min[k]-from[k])/d,b=(max[k]-from[k])/d;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return false}}
 return exit>0&&enter<1;
}
