import * as T from './assets/three.module.js';

// Apply the same proportions to the photographed surface and nail landmarks.
export function femininePoint(p){p.x*=.90;p.y=.1+(p.y-.1)*1.06;p.z=.32+(p.z-.32)*.88;return p}
export function bakeHand(root){
 root.updateMatrixWorld(true);let source;root.traverse(n=>{if(n.isSkinnedMesh)source=n});
 source.skeleton.update();const g=source.geometry.clone(),position=g.attributes.position;
 for(let i=0;i<position.count;i++){const p=source.getVertexPosition(i,new T.Vector3()).applyMatrix4(source.matrixWorld);femininePoint(p);position.setXYZ(i,p.x,p.y,p.z)}
 g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeVertexNormals();g.computeBoundingSphere();
 const mesh=new T.Mesh(g,source.material);mesh.name='NailuseHandSurface';return mesh;
}
export function nailFrame(root,name,width){
 let bone;root.traverse(n=>{if(n.name.startsWith(name+'_03R_')&&!n.name.includes('end'))bone=n});
 const end=bone.children.find(n=>n.isBone),a=femininePoint(bone.getWorldPosition(new T.Vector3())),b=femininePoint(end.getWorldPosition(new T.Vector3()));
 const up=b.clone().sub(a).normalize(),normal=new T.Vector3(1,0,0);normal.addScaledVector(up,-normal.dot(up)).normalize();
 const side=new T.Vector3().crossVectors(up,normal).normalize(),origin=a.clone().lerp(b,.14);
 return {name,origin,up,normal,side,width:width*.88,bed:a.distanceTo(b)*.86};
}
export function fitNaturalNail(surface,frame){
 const centers={pinky:[.76,.17],index:[.76,.26],ring:[.88,.26],thumb:[.77,.38],middle:[.88,.38]},center=centers[frame.name],pos=surface.geometry.attributes.position,uv=surface.geometry.attributes.uv,points=[];
 for(let i=0;i<pos.count;i++)if(Math.hypot(uv.getX(i)-center[0],uv.getY(i)-center[1])<.054)points.push(new T.Vector3().fromBufferAttribute(pos,i));
 const ys=points.map(p=>p.dot(frame.up)),xs=points.map(p=>p.dot(frame.side)),ymin=Math.min(...ys),ymax=Math.max(...ys),xmin=Math.min(...xs),xmax=Math.max(...xs);
 frame.origin=frame.up.clone().multiplyScalar(ymin).addScaledVector(frame.side,(xmin+xmax)/2);frame.bed=ymax-ymin;frame.width=(xmax-xmin)*.98;
 const A=Array.from({length:6},()=>Array(7).fill(0));
 for(const p of points){const d=p.clone().sub(frame.origin),u=d.dot(frame.side)/(frame.width*.5),v=d.dot(frame.up)/frame.bed,z=d.dot(frame.normal),q=[1,u,v,u*u,u*v,v*v];for(let i=0;i<6;i++){for(let j=0;j<6;j++)A[i][j]+=q[i]*q[j];A[i][6]+=q[i]*z}}
 for(let i=0;i<6;i++){let pivot=i;for(let k=i+1;k<6;k++)if(Math.abs(A[k][i])>Math.abs(A[pivot][i]))pivot=k;[A[i],A[pivot]]=[A[pivot],A[i]];const n=A[i][i];for(let j=i;j<7;j++)A[i][j]/=n;for(let k=0;k<6;k++)if(k!==i){const f=A[k][i];for(let j=i;j<7;j++)A[k][j]-=f*A[i][j]}}
 frame.coefficients=A.map(r=>r[6]);return frame;
}
export function smoothNail(frame,shape,length){
 const {origin,up,normal,side,width,bed,coefficients:c}=frame,cols=40,rows=64,extension=[.006,.055,.125,.21][length],total=bed+extension,p=[],uv=[],idx=[];
 const depth=(u,v)=>c[0]+c[1]*u+c[2]*v+c[3]*u*u+c[4]*u*v+c[5]*v*v;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols*2-1,v=j/rows;let taper=1;
 if(shape===2&&v>.55)taper=Math.sqrt(Math.max(.0001,1-Math.pow((v-.55)/.451,2)));
 if([3,4,6].includes(shape)&&v>.48)taper=Math.pow(Math.max(.004,(1-v)/.52),shape===6?.96:.52);
 if(shape===5&&v>.50)taper=1-(v-.5)*.76;
 if(shape===1&&v>.89)taper=1-(v-.89)*1.5;
 const cut=bed*.20*(1-Math.sqrt(Math.max(0,1-u*u))),y=cut+(total-cut)*v,x=u*width*.5*taper,bedV=y/bed;
 let z=depth(u*taper,Math.min(.86,bedV));if(bedV>.86){const derivative=(c[2]+c[4]*u*taper+2*c[5]*.86)/bed;z+=T.MathUtils.clamp(derivative,-.10,.06)*(y-bed*.86)-.05*Math.pow(Math.max(0,y-bed),2)}
 const coat=.0006+.0025*Math.sin(Math.min(1,v/.14)*Math.PI/2);const point=origin.clone().addScaledVector(side,x).addScaledVector(up,y).addScaledVector(normal,z+coat);p.push(...point.toArray());uv.push(i/cols,v);
 }
 const count=p.length/3;for(let k=0;k<count;k++){p.push(p[3*k]-normal.x*.002,p[3*k+1]-normal.y*.002,p[3*k+2]-normal.z*.002);uv.push(uv[2*k],uv[2*k+1])}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,b,c,b,d,c,a+count,c+count,b+count,b+count,c+count,d+count)}
 const stitch=(a,b)=>idx.push(a,a+count,b,b,a+count,b+count);for(let i=0;i<cols;i++){stitch(i,i+1);stitch(rows*(cols+1)+i+1,rows*(cols+1)+i)}for(let j=0;j<rows;j++){stitch((j+1)*(cols+1),j*(cols+1));stitch(j*(cols+1)+cols,(j+1)*(cols+1)+cols)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
