function elevation(x,y){
  return .72*Math.exp(-((x-.28)**2*17+(y-.34)**2*13))+
    .84*Math.exp(-((x-.64)**2*27+(y-.64)**2*12))+
    .59*Math.exp(-((x-.81)**2*38+(y-.24)**2*11))+
    .08*Math.sin(x*28+y*17)*Math.cos(x*23-y*25)+.045*Math.sin(x*61)*Math.cos(y*55);
}
function roadNetwork(p){
  function bend(a,b,i){
    return [mix(a[0],b[0],i)+Math.sin(i*TAU)*38,mix(a[1],b[1],i)+Math.sin(i*Math.PI)*58];
  }
  seq(15).forEach(i=>{
    const a=[33+i*54,54],b=[-35+i*57,396];
    p.line(seq(30).map(k=>bend(a,b,k/29)),"#324866",i%4===0?2.4:1);
  });
  seq(11).forEach(i=>{
    const a=[32,48+i*34],b=[765,36+i*31];
    p.line(seq(45).map(k=>bend(a,b,k/44)),"#324866",i%3===0?2.4:1);
  });
  const river=seq(80).map(i=>[34+i*9.2,315-1.65*i+49*Math.sin(i*.069)]);
  p.line(river,"#396b89",21);
  p.line(river,"#4982a2",1);
}
const metro=[
  [[114,167],[172,167],[240,235],[316,235],[399,235],[471,235],[526,180],[601,180],[674,180]],
  [[209,348],[265,348],[316,296],[316,235],[316,152],[374,94],[442,94]],
  [[396,352],[399,296],[399,235],[399,173],[450,122],[523,122],[584,82]],
  [[121,291],[193,291],[240,235],[294,181],[346,181],[399,173],[463,173],[526,180],[594,248],[665,248]]
];
assign("columns isolines hillshade isochrone voronoi schematic cartogram wind",(p,id)=>{
  if(id==="columns"){
    const n=23, proj=(x,y,z=0)=>[400+(x-y)*13.75,119+(x+y)*5.8-z];
    seq(24).forEach(i=>{
      p.line([proj(i,0),proj(i,23)],grid);
      p.line([proj(0,i),proj(23,i)],grid);
    });
    const rng=random(6458);
    seq(n*2-1).forEach(s=>seq(n).forEach(x=>{
      const y=s-x;
      if(y<0||y>=n)return;
      const f=Math.max(0,elevation(x/(n-1),y/(n-1))-.18);
      const value=f**2*192+(rng()-.4)*11;
      if(value<4)return;
      const poly=[proj(x,y),proj(x+.78,y),proj(x+.78,y+.78),proj(x,y+.78)];
      const top=poly.map(([a,b])=>[a,b-value*(.84+p.t*.31)]);
      const c=tint("#4061a0","#fa9cc5",value/150);
      const desc="Ячейка "+(x+1)+" × "+(y+1)+" · "+fmt(value*(.84+p.t*.31));
      p.poly([poly[1],poly[2],top[2],top[1]],"#45639b",null,0,desc);
      p.poly([poly[2],poly[3],top[3],top[2]],"#252e5d",null,0,desc);
      p.poly(top,c,null,0,desc);
    }));
    p.label("Модельная интенсивность по ячейкам",400,421,{align:"center",size:13});
    return;
  }
  if(id==="hillshade" || id==="isolines"){
    const nx=115,ny=61, x0=48,y0=53,dx=704/nx,dy=330/ny;
    const az=-2.27+p.t*TAU, pos=(i,j)=>[x0+i*dx,y0+j*dy];
    const z=(i,j)=>elevation(i/nx,j/ny);
    seq(nx).forEach(i=>seq(ny).forEach(j=>{
      const v=z(i+.5,j+.5),[x,y]=pos(i,j);
      const gradX=(z(i+1,j)-z(i-1,j))*.85, gradY=(z(i,j+1)-z(i,j-1))*1.4;
      const light=clamp(.44+(gradX*Math.cos(az)+gradY*Math.sin(az))*6+.30*v);
      const color=id==="hillshade"?tint("#0f233b","#dfdab4",light):tint("#172a46","#337e80",v);
      p.rect(x,y,dx+.25,dy+.25,color);
    }));
    if(id==="isolines")seq(12).forEach(k=>{
      const threshold=.18+k*.061;
      const segments=new Path2D();
      seq(nx).forEach(i=>seq(ny).forEach(j=>{
        const nodes=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]];
        const crossings=[];
        nodes.forEach((a,e)=>{
          const b=nodes[(e+1)%4],za=z(...a),zb=z(...b);
          if((za<threshold)===(zb<threshold))return;
          const f=(threshold-za)/(zb-za);
          crossings.push(pos(mix(a[0],b[0],f),mix(a[1],b[1],f)));
        });
        if(crossings.length===4 && (z(i+.5,j+.5)<threshold)===(z(i,j)<threshold))crossings.push(crossings.shift());
        for(let n=0;n+1<crossings.length;n+=2){
          segments.moveTo(...crossings[n]);segments.lineTo(...crossings[n+1]);
        }
      }));
      p.draw(segments,null,tint("#609d9c","#f0d491",k/11),k%5===0?1.8:1,"Высота · "+Math.round(threshold*2100)+" м");
    });
    else{
      const a=polar(725,69,27,az);
      p.draw(p.shape([[725,69],a]),null,"#ffecc1",2,"Направление освещения");
      p.dot(...a,4,"#ffecc1");
    }
    p.label(id==="hillshade"?"Освещение синтетического рельефа":"Горизонтали синтетического рельефа",400,420,{align:"center",size:13});
    return;
  }
  if(id==="schematic"){
    const names=["Вокзал","Садовая","Парк","Рынок","Площадь","Порт","Музей","Арена","Депо"];
    metro.forEach((a,j)=>p.line(a,palette[j],7,"Линия "+(j+1)));
    metro.forEach((a,j)=>a.forEach(([x,y],i)=>{
      const transfer=metro.some((b,k)=>k!==j&&b.some(([u,v])=>u===x&&v===y));
      p.dot(x,y,transfer?8:4.5,"#e6f0ff",names[(i+j)%9]+" · "+(transfer?"пересадка":"линия "+(j+1)),palette[j]);
      if((i===0||i===a.length-1||transfer)&&!(j>0&&transfer))p.label(names[(i+j)%9],x,y-15,{align:"center",size:11});
    }));
    legend(p,["Линия 1","Линия 2","Линия 3","Линия 4"],palette,215);
    return;
  }
  if(id==="cartogram"){
    const blocks=[
      ["Мур",1,1],["Арх",2,2],["Кар",1,2],["Ком",3,2],["ЯНАО",4,2],["НАО",3,1],["Крас",5,2],["Якут",6,1],["Чук",8,0],["Маг",7,2],["Кам",8,2],
      ["СПб",0,3],["Лен",1,3],["Вол",2,3],["Кир",3,3],["ХМАО",4,3],["Том",5,3],["Ирк",6,3],["Хаб",7,3],["Сах",8,4],
      ["Пск",0,4],["Нов",1,4],["Яр",2,4],["Удм",3,4],["Сверд",4,4],["Кем",5,4],["Бур",6,4],["Амур",7,4],
      ["Смо",0,5],["Мск",1,5],["Влад",2,5],["Тат",3,5],["Чел",4,5],["Нск",5,5],["Заб",6,5],["При",7,5],
      ["Брян",0,6],["Тул",1,6],["Ряз",2,6],["Сам",3,6],["Кург",4,6],["Алт",5,6],["Тыва",6,6],
      ["Бел",0,7],["Вор",1,7],["Тамб",2,7],["Сар",3,7],["Омск",4,7],["Хак",5,7],
      ["Рост",1,8],["Волг",2,8],["Астр",3,8]
    ];
    blocks.forEach(([name,i,j],k)=>{
      const x=206+i*46+(j%2)*13,y=31+j*40,v=.5+.49*Math.sin(k*.666+p.t*3);
      const c=hexagon(x,y,25);
      p.poly(c,tint("#254775","#a4e8bb",v),null,0,name+" · индекс "+fmt(v*100));
      p.label(name,x,y,{align:"center",size:10,color:v>.65?"#14233a":"#ecf4ff",weight:650});
    });
    scaleLegend(p,"0","100","#254775","#a4e8bb",272,413);
    return;
  }
  if(id==="isochrone" || id==="voronoi"){
    frame(p,[31,43,738,357],()=>{
      const hubs=[[170,128],[278,268],[406,181],[508,295],[596,134],[684,262]];
      const colors=palette.slice(0,6);
      if(id==="voronoi"){
        const size=8;
        for(let x=32;x<768;x+=size)for(let y=44;y<400;y+=size){
          let min=Infinity,index=0;
          hubs.forEach(([a,b],k)=>{const d=(a-x)**2+(b-y)**2;if(d<min){min=d;index=k;}});
          p.rect(x,y,size+.2,size+.2,colors[index]+"46");
        }
      }
      roadNetwork(p);
      if(id==="isochrone"){
        [45,30,15].forEach((minutes,j)=>{
          const r=minutes*4.25*(.89+p.t*.23),color=palette[j];
          const pts=seq(72).map(i=>{
            const a=i*TAU/72;
            return polar(399,208,r*(1+.18*Math.cos(3*a+1)+.13*Math.sin(5*a)),a);
          });
          p.poly(pts,color+"3d",color,2,minutes+" минут от центра");
        });
        p.dot(399,208,5,"#fff","Начало поездки");
      }else hubs.forEach(([x,y],k)=>{
        p.dot(x,y,9,colors[k],"Объект "+(k+1),"#122038");
        p.label(k+1,x,y,{align:"center",color:"#15253b",size:10,weight:700});
      });
    });
    if(id==="isochrone")legend(p,["45 минут","30 минут","15 минут"],palette,265);
    else p.label("Области влияния шести объектов",400,423,{align:"center",size:13});
    return;
  }
  const pr=worldProjection,rand=random(7642);
  land(p,pr,"#25374a");
  function vector(x,y){
    const a=(x-400)/142,b=(y-223)/108;
    return [1.5+Math.cos(b*2.9+a*.9)*1.6,1.17*Math.sin(a*2.12-b*.6+p.t*TAU)];
  }
  frame(p,[29,53,742,327],()=>{
    seq(675).forEach(i=>{
      let x=28+rand()*744,y=56+rand()*324;
      const scale=(p.t*23+i*.43)%22;
      [x,y]=[x+vector(x,y)[0]*scale,y+vector(x,y)[1]*scale];
      const points=[[x,y]];
      let speed=0;
      seq(9).forEach(()=>{
        const [dx,dy]=vector(x,y);
        speed=Math.hypot(dx,dy);
        x+=dx*1.4;y+=dy*1.4;points.push([x,y]);
      });
      const c=tint("#4d7aae","#a2ffe2",speed/3.2);
      p.line(points,c,1.06);
      if(i%15===0)p.dot(x,y,2.3,c,"Скорость · "+fmt(speed)+" условных ед.");
    });
  });
  scaleLegend(p,"Медленно","Быстро","#4d7aae","#a2ffe2",265,413);
});
