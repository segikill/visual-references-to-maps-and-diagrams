const censusAreas = comparisonCensus.states.map(area => {
  const path = new Path2D();
  area.rings.forEach(ring => {
    ring.forEach(([x,y],index) => index ? path.lineTo(x,y) : path.moveTo(x,y));
    path.closePath();
  });
  return {...area, path, density:area.population/area.area};
});
const densityBreaks = [0,5,15,35,75,150,300];
const densityColors = ["#243961","#2d527b","#366e91","#438e9f","#58aba7","#81cbbb","#baeed0"];
const censusInteger = new Intl.NumberFormat("ru-RU");
const censusDecimal = new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1});
const accentCensus = "#ffd68c";
let censusReady = false;

function initCensusComparison(){
  if(censusReady) return;
  censusReady = true;
  const root=document.getElementById("census-comparison");
  const select=root.querySelector("#census-state");
  const plots=[...root.querySelectorAll("canvas[data-census-map]")];
  const codes=new Map(censusAreas.map(area=>[area.code,area]));
  let chosen="CA", hover=null;
  const byName=[...censusAreas].sort((a,b)=>a.name.localeCompare(b.name,"ru"));
  select.append(...byName.map(area=>new Option(area.name,area.code)));
  select.value=chosen;
  const legend=root.querySelector("#density-legend");
  densityBreaks.forEach((from,i)=>{
    const item=document.createElement("span");
    item.style.setProperty("--swatch",densityColors[i]);
    item.textContent=i===densityBreaks.length-1?"≥ "+from:from+"–<"+densityBreaks[i+1];
    legend.append(item);
  });

  function draw(canvas,active){
    const ctx=canvas.getContext("2d");
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    const background=ctx.createLinearGradient(0,0,W,H);
    background.addColorStop(0,"#14243c");
    background.addColorStop(1,"#0d182a");
    ctx.fillStyle=background;
    ctx.fillRect(0,0,W,H);
    const view=canvas.dataset.censusMap;
    ctx.lineJoin="round";
    ctx.lineWidth=1;
    if(view==="circles"){
      censusAreas.forEach(area=>{
        ctx.strokeStyle="#243854";
        ctx.stroke(area.path);
      });
      censusAreas.forEach(area=>{
        const [x,y,r]=area.circle;
        const selected=active===area;
        ctx.beginPath();
        ctx.arc(x,y,r,0,TAU);
        ctx.fillStyle=selected?accentCensus:"#8ca9f0";
        ctx.fill();
        ctx.strokeStyle=selected?"#fff0cc":"#14223f";
        ctx.lineWidth=selected?2.2:1;
        ctx.stroke();
        if(r>=11){
          ctx.font="650 13px 'Segoe UI', sans-serif";
          ctx.textAlign="center";
          ctx.textBaseline="middle";
          ctx.fillStyle="#10203b";
          ctx.fillText(area.code,x,y);
        }
      });
      return;
    }
    censusAreas.forEach(area=>{
      const level=densityBreaks.findLastIndex(limit=>area.density>=limit);
      ctx.fillStyle=view==="density"?densityColors[level]:(active===area?"#3c3c43":"#243954");
      ctx.fill(area.path,"evenodd");
      ctx.strokeStyle=view==="density"?"#142440":"#5f7897";
      ctx.stroke(area.path);
    });
    if(view==="dots"){
      for(const area of censusAreas){
        ctx.fillStyle=active===area?accentCensus:"#91e4d3c4";
        ctx.beginPath();
        for(const [x,y] of area.dots){
          ctx.moveTo(x+1.5,y);
          ctx.arc(x,y,1.5,0,TAU);
        }
        ctx.fill();
      }
    }
    ctx.strokeStyle=accentCensus;
    ctx.lineWidth=3.1;
    ctx.stroke(active.path);
    if(active.code==="DC"){
      ctx.beginPath();
      ctx.arc(...active.anchor,4.7,0,TAU);
      ctx.fillStyle=accentCensus;
      ctx.fill();
    }
  }
  function update(){
    const active=codes.get(hover||chosen);
    root.querySelector("#census-active").textContent=active.name;
    root.querySelector("#census-people").textContent=censusInteger.format(active.population);
    root.querySelector("#census-sqkm").textContent=censusDecimal.format(active.area);
    root.querySelector("#census-density").textContent=censusDecimal.format(active.density);
    root.querySelectorAll("[data-census-pick]").forEach(item=>
      item.setAttribute("aria-pressed",String(item.dataset.censusPick===chosen))
    );
    plots.forEach(canvas=>draw(canvas,active));
  }
  function selectArea(code){
    if(!codes.has(code))return;
    chosen=code;
    hover=null;
    select.value=code;
    update();
  }
  function hit(canvas,event){
    const box=canvas.getBoundingClientRect();
    const x=(event.clientX-box.left)/box.width*W;
    const y=(event.clientY-box.top)/box.height*H;
    if(canvas.dataset.censusMap==="circles"){
      return censusAreas.find(area=>{
        const [cx,cy,r]=area.circle;
        return Math.hypot(x-cx,y-cy)<=r;
      });
    }
    const district=codes.get("DC");
    if(Math.hypot(x-district.anchor[0],y-district.anchor[1])<3)return district;
    const ctx=canvas.getContext("2d");
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    const result=censusAreas.find(area=>ctx.isPointInPath(area.path,x,y,"evenodd"));
    ctx.restore();
    return result;
  }
  select.addEventListener("change",()=>selectArea(select.value));
  root.querySelectorAll("[data-census-pick]").forEach(button=>button.addEventListener("click",()=>selectArea(button.dataset.censusPick)));
  plots.forEach(canvas=>{
    canvas.addEventListener("pointermove",event=>{
      if(event.pointerType==="touch")return;
      const next=hit(canvas,event)?.code??null;
      if(next===hover)return;
      hover=next;
      update();
    });
    canvas.addEventListener("pointerleave",()=>{
      if(!hover)return;
      hover=null;
      update();
    });
    canvas.addEventListener("click",event=>selectArea(hit(canvas,event)?.code));
  });
  update();
}
