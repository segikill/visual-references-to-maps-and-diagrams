const places=[
  ["Лондон",-0.13,51.51],["Париж",2.35,48.86],["Берлин",13.4,52.52],["Рим",12.50,41.90],
  ["Мадрид",-3.70,40.42],["Осло",10.75,59.91],["Варшава",21.01,52.23],["Стамбул",28.97,41.01],
  ["Каир",31.23,30.04],["Дакар",-17.45,14.69],["Лагос",3.38,6.52],["Найроби",36.82,-1.29],
  ["Нью-Йорк",-74.01,40.71],["Ванкувер",-123.12,49.28],["Мехико",-99.13,19.43],["Сан-Паулу",-46.63,-23.55],
  ["Токио",139.69,35.68],["Дели",77.10,28.70],["Сеул",126.98,37.57],["Сидней",151.21,-33.87],
  ["Буэнос-Айрес",-58.38,-34.60],["Бангкок",100.50,13.75],["Сингапур",103.82,1.35],["Манила",120.98,14.60],
  ["Амстердам",4.90,52.37],["Милан",9.19,45.46],["Прага",14.44,50.08],["Копенгаген",12.57,55.68]
];
const latClip=lat=>clamp(lat,-85,85)*Math.PI/180;
const mercator=lat=>Math.log(Math.tan(Math.PI/4+latClip(lat)/2));
function flatProjection(x,y,w,h,extent=[-180,180,-61,84],kind="flat"){
  const [lo,hi,s,n]=extent, yf=kind==="mercator"?mercator:kind==="equal"?v=>Math.sin(v*Math.PI/180):v=>v;
  return (lon,lat)=>[x+w*(lon-lo)/(hi-lo),y+h*(yf(n)-yf(lat))/(yf(n)-yf(s))];
}
const worldProjection=flatProjection(29,54,742,326);
const europeProjection=flatProjection(29,38,742,353,[-17,35,31,65]);
const biColors=["#39526e","#666baf","#9d89ea","#2b777d","#657da6","#a085c4","#36c5a3","#7ab7b3","#ed9baa"];
const nationIndex=random(717);
const nationValues=world.map(()=>[nationIndex(),nationIndex(),nationIndex()]);
function frame(p,[x,y,w,h],draw){
  const c=p.ctx;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  try { draw(); } finally { c.restore(); }
}
function graticule(p, projection, bounds=[-180,180,-60,80],step=30){
  const [lo,hi,s,n]=bounds;
  for(let lon=Math.ceil(lo/step)*step;lon<=hi;lon+=step)p.line([projection(lon,s),projection(lon,n)],"#2c4564",.7);
  for(let lat=Math.ceil(s/step)*step;lat<=n;lat+=step)p.line([projection(lo,lat),projection(hi,lat)],"#2c4564",.7);
}
function land(p, projection, color, withInfo=false){
  world.forEach(([name,iso,continent,polygons],i)=>{
    const [a,b,c]=nationValues[i];
    const value=clamp(a+Math.sin(p.t*TAU+i*.7)*.14);
    const second=clamp(b+Math.cos(p.t*3+i*.33)*.19);
    const path=new Path2D();
    polygons.forEach(rings=>rings.forEach(ring=>{
      ring.forEach(([lon,lat],j)=>{
        const [x,y]=projection(lon,lat);
        if(j)path.lineTo(x,y);else path.moveTo(x,y);
      });
      path.closePath();
    }));
    const fill=typeof color==="function"?color(value,second,c):color;
    p.draw(path,fill,"#111e35",.72,withInfo?name+" · индекс A "+fmt(value*100)+" · B "+fmt(second*100):null);
  });
}
function cityPoints(t,limit=28){
  const rand=random(72);
  return places.slice(0,limit).map(([name,x,y],i)=>({name,x,y,v:12+76*rand()*(.65+.35*Math.sin(i*.62+t*5)**2)}));
}
function incidents(t,n=640){
  const rng=random(32764),towns=places.filter((_,i)=>[0,1,2,3,4,6,24,25,26,27].includes(i));
  return seq(n).map(i=>{
    const k=Math.floor(rng()*towns.length),[,x,y]=towns[k];
    const u=(rng()+rng()+rng()-1.5),v=(rng()+rng()+rng()-1.5);
    return [x+u*(3+2*t),y+v*(2.3+t)+(i%7===0?3:0)];
  });
}
function glow(p,x,y,r,color, strength=1){
  const g=p.ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color+Math.round(255*clamp(strength)).toString(16).padStart(2,"0"));
  g.addColorStop(.4,color+"44");g.addColorStop(1,color+"00");
  p.dot(x,y,r,g);
}
assign("choropleth bivariate proportional dots geohex geodensity grid flows tracks night projection",(p,id)=>{
  if(id==="projection"){
    const bounds=[-180,180,-76,80];
    ["equal","mercator"].forEach((kind,i)=>{
      const x=35+i*380;
      const pr=flatProjection(x,87,350,262,bounds,kind);
      p.label(kind==="equal"?"Равновеликая цилиндрическая":"Меркатор",x+175,56,{align:"center",size:16,weight:650});
      frame(p,[x,87,350,262],()=>{graticule(p,pr,bounds);land(p,pr,"#4e8d92");});
      if(!p.preview){
        const lat=Math.round(10+65*p.t);
        p.line([pr(-180,lat),pr(180,lat)],"#ffbc90",1.5,"Параллель "+lat+"° с. ш.");
        p.label(lat+"° с. ш.",x+175,372,{align:"center",size:13,color:"#ffbc90"});
      }
    });
    p.label("Линии сетки через 30°",400,416,{align:"center",size:13});
    return;
  }
  const local=["geohex","geodensity","grid","tracks"].includes(id);
  const pr=local?europeProjection:worldProjection;
  const bounds=local?[-17,35,31,65]:[-180,180,-61,84];
  const city=cityPoints(p.t);
  frame(p,local?[29,38,742,353]:[29,54,742,326],()=>{
    if(id!=="night")graticule(p,pr,bounds,local?10:30);
    if(id==="choropleth"){
      land(p,pr,a=>tint("#223651","#90e6c2",a),true);
      return;
    }
    if(id==="bivariate"){
      land(p,pr,(a,b)=>biColors[Math.min(2,Math.floor(a*3))+3*Math.min(2,Math.floor(b*3))],true);
      return;
    }
    land(p,pr,id==="night"?"#142238":"#284360");
    if(id==="proportional"){
      [...city].sort((a,b)=>b.v-a.v).forEach(d=>p.dot(...pr(d.x,d.y),Math.sqrt(d.v)*2.9,"#fbb47864",d.name+" · "+fmt(d.v),"#ffc690"));
    }
    if(id==="dots"){
      const rng=random(449);
      world.forEach(([name,iso,continent,polys],index)=>{
        const quota=Math.floor(70*nationValues[index][2]);
        const ring=polys.reduce((a,b)=>a[0].length>=b[0].length?a:b)[0];
        const path=p.shape(ring.map(([x,y])=>pr(x,y)),true);
        const xs=ring.map(a=>a[0]),ys=ring.map(a=>a[1]);
        const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
        if(x1-x0>100 && xs.includes(180))return;
        const c=p.ctx;c.save();c.setTransform(1,0,0,1,0,0);
        const accepted=[];
        for(let j=0;j<quota*15 && accepted.length<quota;j++){
          const point=pr(mix(x0,x1,rng()),mix(y0,y1,rng()));
          if(c.isPointInPath(path,...point))accepted.push(point);
        }
        c.restore();
        accepted.forEach(([x,y])=>p.dot(x,y,1.2,"#81f4bbbc",name+" · 1 условная единица"));
      });
    }
    if(id==="geohex" || id==="grid" || id==="geodensity"){
      const points=incidents(p.t).map(([x,y])=>pr(x,y));
      if(id==="geohex"){
        const bins=binHex(points,14),max=Math.max(...bins.map(d=>d.n));
        bins.forEach(d=>p.poly(hexagon(d.x,d.y,13.4,Math.PI/6),tint("#384972","#f2b575",Math.sqrt(d.n/max)),null,1,"Событий · "+d.n));
      }else if(id==="grid"){
        const bins=new Map(),cell=20;
        points.forEach(([x,y])=>{const key=Math.floor(x/cell)+"/"+Math.floor(y/cell);bins.set(key,(bins.get(key)||0)+1);});
        const max=Math.max(...bins.values());
        bins.forEach((n,key)=>{
          const [x,y]=key.split("/").map(Number);
          p.rect(x*cell,y*cell,cell-1,cell-1,tint("#34516d","#82edc4",Math.sqrt(n/max)),"Клетка "+key+" · "+n+" событий");
        });
      }else{
        const cell=5,r=38;
        const density=new Float32Array(160*90);
        points.forEach(([cx,cy])=>{
          for(let i=Math.max(0,Math.floor((cx-r)/cell));i<Math.min(160,Math.ceil((cx+r)/cell));i++){
            for(let j=Math.max(0,Math.floor((cy-r)/cell));j<Math.min(90,Math.ceil((cy+r)/cell));j++){
              const dist=Math.hypot((i+.5)*cell-cx,(j+.5)*cell-cy);
              if(dist<r)density[j*160+i]+=(1-(dist/r)**2)**2;
            }
          }
        });
        const max=Math.max(...density);
        density.forEach((v,i)=>{
          if(v/max<.08)return;
          p.rect(i%160*cell,Math.floor(i/160)*cell,cell+.1,cell+.1,tint("#403459","#ffbc7c",v/max),null);
        });
        city.filter(d=>d.x>=-17&&d.x<=35&&d.y>=31&&d.y<=65).forEach(d=>p.dot(...pr(d.x,d.y),2.4,"#ffe8cf",d.name+" · синтетический кластер"));
      }
    }
    if(id==="night"){
      const rng=random(335);
      p.ctx.globalCompositeOperation="screen";
      for(const d of city){
        const [x,y]=pr(d.x,d.y);
        seq(52).forEach(()=>{
          const [a,b]=polar(x,y,rng()**2*17,rng()*TAU);
          glow(p,a,b,2+rng()*8,"#f8a65a",.16+rng()*.26);
        });
        glow(p,x,y,4+d.v*.05,"#ffe9ae",.32+d.v*.007);
      }
      p.ctx.globalCompositeOperation="source-over";
      city.forEach(d=>p.dot(...pr(d.x,d.y),2.5,"#ffdf9a",d.name+" · условная яркость "+fmt(d.v)));
    }
    if(id==="flows" || id==="tracks"){
      const pairs=id==="flows"?[[12,0],[14,12],[12,15],[0,10],[1,8],[2,17],[0,7],[8,21],[21,16],[17,18],[22,19],[3,9],[15,20],[12,13],[21,23],[10,11]]:[[0,1],[1,4],[1,25],[25,3],[2,6],[2,26],[27,2],[24,2],[3,7],[1,24]];
      pairs.forEach(([a,b],i)=>{
        const start=city[a],end=city[b],s=pr(start.x,start.y),e=pr(end.x,end.y);
        const mid=[(s[0]+e[0])/2,(s[1]+e[1])/2-Math.min(112,Math.abs(s[0]-e[0])*.32+18)];
        const pts=seq(31).map(j=>{
          const t=j/30,w=1-t;
          return [w*w*s[0]+2*w*t*mid[0]+t*t*e[0],w*w*s[1]+2*w*t*mid[1]+t*t*e[1]];
        });
        const volume=Math.round(10+8*(i%8)),c=palette[i%4],label=start.name+" → "+end.name+" · "+volume+" ед.";
        p.line(pts,c+"97",id==="flows"?1+volume/19:1.7,label);
        const dot=pts[(Math.floor(p.t*90)+i*7)%31];
        p.dot(...dot,id==="flows"?3.7:5.5,c,label);
      });
      [...new Set(pairs.flat())].forEach(i=>{
        const d=city[i],[x,y]=pr(d.x,d.y);
        p.dot(x,y,3.4,"#ecf7ff",d.name,"#172742");
        if(id==="tracks"||[12,0,16,19,15,17,8].includes(i))p.label(d.name,x+7,y-8,{size:11});
      });
    }
  });
  if(id==="choropleth") scaleLegend(p,"0","100","#223651","#90e6c2");
  if(id==="bivariate"){
    biColors.forEach((c,i)=>p.rect(350+i%3*14,420-Math.floor(i/3)*10,13,9,c));
    p.label("A →",397,425,{size:12});p.label("B ↑",342,405,{align:"right",size:12});
  }
  if(["geohex","geodensity","grid"].includes(id))p.label("Меньше событий  →  больше событий",400,417,{size:12,align:"center"});
  if(id==="proportional"){
    [15,45,80].forEach((v,i)=>{
      const r=Math.sqrt(v)*1.35;
      p.dot(338+i*62,418-r,r,"#fbb47864",null,"#ffc690");
      p.label(v,338+i*62,429,{size:12,align:"center"});
    });
  }
});
function spherical(lon,lat,lon0,lat0){
  const l=(lon-lon0)*Math.PI/180,a=lat*Math.PI/180,b=lat0*Math.PI/180;
  return [Math.cos(a)*Math.sin(l),Math.cos(b)*Math.sin(a)-Math.sin(b)*Math.cos(a)*Math.cos(l),Math.sin(b)*Math.sin(a)+Math.cos(b)*Math.cos(a)*Math.cos(l)];
}
assign("globe",(p)=>{
  const lon=p.state.lon??12, lat=p.state.lat??23;
  const r=180,cx=400,cy=216;
  const project=([x,y,z])=>{
    const scale=z>=0?1:1/Math.max(.00001,Math.hypot(x,y));
    return [cx+r*x*scale,cy-r*y*scale];
  };
  const globe=p.ctx.createRadialGradient(345,135,30,400,216,190);
  globe.addColorStop(0,"#264c75");globe.addColorStop(1,"#12213a");
  p.dot(cx,cy,r,globe,null,"#6985ae");
  function gridLine(coords){
    let segment=[];
    coords.forEach(([x,y])=>{
      const v=spherical(x,y,lon,lat);
      if(v[2]>=0)segment.push(project(v));
      else if(segment.length){p.line(segment,"#456082",.7);segment=[];}
    });
    if(segment.length)p.line(segment,"#456082",.7);
  }
  seq(12).forEach(i=>gridLine(seq(91).map(j=>[i*30-180,j*2-90])));
  seq(5).forEach(i=>gridLine(seq(181).map(j=>[j*2-180,i*30-60])));
  world.forEach(([name,iso,continent,polys],i)=>{
    const path=new Path2D();
    let visible=false;
    polys.forEach(rings=>rings.forEach(ring=>{
      const vectors=ring.map(([x,y])=>spherical(x,y,lon,lat));
      if(!vectors.some(v=>v[2]>0))return;
      visible=true;
      vectors.forEach((v,j)=>{
        const [x,y]=project(v);
        if(j)path.lineTo(x,y);else path.moveTo(x,y);
      });
      path.closePath();
    }));
    if(visible)p.draw(path,tint("#377482","#98d0b4",nationValues[i][0]),"#254661",.85,name);
  });
  cityPoints(p.t).forEach(d=>{
    const v=spherical(d.x,d.y,lon,lat);
    if(v[2]>.015)p.dot(...project(v),2.8,"#ffcd92",d.name);
  });
  if(!p.preview)p.label("Центр  "+fmt(lat)+"° широты / "+fmt(lon)+"° долготы",400,423,{align:"center",size:13});
});
