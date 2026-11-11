import { WAVES, WAVE_STEEPNESS } from "./core/physics.js";

// The coefficients and phase calculation are shared with the CPU buoyancy sampler.
export const waterVertex = `
uniform float time;
varying vec3 world;
varying vec3 norm;
void main() {
  vec3 p = position;
  float h = 0.0;
  vec2 grad = vec2(0.0);
  vec3 jacobian=vec3(1.,0.,1.);
  ${WAVES.map(
    ([a, k, x, z, s]) => `{
    vec2 direction=vec2(${x.toFixed(3)},${z.toFixed(3)});
    float phase=${k.toFixed(4)}*dot(position.xz,direction)-time*${s.toFixed(3)};
    h+=${a.toFixed(3)}*sin(phase);
    grad+=${(a * k).toFixed(6)}*direction*cos(phase);
    p.xz+=${(a * WAVE_STEEPNESS).toFixed(6)}*direction*cos(phase);
    float j=-${(a*k*WAVE_STEEPNESS).toFixed(6)}*sin(phase);
    jacobian+=j*vec3(direction.x*direction.x,direction.x*direction.y,direction.y*direction.y);

  }`,
  ).join("\n")}
  p.y = h;
  world = p;
  float determinant=jacobian.x*jacobian.z-jacobian.y*jacobian.y;
  grad=vec2(grad.x*jacobian.z-grad.y*jacobian.y,grad.y*jacobian.x-grad.x*jacobian.y)/determinant;
  norm = normalize(vec3(-grad.x,1.0,-grad.y));
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);
}`;

export const waterFragment = `
uniform float time;
uniform vec3 baseColor,skyColor,sunDir;
uniform vec4 wakes[64];
uniform samplerCube environmentMap;
uniform sampler2D detailMap,foamMap,shoreMap;
#ifndef WAKE_COUNT
#define WAKE_COUNT 64
#endif
uniform vec4 blockers[2];
uniform float width;
uniform vec4 shortcuts[2];
varying vec3 world,norm;
uniform sampler2D sceneColor,sceneDepth,planarMap;
uniform mat4 reflectionMatrix;
uniform vec2 screenSize;
uniform float advancedWater,cameraNear,cameraFar;
uniform vec3 fogColor;
uniform float fogNear,fogFar;
void main() {
  float viewDistance=distance(cameraPosition,world);
  if(viewDistance>=fogFar){
    gl_FragColor=vec4(fogColor,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
  vec2 uv=world.xz;
  vec3 detail=texture2D(detailMap,uv*.023+vec2(time*.008,time*.013)).xyz*2.-1.;
  vec3 fine=texture2D(detailMap,mat2(.74,-.67,.67,.74)*uv*.037-vec2(time*.012,time*.006)).xyz*2.-1.;
  vec3 n=normalize(norm+vec3(detail.x+fine.x,0.,detail.y+fine.y)*.065);
  vec3 v=normalize(cameraPosition-world);
  float fres=.035+.965*pow(1.0-max(dot(n,v),0.0),5.0);
  #ifndef LOW_WATER
  float shoreDistance=texture2D(shoreMap,world.xz/2600.+.5).r*64.-32.;
  #else
  float shoreDistance=-20.;
  #endif
  float shallow=1.-smoothstep(0.,22.,-shoreDistance);
  float depth=mix(15.0,1.2,shallow);
  vec3 transmitted=mix(baseColor*1.8,baseColor*.55,1.0-exp(-depth*.13));
  vec3 reflected=reflect(-v,n);
  vec3 reflectedSky=mix(textureCube(environmentMap,reflected).rgb,skyColor*.3,.15);
  vec3 col=mix(transmitted,reflectedSky,fres*.85+.1);
  float depthFoam=0.;
  #ifndef LOW_WATER
  if(advancedWater>.5){
    vec2 screenUV=gl_FragCoord.xy/screenSize;
    float bottomZ=texture2D(sceneDepth,screenUV).r;
    float bottomView=cameraNear*cameraFar/((cameraFar-cameraNear)*bottomZ-cameraFar);
    float surfaceView=cameraNear*cameraFar/((cameraFar-cameraNear)*gl_FragCoord.z-cameraFar);
    float thickness=max(0.,surfaceView-bottomView);
    vec3 bottom=texture2D(sceneColor,clamp(screenUV+n.xz*.006*min(thickness,2.),vec2(.001),vec2(.999))).rgb;
    vec3 absorption=exp(-vec3(.21,.085,.045)*thickness);
    transmitted=mix(baseColor*.6,bottom,absorption);
    vec4 reflectedUV=reflectionMatrix*vec4(world,1.);reflectedUV.xy+=n.xz*.025*reflectedUV.w;
    vec3 scenery=texture2DProj(planarMap,reflectedUV).rgb;
    col=mix(transmitted,mix(reflectedSky,scenery,.65),fres*.85+.1);
    depthFoam=(1.-smoothstep(.05,1.5,thickness))*.65;
  }
  #endif
  float spec=pow(max(dot(reflect(-sunDir,n),v),0.0),180.0);
  col+=vec3(1.0,.85,.65)*spec*2.0;
  #ifndef LOW_WATER
  float noise=texture2D(foamMap,world.xz*.08+vec2(time*.012)).r;
  float edge=abs(shoreDistance);
  float foam=(advancedWater>.5?depthFoam:exp(-edge*.45)*.7)*noise;
  for(int i=0;i<2;i++) {
    float edge=abs(distance(world.xz,blockers[i].xy)-blockers[i].z);
    foam+=exp(-edge*1.4)*(.6+.4*sin(time*3.0+world.x));
  }
  #else
  float noise=.75;float foam=0.;
  #endif
  for(int i=0;i<WAKE_COUNT;i++) {
    vec2 d=world.xz-wakes[i].xy;
    #ifdef LOW_WATER
    if(dot(d,d)>625.||wakes[i].w<.01)continue;
    #endif
    float along=dot(d,vec2(sin(wakes[i].z),cos(wakes[i].z)));
    float side=abs(dot(d,vec2(cos(wakes[i].z),-sin(wakes[i].z))));
    #ifdef LOW_WATER
    float crest=max(0.,1.-abs(side+along*.25)*.6);
    float trail=max(0.,1.-side*side*.15);
    #else
    float crest=exp(-abs(side+along*.25)*1.2);
    float trail=exp(-side*side*.6);
    #endif
    float wake=crest*(1.0-smoothstep(-4.0,0.0,along))*smoothstep(-24.0,-2.0,along)*wakes[i].w;
    foam+=wake*(.65+noise*.35)*(i<8?1.8:.12);
    foam+=trail*smoothstep(-15.,-3.,along)*(1.-smoothstep(-3.,0.,along))*wakes[i].w*(i<8?.45:.03);
  }
  col=mix(col,vec3(.95,.98,1.),clamp(foam*.7,0.0,.85));
  col=mix(col,fogColor,smoothstep(fogNear,fogFar,viewDistance));
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
