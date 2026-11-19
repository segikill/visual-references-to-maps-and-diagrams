function samples(k,t,n=64) {
  const rand=random(177+k*39);
  return seq(n).map(i=>clamp(25+k*9+9*Math.sin(t*5+k)+(rand()+rand()+rand()-1.5)*32+(i%13===0?14:0),2,98)).sort((a,b)=>a-b);
}
function kernel(values,x,b=5) {
  return values.reduce((s,v)=>s+Math.exp(-((v-x)**2)/(2*b*b)),0)/values.length;
}
const quantile=(values,q)=>mix(values[Math.floor((values.length-1)*q)],values[Math.ceil((values.length-1)*q)],((values.length-1)*q)%1);
assign("hist density box violin ridge swarm ecdf",(p,id)=>{
  const arrays=seq(5).map(k=>samples(k,p.t));
  if(["hist","density","ecdf"].includes(id)){
    const {x,y}=axes(p,{yMax:id==="hist"?44:id==="ecdf"?100:.5,yName:id==="hist"?"Наблюдения":id==="ecdf"?"Накопленная доля, %":"Масштабированная плотность",xName:"Значение"});
    if(id==="hist"){
      const bins=seq(14).map(()=>0);
      arrays[1].forEach(v=>bins[Math.floor(v*14/100)]++);
      bins.forEach((v,i)=>{
        const a=i*100/14,b=(i+1)*100/14;
        p.rect(x(a)+2,y(v),x(b)-x(a)-4,y(0)-y(v),tint("#345385","#78e7c9",v/17),fmt(a)+"–"+fmt(b)+" · "+v+" наблюдений");
      });
      return;
    }
    arrays.slice(0,3).forEach((values,k)=>{
      if(id==="ecdf"){
        const pts=values.flatMap((v,i)=>[[x(v),y(100*i/values.length)],[x(v),y(100*(i+1)/values.length)]]);
        p.line([[x(0),y(0)],...pts,[x(100),y(100)]],palette[k],2.7,cities[k]);
        pts.filter((_,i)=>i%8===1).forEach(([a,b],i)=>p.dot(a,b,3.6,palette[k],cities[k]+" · ≤ "+fmt(values[i*4])+" · "+fmt((i*4+1)*100/values.length)+"%"));
      }else{
        const pts=seq(101).map(i=>[x(i),y(kernel(values,i)*.8)]);
        p.poly([[x(0),y(0)],...pts,[x(100),y(0)]],palette[k]+"32");
        p.line(pts,palette[k],2.8,cities[k]);
      }
    });
    legend(p,cities.slice(0,3));
    return;
  }
  const x=v=>95+6.35*v;
  seq(6).forEach(i=>{p.line([[x(i*20),55],[x(i*20),371]],grid);p.label(i*20,x(i*20),401,{size:12,align:"center"});});
  [...arrays].reverse().forEach((values,j)=>{
    const k=4-j,y=88+66*k,c=palette[k];
    const min=values[0], max=values.at(-1), q1=quantile(values,.25),median=quantile(values,.5),q3=quantile(values,.75);
    const iqr=q3-q1,lo=values.find(v=>v>=q1-1.5*iqr),hi=values.findLast(v=>v<=q3+1.5*iqr);
    p.label(cities[k],79,y,{size:13,align:"right"});
    if(id==="box"){
      p.line([[x(lo),y],[x(hi),y]],c,2);
      [lo,hi].forEach(v=>p.line([[x(v),y-10],[x(v),y+10]],c,2));
      p.rect(x(q1),y-14,x(q3)-x(q1),28,c,cities[k]+" · Q1 "+fmt(q1)+" · медиана "+fmt(median)+" · Q3 "+fmt(q3));
      p.line([[x(median),y-14],[x(median),y+14]],"#14213d",3);
      values.filter(v=>v<lo||v>hi).forEach(v=>p.dot(x(v),y,4,c,"Выброс · "+fmt(v)));
    }else if(id==="swarm"){
      const positions=[];
      values.forEach(v=>{
        const a=x(v);
        const offset=seq(30).map(i=>i===0?0:(i%2?1:-1)*Math.ceil(i/2)*6).find(d=>Math.abs(d)<=30&&positions.every(([u,w])=>Math.hypot(u-a,w-d)>=6));
        if(offset===undefined) return;
        positions.push([a,offset]);
        p.dot(a,y+offset,2.9,c,cities[k]+" · наблюдение "+fmt(v));
      });
    }else{
      const profile=seq(101).map(i=>[x(i),kernel(values,i)]);
      const top=profile.map(([a,b])=>[a,y-b*(id==="ridge"?162:50)]);
      const bottom=id==="ridge"?[[x(100),y],[x(0),y]]:profile.map(([a,b])=>[a,y+b*50]).reverse();
      p.poly([...top,...bottom],id==="ridge"?c:c+"84",c,2,cities[k]+" · диапазон "+fmt(min)+"–"+fmt(max)+" · медиана "+fmt(median));
      if(id==="violin")p.dot(x(median),y,4,"#fff","Медиана · "+fmt(median));
    }
  });
});
function cloud(t,n=220){
  const rand=random(78337);
  return seq(n).map(i=>{
    const g=i%3,r=rand(),a=rand()*TAU;
    const x=24+g*25+Math.cos(a)*r*27+6*Math.sin(g+t*TAU);
    const y=21+g*25+Math.sin(a)*r*23+8*Math.cos(g+t*TAU);
    return {g,x:clamp(x,1,99),y:clamp(y,1,99),z:6+rand()*34};
  });
}
function hexagon(x,y,r,rotate=0) {
  return seq(6).map(i=>polar(x,y,r,i*TAU/6+rotate));
}
function binHex(points,r) {
  const bins=new Map();
  points.forEach(([x,y])=>{
    const row=Math.round(y/(r*1.5));
    const col=Math.round(x/(Math.sqrt(3)*r)-.5*(row%2));
    const key=row+"/"+col;
    const bin=bins.get(key)||{x:Math.sqrt(3)*r*(col+.5*(row%2)),y:row*r*1.5,n:0};
    bin.n++;
    bins.set(key,bin);
  });
  return [...bins.values()];
}
assign("scatter bubble hex connected matrix parallel ternary",(p,id)=>{
  const data=cloud(p.t,id==="bubble"?45:id==="hex"?1150:180);
  if(id==="matrix" || id==="parallel"){
    const features=["Охват","Рост","Вклад","Скорость"];
    const vals=data.map(d=>[d.x,d.y,2.3*d.z,(d.x+d.y)/2*.74+d.z*.52,d.g]);
    if(id==="parallel"){
      features.forEach((v,k)=>{
        p.line([[98+k*202,60],[98+k*202,365]],"#51668e",1.2);
        p.label(v,98+k*202,390,{align:"center"});
      });
      vals.slice(0,85).forEach((row,i)=>p.line(row.slice(0,4).map((v,k)=>[98+k*202,365-v*3]),palette[row[4]]+"65",1.4,"Наблюдение "+(i+1)+" · "+row.slice(0,4).map(fmt).join(" / ")));
    }else{
      features.forEach((label,r)=>features.forEach((_,c)=>{
        const a=230+c*86,b=48+r*86;
        p.rect(a,b,82,82,"#1b2a44");
        if(r===c) p.label(label,a+41,b+41,{align:"center",size:12});
        else vals.forEach(row=>p.dot(a+row[c]*.8,b+81-row[r]*.8,1.45,palette[row[4]]+"a0",features[c]+" "+fmt(row[c])+" · "+label+" "+fmt(row[r])));
      }));
    }
    legend(p,["Кластер A","Кластер B","Кластер C"],palette,245);
    return;
  }
  if(id==="ternary"){
    const a=[400,38],b=[188,382],c=[612,382];
    const loc=(x,y,z)=>[a[0]*x+b[0]*y+c[0]*z,a[1]*x+b[1]*y+c[1]*z];
    p.poly([a,b,c],null,"#5f749a",2);
    [.2,.4,.6,.8].forEach(v=>{
      p.line([loc(v,1-v,0),loc(v,0,1-v)],grid);
      p.line([loc(1-v,v,0),loc(0,v,1-v)],grid);
      p.line([loc(1-v,0,v),loc(0,1-v,v)],grid);
    });
    [["Компонент A",400,22],["Компонент B",155,406],["Компонент C",645,406]].forEach(([s,x,y])=>p.label(s,x,y,{align:"center"}));
    data.forEach(d=>{
      const sum=d.x+100-d.y+d.z;
      const xyz=[d.x/sum,(100-d.y)/sum,d.z/sum];
      p.dot(...loc(...xyz),3.3,palette[d.g]+"a0",xyz.map(v=>fmt(100*v)+"%").join(" / "));
    });
    return;
  }
  const {x,y}=axes(p,{xName:"Показатель X",yName:"Показатель Y"});
  if(id==="hex"){
    const bins=binHex(data.map(d=>[x(d.x),y(d.y)]),12);
    const peak=Math.max(...bins.map(d=>d.n));
    bins.forEach(d=>p.poly(hexagon(d.x,d.y,11.4,Math.PI/6),tint("#263b67","#84f4c9",Math.sqrt(d.n/peak)),null,0,"Наблюдений в ячейке · "+d.n));
    return;
  }
  if(id==="connected"){
    const pts=seq(36).map(i=>[x(50+i*.65+24*Math.cos(i*.24+p.t*2)),y(48+31*Math.sin(i*.22))]);
    pts.slice(1).forEach((pt,i)=>{
      const c=tint("#8aa6ff","#6ae7c7",i/34);
      p.line([pts[i],pt],c,2.8);
      p.dot(...pt,4.1,c,"Период "+(i+2));
    });
    p.label("Начало",pts[0][0]-8,pts[0][1]-14,{align:"right"});
    return;
  }
  data.forEach(d=>p.dot(x(d.x),y(d.y),id==="bubble"?Math.sqrt(d.z)*3.3:4.4,palette[d.g]+(id==="bubble"?"75":"bc"),"X: "+fmt(d.x)+" · Y: "+fmt(d.y)+(id==="bubble"?" · размер "+fmt(d.z):""),id==="bubble"?palette[d.g]:null));
});
function composition(t){
  return ["Север","Юг","Восток","Запад","Центр"].map((name,k)=>{
    const kids=seq(4+(k%2)).map(j=>({name:"Сектор "+(j+1),val:3+8*(1+Math.sin(j*1.22+k+t*2.7))}));
    return {name,k,kids,val:kids.reduce((s,v)=>s+v.val,0)};
  });
}
function tiles(items, bounds, fn){
  if(items.length===1){fn(items[0],bounds);return;}
  const [x,y,w,h]=bounds,total=items.reduce((s,v)=>s+v.val,0);
  let sum=0,cut=0;
  while(cut<items.length-1 && sum<total/2){sum+=items[cut++].val;}
  const f=sum/total;
  if(w>h){
    tiles(items.slice(0,cut),[x,y,w*f,h],fn);
    tiles(items.slice(cut),[x+w*f,y,w*(1-f),h],fn);
  }else{
    tiles(items.slice(0,cut),[x,y,w,h*f],fn);
    tiles(items.slice(cut),[x,y+h*f,w,h*(1-f)],fn);
  }
}
assign("donut waffle treemap sunburst icicle pack funnel",(p,id)=>{
  const groups=composition(p.t),total=groups.reduce((s,v)=>s+v.val,0);
  const cats=groups.map(v=>v.name);
  if(id==="treemap"){
    tiles(groups,[50,46,700,344],(g,[x,y,w,h])=>{
      p.rect(x,y,w-4,h-4,palette[g.k]);
      p.label(g.name,x+8,y+13,{color:"#0d1c31",weight:700,size:12});
      tiles(g.kids,[x+4,y+26,w-12,h-34],(kid,[a,b,d,e])=>p.rect(a,b,d-2,e-2,tint("#172741",palette[g.k],.35+.5*kid.val/19),g.name+" · "+kid.name+" · "+fmt(kid.val)));
    });
    return;
  }
  if(id==="pack"){
    const rand=random(66);
    const spots=[[245,215],[392,143],[541,190],[436,308],[586,315]];
    groups.forEach((g,i)=>{
      const [x,y]=spots[i],r=60+g.val*.39;
      p.dot(x,y,r,palette[i]+"27",g.name+" · "+fmt(g.val),palette[i]+"b0");
      g.kids.forEach((kid,j)=>{
        const rad=5+Math.sqrt(kid.val)*5;
        const [a,b]=polar(x,y,r*.53,j*TAU/g.kids.length+rand()*.15);
        p.dot(a,b,rad,palette[i]+"b0",g.name+" · "+kid.name+" · "+fmt(kid.val));
      });
      p.label(g.name,x,y,{align:"center",size:12});
    });
    return;
  }
  if(id==="waffle"){
    let sum=0;
    const limits=groups.map(g=>Math.round(100*(sum+=g.val)/total));
    seq(100).forEach(i=>{
      const k=limits.findIndex(v=>i<v);
      p.rect(225+i%10*35,40+Math.floor(i/10)*35,29,29,palette[k],cats[k]+" · "+(limits[k]-(limits[k-1]||0))+" из 100");
    });
    legend(p,cats,palette,155);
    return;
  }
  if(id==="funnel"){
    const phases=["Просмотр","Переход","Выбор","Заявка","Оплата"];
    const values=[100,76,55,36,22].map((v,i)=>Math.round(v-i*(p.t-.4)*3));
    values.forEach((v,k)=>{
      const y=57+k*65,a=v*2.4,b=(values[k+1]??v*.67)*2.4;
      p.poly([[400-a,y],[400+a,y],[400+b,y+57],[400-b,y+57]],palette[k],null,0,phases[k]+" · "+v+"%");
      p.label(phases[k]+" · "+v+"%",400,y+28,{align:"center",color:"#112139",weight:700});
    });
    return;
  }
  let f=0;
  groups.forEach(g=>{
    const width=g.val/total, end=f+width;
    const c=palette[g.k],info=g.name+" · "+fmt(100*width)+"%";
    if(id==="icicle")p.rect(56+688*f,132,688*width-3,84,c,info);
    else p.ring(400,213,64,id==="sunburst"?119:161,f*TAU-.5*Math.PI,end*TAU-.5*Math.PI,c,info,"#0f1c31");
    let start=f;
    if(id!=="donut") g.kids.forEach(kid=>{
      const stop=start+kid.val/total;
      const color=tint("#24324e",c,.38+.55*kid.val/19);
      const tip=g.name+" · "+kid.name+" · "+fmt(100*kid.val/total)+"% общего";
      if(id==="icicle")p.rect(56+688*start,220,(stop-start)*688-2,108,color,tip);
      else p.ring(400,213,121,177,start*TAU-.5*Math.PI,stop*TAU-.5*Math.PI,color,tip,"#0f1c31");
      start=stop;
    });
    if(id==="icicle")p.label(g.name,56+688*(f+end)/2,174,{align:"center",color:"#0d1b32",weight:700});
    f=end;
  });
  if(id==="icicle"){
    p.rect(56,72,688,56,"#42567b","Общий объём · 100%");
    p.label("Общий объём",400,100,{align:"center"});
  }else p.label("100%",400,213,{size:26,weight:650,align:"center"});
  legend(p,cats,palette,155);
});
