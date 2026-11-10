import { WAVES } from "./core/physics.js";

// The coefficients and phase calculation are shared with the CPU buoyancy sampler.
export const waterVertex = `
uniform float time;
varying vec3 world;
varying vec3 norm;
void main() {
  vec3 p = position;
  float h = 0.0;
  vec2 grad = vec2(0.0);
  ${WAVES.map(
    ([a, k, x, z, s]) => `{
    vec2 direction=vec2(${x.toFixed(3)},${z.toFixed(3)});
    float phase=${k.toFixed(4)}*dot(position.xz,direction)-time*${s.toFixed(3)};
    h+=${a.toFixed(3)}*sin(phase);
    grad+=${(a * k).toFixed(6)}*direction*cos(phase);
    p.xz+=${(a * 0.35).toFixed(4)}*direction*cos(phase);
  }`,
  ).join("\n")}
  p.y = h;
  world = p;
  norm = normalize(vec3(-grad.x,1.0,-grad.y));
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);
}`;

export const waterFragment = `
uniform float time;
uniform vec3 baseColor,skyColor,sunDir;
uniform vec4 wakes[8];
uniform vec4 blockers[2];
uniform vec2 shore[80];
uniform float width;
varying vec3 world,norm;
void main() {
  vec3 n=normalize(norm+vec3(sin(world.z*.7+time)*.025,0.0,cos(world.x*.8-time)*.025));
  vec3 v=normalize(cameraPosition-world);
  float fres=.035+.965*pow(1.0-max(dot(n,v),0.0),5.0);
  float bank=10000.0;
  for(int i=0;i<80;i++) bank=min(bank,distance(world.xz,shore[i]));
  float shallow=smoothstep(width*.25,width*.58,bank);
  float depth=mix(15.0,1.2,shallow);
  vec3 transmitted=mix(baseColor*1.8,baseColor*.55,1.0-exp(-depth*.13));
  vec3 reflected=reflect(-v,n);
  vec3 reflectedSky=mix(skyColor*1.1,skyColor*.5,clamp(reflected.y,0.0,1.0));
  vec3 col=mix(transmitted,reflectedSky,fres*.85+.1);
  float spec=pow(max(dot(reflect(-sunDir,n),v),0.0),180.0);
  col+=vec3(1.0,.85,.65)*spec*2.0;
  float noise=sin(world.x*.45+sin(world.z*.5)+time*2.0);
  float foam=shallow*smoothstep(.45,.8,noise);
  for(int i=0;i<2;i++) {
    float edge=abs(distance(world.xz,blockers[i].xy)-blockers[i].z);
    foam+=exp(-edge*1.4)*(.6+.4*sin(time*3.0+world.x));
  }
  for(int i=0;i<8;i++) {
    vec2 d=world.xz-wakes[i].xy;
    float along=dot(d,vec2(sin(wakes[i].z),cos(wakes[i].z)));
    float side=abs(dot(d,vec2(cos(wakes[i].z),-sin(wakes[i].z))));
    float wake=exp(-abs(side+along*.25)*1.2)*(1.0-smoothstep(-4.0,0.0,along))*smoothstep(-24.0,-2.0,along)*wakes[i].w;
    foam+=wake;
  }
  col=mix(col,vec3(.8,.97,1.0),clamp(foam*.7,0.0,.85));
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
