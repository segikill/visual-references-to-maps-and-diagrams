const climateBounds={left:69,right:764,top:42,bottom:385};
const climateYears=gistemp.map(row=>row[0]);
const temperatureLabel=new Intl.NumberFormat("ru-RU",{signDisplay:"exceptZero",minimumFractionDigits:2,maximumFractionDigits:2});
const climateAccent="#ffdf9d";
const coldClimate="#5279cb", nearClimate="#e5e6dd", warmClimate="#cf4f60";
const climateX=(index)=>mix(climateBounds.left,climateBounds.right,index/(gistemp.length-1));
let chartComparisonReady=false;

function climateColor(value){
  return tint(nearClimate,value<0?coldClimate:warmClimate,clamp(Math.abs(value)/1.5));
}
function climateTimeAxis(p,x=climateX){
  [1880,1900,1920,1940,1960,1980,2000,2025].forEach(year=>{
    p.label(year,x(year-climateYears[0]),410,{size:13,align:"center"});
  });
}
function climateY(value){
  const {top,bottom}=climateBounds;
  return mix(bottom,top,(value+1)/2.75);
}
function climateValueAxis(p){
  const {left,right}=climateBounds;
  [-1,-.5,0,.5,1,1.5].forEach(value=>{
    const y=climateY(value);
    p.line([[left,y],[right,y]],value===0?"#7b8aa4":grid,value===0?1.6:1);
    p.label(value?temperatureLabel.format(value).replace(/0$/,""):"0",left-10,y,{size:13,align:"right"});
  });
  p.label("°C",left,23,{size:13,color:ink});
}
assign("climate-annual climate-calendar climate-months",(p,id)=>{
  const index=p.state.index;
  const [year,annual,months]=gistemp[index];
  const {left,right,top,bottom}=climateBounds;
  if(id==="climate-calendar"){
    const dx=(right-left)/gistemp.length,dy=(bottom-top)/12;
    gistemp.forEach((row,i)=>row[2].forEach((value,j)=>{
      p.rect(left+i*dx,top+j*dy,dx+.16,dy-.65,climateColor(value));
    }));
    month.forEach((label,j)=>p.label(label,left-9,top+(j+.5)*dy,{size:12,align:"right"}));
    const x=left+index*dx;
    p.poly([[x,top-3],[x+dx,top-3],[x+dx,bottom+2],[x,bottom+2]],null,climateAccent,2);
    p.poly([[x+dx/2-4,top-15],[x+dx/2+4,top-15],[x+dx/2,top-6]],climateAccent);
    climateTimeAxis(p,i=>left+(i+.5)*dx);
    return;
  }
  climateValueAxis(p);
  if(id==="climate-annual"){
    climateTimeAxis(p);
    const x=climateX(index), y=climateY(annual);
    p.line([[x,top],[x,bottom]],"#dcbd8a93",1.35);
    p.line(gistemp.map((row,i)=>[climateX(i),climateY(row[1])]),"#a4bdff",2.7);
    p.dot(x,y,6.2,climateAccent,null,"#16243d");
    return;
  }
  const step=(right-left)/12, zero=climateY(0);
  months.forEach((value,j)=>{
    const x=left+(j+.5)*step, y=climateY(value);
    p.rect(x-step*.32,Math.min(y,zero),step*.64,Math.abs(zero-y),value<0?"#789bf4":"#ffab94");
    p.label(month[j],x,410,{size:13,align:"center"});
  });
});
function initChartComparison(){
  if(chartComparisonReady)return;
  chartComparisonReady=true;
  const root=document.getElementById("climate-comparison");
  const slider=root.querySelector("#climate-year");
  const plots=[...root.querySelectorAll("[data-climate-chart]")];
  const monthly=root.querySelector("#climate-monthly-values");
  month.forEach(label=>{
    const item=document.createElement("div"), name=document.createElement("dt"), value=document.createElement("dd");
    name.textContent=label;
    item.append(name,value);
    monthly.append(item);
  });
  slider.min=climateYears[0];
  slider.max=climateYears.at(-1);
  slider.value=2024;
  function choose(year){
    const index=year-climateYears[0];
    const [,annual,months]=gistemp[index];
    slider.value=year;
    root.querySelector("#climate-selected").textContent=year;
    root.querySelector("#climate-annual-value").textContent=temperatureLabel.format(annual)+" °C";
    [...monthly.querySelectorAll("dd")].forEach((item,i)=>{item.textContent=temperatureLabel.format(months[i])+" °C";});
    root.querySelectorAll("[data-climate-pick]").forEach(button=>
      button.setAttribute("aria-pressed",String(Number(button.dataset.climatePick)===year))
    );
    plots.forEach(canvas=>paint(canvas,{id:canvas.dataset.climateChart},{index},true));
  }
  slider.addEventListener("input",()=>choose(Number(slider.value)));
  root.querySelectorAll("[data-climate-pick]").forEach(button=>
    button.addEventListener("click",()=>choose(Number(button.dataset.climatePick)))
  );
  plots.filter(canvas=>canvas.dataset.climateChart!=="climate-months").forEach(canvas=>canvas.addEventListener("click",event=>{
    const box=canvas.getBoundingClientRect();
    const x=(event.clientX-box.left)/box.width*W;
    const y=(event.clientY-box.top)/box.height*H;
    const {left,right,top,bottom}=climateBounds;
    if(x<left||x>right||y<top||y>bottom)return;
    const t=(x-left)/(right-left);
    const index=canvas.dataset.climateChart==="climate-calendar"
      ? Math.min(gistemp.length-1,Math.floor(t*gistemp.length))
      : Math.round(t*(gistemp.length-1));
    choose(climateYears[index]);
  }));
  choose(Number(slider.value));
}
