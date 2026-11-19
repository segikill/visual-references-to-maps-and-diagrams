const W = 800, H = 450, TAU = 2 * Math.PI;
const palette = ["#8aa6ff","#6ae7c7","#feb883","#ffa2c1","#bb9cff","#dce886","#52bce8","#ff876e"];
const ink = "#c4cee3", grid = "#243552";
const renderers = {};
const fmt = n => Number(n.toFixed(1)).toLocaleString("ru-RU");
const seq = n => Array.from({length:n}, (_,i) => i);
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a,v));
const mix = (a,b,t) => a + (b-a)*t;
const polar = (x,y,r,a) => [x + r*Math.cos(a), y + r*Math.sin(a)];
const month = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const cities = ["Амур","Байкал","Ладога","Ока","Обь","Кама","Лена","Алтай"];
function random(seed) {
  return () => {
    seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function tint(a,b,t) {
  const nums = s => s.slice(1,7).match(/../g).map(x => parseInt(x,16));
  const end = nums(b);
  return "rgb(" + nums(a).map((x,i) => Math.round(mix(x,end[i],clamp(t)))).join(",") + ")";
}
function paint(canvas, entry, state = {}, preview = false) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  ctx.clearRect(0,0,W,H);
  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0, "#15243e");
  bg.addColorStop(1, "#0b1428");
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const hits = [];
  function shape(points, close=false) {
    const path = new Path2D();
    points.forEach(([x,y],i) => i ? path.lineTo(x,y) : path.moveTo(x,y));
    if (close) path.closePath();
    return path;
  }
  function draw(path, fill, stroke, size=1, info) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(path,"evenodd"); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = size; ctx.stroke(path); }
    if (info && !preview) hits.push({path,fill,stroke,size,info});
  }
  const p = {
    ctx, hits, preview, state, t:(state.phase ?? 35)/100,
    draw, shape,
    line(points,color=ink,width=2,info) { draw(shape(points),null,color,width,info); },
    poly(points,color,stroke,width,info) { draw(shape(points,true),color,stroke,width,info); },
    rect(x,y,w,h,color,info) {
      if (w<=0 || h<=0) return;
      const path = new Path2D();
      path.rect(x,y,w,h);
      draw(path,color,null,1,info);
    },
    dot(x,y,r,color,info,stroke) {
      const path = new Path2D();
      path.arc(x,y,Math.max(.1,r),0,TAU);
      draw(path,color,stroke,1.5,info);
    },
    ring(x,y,r0,r1,a,b,color,info,stroke) {
      const path = new Path2D();
      path.arc(x,y,r1,a,b);
      if (r0) path.arc(x,y,r0,b,a,true);
      else path.lineTo(x,y);
      path.closePath();
      draw(path,color,stroke,1,info);
    },
    label(str,x,y,{color=ink,size=14,align="left",weight=400}={}) {
      ctx.font = weight + " " + size + "px 'Segoe UI', sans-serif";
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(str,x,y);
    }
  };
  renderers[entry.id](p,entry.id);
  return hits;
}
function axes(p, {left=75,right=750,top=55,bottom=380,xMax=100,yMax=100,xName="",yName="",xLabels, yTicks=4} = {}) {
  const x = i => left + (right-left)*i/xMax;
  const y = i => bottom - (bottom-top)*i/yMax;
  for(let i=0;i<=yTicks;i++) {
    const value = yMax*i/yTicks;
    p.line([[left,y(value)],[right,y(value)]],grid);
    p.label(fmt(value),left-12,y(value),{align:"right",size:12});
  }
  const ticks = xLabels || seq(6).map(i=>fmt(xMax*i/5));
  ticks.forEach((v,i)=>p.label(v,mix(left,right,i/(ticks.length-1)),bottom+22,{align:"center",size:12}));
  if (xName) p.label(xName,right,420,{align:"right",size:13});
  if (yName) p.label(yName,left,top-24,{size:13});
  return {x,y,left,right,top,bottom};
}
function signal(i,k,t) {
  return 33 + 8*k + 13*Math.sin(i*.35 + k*.95 + 2*t) + 6*Math.cos(i*.6+k) + i*.46;
}
function legend(p,names,colors=palette,x=80,y=421) {
  names.forEach((n,i) => {
    p.dot(x+i*106,y,4,colors[i]);
    p.label(n,x+i*106+10,y,{size:12});
  });
}
function scaleLegend(p,low,high,a,b,x=250,y=414) {
  const g=p.ctx.createLinearGradient(x,0,x+256,0);
  g.addColorStop(0,a);g.addColorStop(1,b);
  p.rect(x,y,256,8,g);
  p.label(low,x-10,y+4,{align:"right",size:12});
  p.label(high,x+266,y+4,{size:12});
}
function assign(ids,fn) {
  ids.split(" ").forEach(id => { renderers[id] = fn; });
}
assign("line step area stackarea stream band horizon", (p,id) => {
  const n=36;
  if (id==="horizon") {
    seq(5).forEach(k=>{
      const base=90+k*65;
      p.label(cities[k],66,base-14,{align:"right",size:12});
      p.rect(83,base-42,650,42,"#1b2a44");
      [1,-1].forEach(sign=>seq(3).forEach(level=>{
        const points=seq(n).map(i=>[mix(83,733,i/(n-1)),base-42*clamp((signal(i,k,p.t)-50-k*8)*sign/8-level)]);
        p.poly([[83,base],...points,[733,base]],tint("#1b2a44",sign===1?"#78edca":"#ef7f91",(level+1)*.29));
      }));
      seq(n).forEach(i=>p.rect(mix(83,733,i/(n-1))-8,base-42,16,42,"transparent",cities[k]+" · "+fmt(signal(i,k,p.t))));
    });
    return;
  }
  const {x,y,bottom}=axes(p,{xMax:n-1,yMax:id==="stackarea"?160:100,xLabels:["Янв","Мар","Май","Июл","Сен","Ноя","Дек"],yName:"Условные единицы"});
  if (id==="stream" || id==="stackarea") {
    const layers=seq(6).map(k=>seq(n).map(i=>5 + 31*Math.exp(-((i-6-k*4-4*p.t)**2)/54) * (.7+.3*Math.sin(k+i*.14))));
    const sums=seq(n).map(i=>layers.reduce((s,series)=>s+series[i],0));
    let base=sums.map(v=>id==="stream"?50-v/2:0);
    layers.forEach((series,k)=>{
      const next=series.map((v,i)=>v+base[i]);
      p.poly([...next.map((v,i)=>[x(i),y(v)]),...base.map((v,i)=>[x(i),y(v)]).reverse()],palette[k], "#111e36",1,cities[k]+" · "+fmt(series.reduce((a,b)=>a+b,0)/n)+" в среднем");
      base=next;
    });
    legend(p,cities.slice(0,6));
    return;
  }
  const count = id==="line"?4:1;
  seq(count).forEach(k=>{
    const vals=seq(n).map(i=>id==="step"?signal(Math.floor(i/5)*5,k,p.t):signal(i,k,p.t));
    const points=vals.map((v,i)=>[x(i),y(v)]);
    const curve=id==="step"?points.flatMap((pt,i)=>i?[[pt[0],points[i-1][1]],pt]:[pt]):points;
    if (id==="area") {
      const g=p.ctx.createLinearGradient(0,100,0,bottom);
      g.addColorStop(0,"#8aa6ffbb");g.addColorStop(1,"#8aa6ff14");
      p.poly([[x(0),bottom],...points,[x(n-1),bottom]],g);
    }
    if (id==="band") {
      const spread=i=>7+4*Math.sin(i*.13+1);
      p.poly([...vals.map((v,i)=>[x(i),y(v+spread(i))]),...vals.map((v,i)=>[x(i),y(v-spread(i))]).reverse()],"#73dbc54b",null,0,"Полоса ±7–11 условных ед.");
    }
    p.line(curve,palette[id==="band"?1:k],3);
    points.forEach(([a,b],i)=>p.dot(a,b,id==="step"?2.4:3,palette[id==="band"?1:k],cities[k]+" · период "+(i+1)+" · "+fmt(vals[i])));
  });
  legend(p,id==="line"?cities.slice(0,4):id==="band"?["Оценка","Диапазон"]:[cities[0]],id==="band"?[palette[1],"#497e85"]:palette);
});
assign("slope bump", (p,id)=>{
  const bump=id==="bump", n=bump?7:2;
  const vals=seq(n).map(i=>seq(6).map(k=>signal(i*3,k*.46,p.t)+11*Math.sin(k*4+i*.9)));
  const ranks=vals.map(row=>row.map(v=>1+row.filter(w=>w>v).length));
  const xx=i=>mix(113,687,i/(n-1));
  const yy=v=>bump?mix(70,362,(v-1)/5):mix(377,54,v/100);
  seq(n).forEach(i=>{
    p.line([[xx(i),54],[xx(i),378]],grid,1);
    p.label(bump?month[Math.round(i*11/6)]:["До","После"][i],xx(i),406,{align:"center"});
  });
  seq(6).forEach(k=>{
    const pts=seq(n).map(i=>[xx(i),yy(bump?ranks[i][k]:vals[i][k])]);
    p.line(pts,palette[k],3,cities[k]);
    pts.forEach(([x,y],i)=>{const v=bump?ranks[i][k]:vals[i][k]; p.dot(x,y,7,palette[k],cities[k]+" · "+(bump?"место ":"")+fmt(v));});
    p.label(cities[k],pts.at(-1)[0]+13,pts.at(-1)[1],{color:palette[k],size:12});
  });
  if (bump) seq(6).forEach(i=>p.label(i+1,89,yy(i+1),{align:"right"}));
});
assign("candles spiral", (p,id)=>{
  if(id==="spiral"){
    seq(5).forEach(i=>p.dot(400,222,38+i*37,null,null,grid));
    month.forEach((m,i)=>{const a=i*TAU/12-Math.PI/2;const [x,y]=polar(400,222,205,a);p.label(m,x,y,{align:"center",size:12});});
    const pts=seq(120).map(i=>{
      const value=8*Math.sin(i*.52+p.t*TAU)+i*.84;
      return [...polar(400,222,46+1.32*value,i*TAU/12-Math.PI/2),value];
    });
    pts.slice(1).forEach((pt,i)=>{
      const c=tint("#6387f9","#ff9a71",i/118);
      p.line([pts[i],pt],c,2.6);
      p.dot(pt[0],pt[1],2.4,c,"Год "+(1+Math.floor((i+1)/12))+" · "+month[(i+1)%12]+" · индекс "+fmt(pt[2]));
    });
    return;
  }
  const {x,y}=axes(p,{xMax:29,yMax:100,xName:"Период",yName:"Условная цена",xLabels:["1","7","13","19","25","30"]});
  seq(30).forEach(i=>{
    const open=signal(i,1,p.t),close=signal(i+1,1,p.t)+2*Math.sin(i*3);
    const low=Math.min(open,close)-4-(i%4),high=Math.max(open,close)+3+(i%3);
    const c=close>=open?palette[1]:palette[3];
    p.line([[x(i),y(low)],[x(i),y(high)]],c,1.4);
    p.rect(x(i)-6,y(Math.max(open,close)),12,Math.max(2,Math.abs(y(open)-y(close))),c,"О: "+fmt(open)+" · З: "+fmt(close)+" · Мин: "+fmt(low)+" · Макс: "+fmt(high));
  });
});
assign("bars race lollipop dumbbell diverging bullet pyramid grouped waterfall radar stackbar", (p,id)=>{
  const labels=cities;
  const data=seq(8).map(i=>({i, name:labels[i],a:clamp(signal(i*2,i*.7,p.t)*1.17,4,100),b:clamp(36+34*Math.sin(i*.68+2*p.t)+i*5,4,100)}));
  if(id==="radar"){
    const tags=["Скорость","Качество","Охват","Надёжность","Гибкость","Цена"];
    const pt=(i,r)=>polar(400,215,r,i*TAU/6-Math.PI/2);
    seq(5).forEach(k=>p.poly(seq(6).map(i=>pt(i,(k+1)*32)),null,grid,1));
    tags.forEach((s,i)=>{p.line([[400,215],pt(i,160)],grid);p.label(s,...pt(i,184),{align:"center",size:12});});
    ["a","b"].forEach((key,k)=>{
      const pts=data.slice(0,6).map((v,i)=>pt(i,v[key]*1.6));
      p.poly(pts,palette[k]+"35",palette[k],3);
      pts.forEach(([x,y],i)=>p.dot(x,y,5,palette[k],tags[i]+" · "+fmt(data[i][key])));
    });
    legend(p,["Профиль А","Профиль Б"],palette,310);
    return;
  }
  if(id==="waterfall" || id==="grouped"){
    const values=[40,16,-9,13,-8,12,-5].map((v,i)=>i?v+Math.round((p.t-.5)*i):v);
    const ticks=id==="waterfall"?["Старт","Приток","Сбыт","Резерв","Потери","Рост","Скидки","Итог"]:labels;
    const {x,y}=axes(p,{left:112,right:700,xMax:7,yName:"Условные единицы",xLabels:ticks});
    let total=0;
    data.forEach((row,i)=>{
      if(id==="grouped"){
        [row.a,row.b].forEach((v,k)=>p.rect(x(i)-23+k*24,y(v),21,y(0)-y(v),palette[k],row.name+" · группа "+(k+1)+" · "+fmt(v)));
        return;
      }
      const end=i===7 || i===0, value=i===7?total:values[i];
      const from=end?0:total, to=end?value:total+value;
      p.rect(x(i)-20,y(Math.max(from,to)),40,Math.abs(y(from)-y(to)),end?palette[0]:value>0?palette[1]:palette[3],ticks[i]+" · "+fmt(value));
      if(i<7) {total=to;p.line([[x(i)+20,y(total)],[x(i+1)-20,y(total)]],ink);}
    });
    if(id==="grouped") legend(p,["Группа 1","Группа 2"],palette,310);
    return;
  }
  const sorted=["bars","race","lollipop"].includes(id)?[...data].sort((a,b)=>b.a-a.a):data;
  const left=141,right=733,mid=(left+right)/2,span=right-left;
  const mirrored=["pyramid","diverging"].includes(id);
  seq(6).forEach(i=>{
    const x=left+i*span/5;
    p.line([[x,52],[x,384]],grid);
    const tick=mirrored?(i*40-100):i*20;
    if(!mirrored) p.label(id==="stackbar"?tick+"%":tick,x,404,{align:"center",size:12});
  });
  if(mirrored){
    p.line([[mid,53],[mid,383]],ink);
    [-100,-50,0,50,100].forEach(v=>p.label(id==="pyramid"?Math.abs(v):v,mid+v*span/200,405,{align:"center",size:12}));
  }
  sorted.forEach((row,i)=>{
    const y=68+i*41;
    const x=v=>left+v*span/100;
    const c=palette[row.i];
    const a=row.a,b=row.b;
    const label=id==="pyramid"?(15+i*10)+"–"+(24+i*10):row.name;
    p.label(label,left-12,y,{align:"right",size:13});
    const tip=v=>label+" · "+fmt(v);
    if(id==="pyramid"){
      const widthA=span/2*(a/100)*(1-i*.087), widthB=span/2*(b/100)*(1-i*.087);
      p.rect(mid-widthA,y-12,widthA,24,palette[0],tip(widthA/span*200)+" · группа А");
      p.rect(mid,y-12,widthB,24,palette[3],tip(widthB/span*200)+" · группа Б");
    } else if(id==="diverging"){
      const v=(a-b)*1.5, w=Math.abs(v)*span/200;
      p.rect(v<0?mid-w:mid,y-12,w,24,v<0?palette[3]:palette[1],tip(v));
    } else if(id==="bullet"){
      [100,75,46].forEach((v,k)=>p.rect(left,y-14,span*v/100,28,["#263753","#364b67","#4a5e7f"][k]));
      p.rect(left,y-5,span*a/100,10,palette[1],tip(a)+" · факт");
      p.line([[x(b),y-15],[x(b),y+15]],"#fff",3,tip(b)+" · цель");
    } else if(id==="lollipop" || id==="dumbbell"){
      const start=id==="lollipop"?left:x(b);
      p.line([[start,y],[x(a),y]],c,3);
      p.dot(x(a),y,8,c,tip(a));
      if(id==="dumbbell") p.dot(start,y,7,palette[1],tip(b));
    } else if(id==="stackbar"){
      const parts=[a,b,40+14*Math.sin(i),33+9*Math.cos(i+p.t)];
      const sum=parts.reduce((s,v)=>s+v,0);
      let at=left;
      parts.forEach((v,k)=>{
        p.rect(at,y-13,span*v/sum-2,26,palette[k],row.name+" · сегмент "+(k+1)+" · "+fmt(100*v/sum)+"%");
        at+=span*v/sum;
      });
    } else {
      p.rect(left,y-12,span*a/100,24,c,tip(a));
      p.label(fmt(a),x(a)-7,y,{align:"right",color:"#122038",size:12,weight:700});
    }
  });
});
