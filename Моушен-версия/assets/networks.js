function ribbon(p,x1,y1,x2,y2,h,color,info){
  const path=new Path2D(), mid=(x1+x2)/2;
  path.moveTo(x1,y1);
  path.bezierCurveTo(mid,y1,mid,y2,x2,y2);
  path.lineTo(x2,y2+h);
  path.bezierCurveTo(mid,y2+h,mid,y1+h,x1,y1+h);
  path.closePath();
  p.draw(path,color,null,0,info);
}
assign("sankey chord force arc radial adjacency",(p,id)=>{
  const names=["Транспорт","Жильё","Энергия","Связь","Торговля","Услуги"];
  if(id==="sankey"){
    const stage=[["Ветер","Солнце","Гидро"],["Прямая подача","Накопление","Преобразование"],["Город","Промышленность","Экспорт"]];
    const flows=[
      [[18,12,8],[16,6+Math.round(7*p.t),15],[13,7,5]],
      [[15,20,12],[8,11,6+Math.round(7*p.t)],[9,12,7]]
    ];
    const magnitude=flows[0].flat().reduce((s,v)=>s+v,0);
    const unit=282/magnitude,x=[116,399,682];
    const sizes=[
      flows[0].map(r=>r.reduce((s,v)=>s+v,0)),
      seq(3).map(i=>flows[0].reduce((s,r)=>s+r[i],0)),
      seq(3).map(i=>flows[1].reduce((s,r)=>s+r[i],0))
    ];
    const positions=sizes.map(row=>{
      let offset=69;
      return row.map(v=>{const a=offset; offset+=v*unit+15;return a;});
    });
    flows.forEach((rows,s)=>{
      const source=[...positions[s]],dest=[...positions[s+1]];
      rows.forEach((row,a)=>row.forEach((v,b)=>{
        const h=v*unit;
        ribbon(p,x[s]+8,source[a],x[s+1]-8,dest[b],h,palette[(a+s)%6]+"80",stage[s][a]+" → "+stage[s+1][b]+" · "+v+" ед.");
        source[a]+=h;dest[b]+=h;
      }));
    });
    sizes.forEach((row,s)=>row.forEach((v,k)=>{
      p.rect(x[s]-8,positions[s][k],16,v*unit,palette[(k+s)%6],stage[s][k]+" · "+v+" ед.");
      const align=s===0?"right":s===2?"left":"center";
      p.label(stage[s][k],x[s]+(s===0?-13:s===2?13:0),positions[s][k]+(s===1?10:v*unit/2),{align,size:12,weight:600});
    }));
    ["Производство","Распределение","Потребление"].forEach((n,i)=>p.label(n,x[i],45,{align:"center",size:13}));
    return;
  }
  if(id==="chord"){
    const count=6;
    const pairs=seq(6).flatMap(i=>seq(5-i).map(j=>[i,j+i+1]));
    const vals=pairs.map(([i,j])=>Math.round(3+12*(.5+.5*Math.sin(i*2+j*1.4+p.t*TAU))));
    const totals=seq(count).map(k=>pairs.reduce((s,pair,n)=>s+(pair.includes(k)?vals[n]:0),0));
    const full=totals.reduce((a,b)=>a+b,0),unit=(TAU-count*.1)/full;
    let at=-Math.PI/2;
    const slots=totals.map(v=>{const start=at;at+=v*unit+.1;return start;});
    slots.forEach((start,k)=>{
      const end=start+totals[k]*unit;
      p.ring(400,217,148,169,start,end,palette[k],names[k]+" · "+totals[k]+" ед.");
      p.label(names[k],...polar(400,217,191,(start+end)/2),{size:12,align:"center"});
    });
    const offsets=[...slots];
    pairs.forEach(([i,j],n)=>{
      const width=vals[n]*unit, s=offsets[i],t=offsets[j],r=146;
      const [a,b]=polar(400,217,r,s),[c,d]=polar(400,217,r,t);
      const path=new Path2D();
      path.moveTo(a,b);
      path.arc(400,217,r,s,s+width);
      path.quadraticCurveTo(400,217,c,d);
      path.arc(400,217,r,t,t+width);
      path.quadraticCurveTo(400,217,a,b);
      path.closePath();
      p.draw(path,palette[i]+"77",palette[i]+"75",.7,names[i]+" ↔ "+names[j]+" · "+vals[n]+" ед.");
      offsets[i]+=width;offsets[j]+=width;
    });
    return;
  }
  if(id==="radial"){
    p.dot(400,220,177,null,null,grid);p.dot(400,220,111,null,null,grid);
    seq(6).forEach(k=>{
      const start=k*TAU/6+p.t*.45;
      const mid=polar(400,220,77,start),c=palette[k];
      p.line([[400,220],mid],c,2.3,names[k]);
      seq(4).forEach(j=>{
        const a=start-.32+j*.22;
        const end=polar(400,220,124,a);
        p.line([mid,end],c,1.7,names[k]+" · ветвь "+(j+1));
        p.dot(...end,4,c);
        seq(3).forEach(v=>{
          const tip=polar(400,220,177,a+(v-1)*.065);
          p.line([end,tip],c+"90",1.1);
          p.dot(...tip,3.8,c,names[k]+" · ветвь "+(j+1)+" · лист "+(v+1));
        });
      });
      p.dot(...mid,8,c,names[k]);
    });
    p.dot(400,220,9,"#e7efff","Корень");
    return;
  }
  const rng=random(199),n=36;
  const nodes=seq(n).map(i=>{
    const k=Math.floor(i/6);
    const [a,b]=polar(400,217,140,k*TAU/6-.45+p.t*.4);
    const [x,y]=polar(a,b,17+rng()*37,rng()*TAU);
    return {x,y,k,i,name:names[k]+" "+(i%6+1)};
  });
  const links=[];
  nodes.forEach((a,i)=>nodes.slice(i+1).forEach(b=>{
    if(rng()<(a.k===b.k?.67:.039+p.t*.025))links.push([a,b]);
  }));
  if(id==="adjacency"){
    const x=229,y=48,z=9.5;
    p.rect(x,y,z*n,z*n,"#1b2c49");
    nodes.forEach(a=>p.rect(x+a.i*z,y+a.i*z,z-1,z-1,"#3a4a69",a.name));
    links.forEach(([a,b])=>[[a,b],[b,a]].forEach(([u,v])=>p.rect(x+u.i*z,y+v.i*z,z-1,z-1,palette[u.k],u.name+" ↔ "+v.name)));
    names.forEach((name,i)=>p.label(name,x-8,y+z*(i*6+3),{align:"right",size:12,color:palette[i]}));
    return;
  }
  if(id==="arc"){
    const x=i=>55+i*690/(n-1), base=360;
    links.forEach(([a,b])=>{
      const from=x(a.i),to=x(b.i),r=(to-from)/2;
      const path=new Path2D();
      path.ellipse((from+to)/2,base,r,r*.82,0,Math.PI,TAU);
      p.draw(path,null,palette[a.k]+"aa",1.8,a.name+" ↔ "+b.name);
    });
    nodes.forEach(a=>p.dot(x(a.i),base,6,palette[a.k],a.name));
    legend(p,names,palette,82);
    return;
  }
  links.forEach(([a,b])=>p.line([[a.x,a.y],[b.x,b.y]],palette[a.k]+"63",a.k===b.k?1.8:.9,a.name+" ↔ "+b.name));
  nodes.forEach(a=>p.dot(a.x,a.y,a.i%6===0?8:5,palette[a.k],a.name,"#0d1c36"));
  legend(p,names,palette,82);
});
assign("heat calendar gantt small stripes windrose",(p,id)=>{
  if(id==="calendar" || id==="heat"){
    const calendar=id==="calendar", cols=calendar?53:24, rows=calendar?7:12;
    const dx=calendar?12.25:26,dy=calendar?29:24,left=calendar?83:100,top=calendar?122:62;
    const rng=random(2159);
    seq(cols).forEach(i=>seq(rows).forEach(j=>{
      const day=i*7+j;
      if(calendar&&day>=366)return;
      const value=clamp(.42+.28*Math.sin(i*.31+j*.65+p.t*4)+.23*Math.cos(i*.62-j*.36)+(rng()-.5)*.45-(calendar&&j>4?.25:0));
      const name=calendar?new Date(Date.UTC(2024,0,1+day)).toLocaleDateString("ru-RU",{timeZone:"UTC"}):month[j]+" · "+String(i).padStart(2,"0")+":00";
      p.rect(left+dx*i,top+dy*j,dx-2,dy-2,tint("#233457",calendar?"#9cf7b1":"#c89aff",Math.pow(value,1.3)),name+" · "+fmt(value*100));
    }));
    const tags=calendar?["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]:month;
    tags.forEach((m,i)=>p.label(m,left-8,top+i*dy+dy/2,{size:11,align:"right"}));
    if(calendar)month.forEach((m,i)=>p.label(m,left+(Date.UTC(2024,i,1)-Date.UTC(2024,0,1))/86400000/7*dx,top-20,{size:11}));
    else seq(8).forEach(i=>p.label(String(i*3).padStart(2,"0")+":00",left+i*dx*3,top-17,{size:11}));
    scaleLegend(p,"0","100","#233457",calendar?"#9cf7b1":"#c89aff",260,387);
    return;
  }
  if(id==="gantt"){
    const steps=["Замысел","Данные","Подготовка","Код","Проверка","Выпуск"];
    const spans=[[0,4],[2,4],[4,5],[6,6],[10,4],[14,2]];
    const x=v=>148+v*34;
    seq(17).forEach(i=>{
      p.line([[x(i),60],[x(i),366]],grid);
      if(i%2===0)p.label(i,x(i),388,{size:12,align:"center"});
    });
    steps.forEach((n,i)=>{
      const [start,length]=spans[i],end=start+length+Math.round((p.t-.5)*(i%3));
      const y=78+i*51;
      p.label(n,135,y,{align:"right",size:13});
      p.rect(x(start),y-12,x(end)-x(start),24,palette[i],n+" · недели "+start+"–"+end);
      if(i<5){
        const stop=x(spans[i+1][0]);
        p.line([[x(end),y],[x(end)+7,y],[x(end)+7,y+26],[stop-7,y+26],[stop-7,y+51],[stop,y+51]],"#acbedb",1);
      }
    });
    p.label("Недели",693,416,{align:"right",size:12});
    return;
  }
  if(id==="small"){
    const names=["Север","Юг","Восток","Запад","Центр","Острова"];
    names.forEach((name,k)=>{
      const x=65+k%3*232,y=76+Math.floor(k/3)*174,c=palette[k];
      p.label(name,x,y-17,{color:ink,weight:600,size:13});
      seq(3).forEach(i=>p.line([[x,y+i*47],[x+198,y+i*47]],grid));
      const pts=seq(22).map(i=>[x+i*198/21,y+105-clamp(signal(i,k*.55,p.t)/100)*100]);
      p.poly([[x,y+104],...pts,[x+198,y+104]],c+"28");
      p.line(pts,c,2.4);
      pts.forEach(([a,b],i)=>p.dot(a,b,2.5,c,name+" · период "+(i+1)+" · "+fmt(signal(i,k*.55,p.t))));
    });
    return;
  }
  if(id==="stripes"){
    const rand=random(16);
    seq(124).forEach(i=>{
      const value=-.68+i*.014+Math.sin(i*.216+p.t*3)*.24+(rand()-.5)*.42;
      p.rect(50+i*700/124,100,5.83,239,value<0?tint("#f3e1c7","#315ad0",-value):tint("#f3e1c7","#ae244a",value),1900+i+" · "+(value>0?"+":"")+fmt(value)+" усл. ед.");
    });
    ["1900","1940","1980","2023"].forEach((n,i)=>p.label(n,50+[0,40,80,123][i]*700/124,359,{size:12,align:i===3?"right":"left"}));
    scaleLegend(p,"Ниже нормы","Выше нормы","#315ad0","#ae244a",270,398);
    return;
  }
  const tags=["С","СВ","В","ЮВ","Ю","ЮЗ","З","СЗ"];
  seq(4).forEach(i=>p.dot(400,221,(i+1)*39,null,null,grid));
  tags.forEach((s,k)=>p.label(s,...polar(400,221,173,k*TAU/8-Math.PI/2),{align:"center",size:12}));
  const colors=["#7ed4eb","#858dff","#ff9fbc"];
  seq(16).forEach(k=>{
    let base=0;
    const a=k*TAU/16-Math.PI/2, count=42+25*Math.sin(k*.57+p.t*4)+12*Math.cos(k*1.1);
    [.53,.31,.16].forEach((q,j)=>{
      const end=base+count*q;
      p.ring(400,221,base*1.87,end*1.87,a-.15,a+.15,colors[j],String(k*22.5)+"° · класс "+(j+1)+" · "+fmt(count*q));
      base=end;
    });
  });
  legend(p,["Слабый","Средний","Сильный"],colors,274);
});
