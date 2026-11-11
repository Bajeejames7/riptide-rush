import manifest from "../../public/assets/models/sf_boats.json" with {type:"json"};
export const BOAT_MODEL_IDS=["speedboat2","speedboat1","speedboat_vrpspu","myspeedboat","cyberpunk","futuristic"];
export const boatDimensions=type=>{const [width,height,length]=manifest.find(m=>m.id===BOAT_MODEL_IDS[type]).size;return {width,height,length,radius:width/2};};
// Radius of the hull ellipse in a world-space contact direction.
export function contactRadius(b,dx,dz){const d=boatDimensions(b.type),h=b.heading||0,side=dx*Math.cos(h)-dz*Math.sin(h),along=dx*Math.sin(h)+dz*Math.cos(h);return 1/Math.sqrt((side/d.radius)**2+(along/(d.length/2))**2);}
