const $ = id => document.getElementById(id);
const sectionText = {
  charts:["Галерея графиков","Сравнивайте опубликованные работы и пробуйте типы диаграмм в локальных демо."],
  "chart-comparison":["Одни данные, три графика","Глобальные температурные отклонения по данным NASA GISTEMP v4"],
  maps:["Галерея карт","Карты на реальных данных с превью и ссылками на оригиналы. Приёмы картографии можно попробовать в локальных демо."],
  "map-comparison":["Одни данные, три карты","Население США по результатам переписи 2020 года"],
  originals:["Оригиналы и галереи","Внешние работы откроются на сайтах авторов. Для них нужен интернет."],
  guide:["Как выбрать визуализацию","От вопроса к подходящей форме, шкале и способу взаимодействия."]
};
const guideRows = [
  ["Сравнить значения","Ранжированные столбцы, гантель, водопад","При сравнении длины задайте общую базу. Для оценки изменения оставьте видимыми оба среза."],
  ["Показать динамику","Линейный график, ступени, график наклонов","Покажите длительность интервалов. Для сравнения начальной и конечной точки используйте график наклонов."],
  ["Увидеть распределение","Гистограмма, ящик с усами, скрипка, ECDF","Ящик даёт сводку, скрипка и гистограмма раскрывают форму, ECDF помогает читать процентили."],
  ["Найти связь","Рассеяние, гексагональное биннирование, параллельные координаты","При наложении большого числа наблюдений агрегируйте точки. Для нескольких переменных используйте малые кратные."],
  ["Объяснить состав","Нормированные полосы, treemap, sunburst","Для точного сравнения долей полезна общая база. Для вложенных групп подойдёт иерархия."],
  ["Проследить поток","Санки, хорды, траектории","Укажите направление и единицы. Проверьте баланс объёма при переходе между стадиями."],
  ["Показать географию","Хороплет, пропорциональные круги, карта плотности","Хороплет подходит для нормированных значений, круги — для абсолютных, плотность — для скоплений событий."],
  ["Сохранить читаемость","Подписи, шкалы, фильтры, синхронные панели","Подпишите единицы. Дайте пользователю возможность остановить анимацию и рассмотреть один срез."]
];
const cards = $("cards"), dialog = $("detail"), canvas = $("plot"), tip = $("tooltip"), phase = $("phase");
const fixedViews = new Set(["dots","globe","isolines","schematic","voronoi"]);
const autoplayViews = new Set(["line","stream","race","spiral","flows","tracks","wind"]);
let section="charts", filter="all", theme="all", chartFormat="all", visible=[], active=null, dialogList=[];
let state={phase:35}, hits=[], timer=0, drag=null, lastURL="#charts", opener=null;
const art = new WeakMap();
const observer = new IntersectionObserver(items=>{
  items.forEach(({target,isIntersecting})=>{
    if(!isIntersecting) return;
    paint(target,art.get(target),{},true);
    observer.unobserve(target);
  });
},{rootMargin:"220px"});
const qnorm = value => value.toLocaleLowerCase("ru-RU").replaceAll("ё","е").trim();
const make = (tag,className,content) => {
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(content!==undefined)el.textContent=content;
  return el;
};
function setFilterOptions(){
  const choices=section==="charts"?[
    ["all","Все типы"],...Object.entries(groups).filter(([k])=>k!=="maps").map(([k,g])=>[k,g[0]])
  ]:section==="maps"?[
    ["all","Все карты"],["interactive","Интерактивные"],["static","Статичные"],["demo","Демо"]
  ]:section==="originals"?[["all","Все оригиналы"],["chart","Графики"],["map","Карты"]]:[];
  $("filters").replaceChildren(...choices.map(([id,name])=>{
    const b=make("button","",name);
    b.type="button";
    b.dataset.filter=id;
    b.setAttribute("aria-pressed",String(id===filter));
    return b;
  }));
  $("filters").hidden=!choices.length;
}
function originalCard([type,title,summary,href,tag]){
  const link=make("a","original");
  link.href=href;
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.style.setProperty("--accent",type==="map"?"#488878":"#798bc4");
  link.append(make("span","",tag),make("h3","",title+" ↗"),make("p","",summary));
  return link;
}
function demoCard(entry){
  const btn=make("button","card");
  btn.type="button";
  btn.dataset.open=entry.id;
  const preview=make("canvas");
  preview.width=640;preview.height=360;
  preview.setAttribute("aria-hidden","true");
  art.set(preview,entry);
  observer.observe(preview);
  const meta=make("span","card-main");
  const title=make("span");
  title.append(make("span","card-type",entry.en),make("span","card-title",entry.title));
  const arrow=make("span","card-arrow","↗");
  arrow.setAttribute("aria-hidden","true");
  meta.append(title,arrow);
  btn.append(preview,meta);
  return btn;
}
function render(){
  const mapComparison=section==="map-comparison";
  const chartComparison=section==="chart-comparison";
  const comparing=mapComparison||chartComparison;
  $("comparison-feature").hidden=section!=="maps";
  $("chart-comparison-feature").hidden=section!=="charts";
  $("census-comparison").hidden=!mapComparison;
  $("climate-comparison").hidden=!chartComparison;
  $("section-title").textContent=sectionText[section][0];
  $("section-note").textContent=sectionText[section][1];
  document.querySelectorAll(".mast [data-section]").forEach(a=>{
    if(a.dataset.section===section||(mapComparison&&a.dataset.section==="maps")||(chartComparison&&a.dataset.section==="charts"))a.setAttribute("aria-current","page");
    else a.removeAttribute("aria-current");
  });
  $("search-label").hidden=section==="guide"||comparing;
  $("guide").hidden=section!=="guide";
  $("count").hidden=section==="guide"||comparing;
  $("map-theme-wrap").hidden=section!=="maps"||filter==="demo";
  $("chart-format-wrap").hidden=section!=="charts";
  observer.disconnect();
  cards.replaceChildren();
  if(mapComparison){initCensusComparison();return;}
  if(chartComparison){initChartComparison();return;}
  if(section==="guide")return;
  const query=qnorm($("search").value);
  const matches=text=>query.split(/\s+/).every(term=>qnorm(text).includes(term));
  if(section==="originals"){
    const list=showcases.filter(row=>(filter==="all"||filter===row[0])&&matches(row.slice(1).join(" ")));
    $("count").textContent="Проектов и галерей · "+list.length;
    cards.append(...list.map(originalCard));
  }else{
    const isMaps=section==="maps";
    const includeReferences=isMaps?filter!=="demo":chartFormat!=="demo";
    referenceList=includeReferences?(isMaps?matchingReferences(filter,theme,matches):matchingCharts(filter,matches)):[];
    const includeDemos=isMaps?(filter==="demo"||(filter==="all"&&theme==="all")):chartFormat!=="published";
    visible=entries.filter(e=>includeDemos&&(isMaps?e.group==="maps":e.group!=="maps"&&(filter==="all"||filter===e.group))&&matches([e.title,e.en,e.summary,groups[e.group][0]].join(" ")));
    if (!query && filter === "all") {
      const selected = section === "charts"
        ? ["stream","sankey","sunburst","ridge","chord","parallel","spiral","radial","race"]
        : ["globe","wind","columns","choropleth","flows","bivariate","night","isochrone","hillshade"];
      const byId = new Map(visible.map(entry => [entry.id, entry]));
      visible = [...selected.filter(id => byId.has(id)).map(id => byId.get(id)), ...visible.filter(entry => !selected.includes(entry.id))];
    }
    const countParts=[];
    if(includeReferences){
      countParts.push((isMaps?"На реальных данных · ":"Опубликованные · ")+referenceList.length);
      cards.append(...referenceList.map(referenceCard));
    }
    if(includeDemos){
      countParts.push("Демо · "+visible.length);
      if(referenceList.length&&visible.length)cards.append(make("h3","demo-divider","Локальные демонстрации"));
      cards.append(...visible.map(demoCard));
    }
    $("count").textContent=countParts.join("  /  ");
  }
  if(!cards.childElementCount)cards.append(make("p","","Совпадений нет. Попробуйте другой запрос."));
}
function selectSection(next,scroll=true){
  if(section!==next){
    section=next;
    filter="all";
    theme="all";
    $("map-theme").value="all";
    chartFormat="all";
    $("chart-format").value="all";
    $("search").value="";
  }
  setFilterOptions();
  render();
  lastURL="#"+next;
  if(scroll)$("collection").scrollIntoView({block:"start"});
}
function buildGuide(){
  const guide=$("guide"), grid=make("div","guide-grid");
  guideRows.forEach(([title,methods,note])=>{
    const article=make("article");
    article.append(make("strong","",title),make("p","",methods),make("p","",note));
    grid.append(article);
  });
  const source=make("a","","Краткое исследование и источники ↗");
  source.href="Исследование.md";
  guide.append(grid,make("h3","","От задачи к визуальной форме"),make("p","","Начните с вопроса, который должен решить читатель. Затем выберите способ кодирования: положение и длина для точных сравнений, цвет для паттернов, площадь для состава, линии и стрелки для связей. Сложные формы полезны, когда они выявляют структуру, которую трудно увидеть на более простом графике."),source);
}
function redraw(){
  if(active)hits=paint(canvas,active,state);
}
function stop(){
  if(timer)window.clearInterval(timer);
  timer=0;
  $("play").textContent="▷ Запустить";
  $("play").setAttribute("aria-pressed","false");
}
function closeTooltip(){
  tip.hidden=true;
}
function openDemo(entry){
  if(!dialog.open){
    opener=document.activeElement;
    dialogList=visible.some(e=>e.id===entry.id)&&section!=="originals"&&section!=="guide" ? visible : entries.filter(e=>(e.group==="maps")===(entry.group==="maps"));
  }
  stop();
  closeTooltip();
  active=entry;
  state={phase:35,lon:12,lat:23};
  phase.value=state.phase;
  const globe=entry.id==="globe";
  $("detail-group").textContent=groups[entry.group][0]+" · "+entry.en;
  $("detail-title").textContent=entry.title;
  $("detail-summary").textContent=entry.summary;
  $("detail-tip").textContent=entry.tip;
  $("detail-hint").textContent=globe?"Вращайте глобус перетаскиванием или кнопками.":"Наведите курсор или коснитесь элемента для подсказки.";
  $("scenarios").hidden=fixedViews.has(entry.id);
  $("rotation").hidden=!globe;
  $("play").hidden=!autoplayViews.has(entry.id);
  $("phase-label").textContent=["tracks","flows","race","wind"].includes(entry.id)?"Положение":"Сценарий";
  canvas.classList.toggle("draggable",globe);
  canvas.setAttribute("aria-label",entry.title+". "+entry.summary);
  const index=dialogList.indexOf(entry);
  $("prev").disabled=index<=0;
  $("next").disabled=index<0||index>=dialogList.length-1;
  if(!dialog.open) dialog.showModal();
  $("close").focus({preventScroll:true});
  redraw();
  history.replaceState(null,"","#demo-"+entry.id);
}
function readHash(scroll=true){
  const fragment=location.hash.slice(1);
  const referenceGroup=fragment.startsWith("chart-")?chartReferences:fragment.startsWith("map-")?mapReferences:null;
  const reference=referenceGroup?.find(item=>referenceHash(item)==="#"+fragment);
  if(reference){
    selectSection(reference.group?"charts":"maps",false);
    showReference(reference);
    return;
  }
  if(mapDialog.open){mapDialog.close();return;}
  if(fragment.startsWith("demo-")){
    const entry=entries.find(e=>e.id===fragment.slice(5));
    if(entry){
      const target=entry.group==="maps"?"maps":"charts";
      selectSection(target,false);
      openDemo(entry);
      return;
    }
  }
  if(dialog.open){dialog.close();return;}
  selectSection(Object.hasOwn(sectionText,fragment)?fragment:"charts",scroll&&fragment!=="top");
}
$("chart-format").addEventListener("change",event=>{
  chartFormat=event.target.value;
  render();
});
const themeSelect=$("map-theme");
themeSelect.append(...[["all","Все темы"],...Object.entries(mapThemes)].map(([key,label])=>new Option(label,key)));
themeSelect.addEventListener("change",event=>{
  theme=event.target.value;
  render();
});
document.addEventListener("click",event=>{
  const nav=event.target.closest("[data-section]");
  if(nav&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey){
    event.preventDefault();
    if(location.hash!==nav.hash)history.pushState(null,"",nav.hash);
    selectSection(nav.dataset.section);
    return;
  }
  const refButton=event.target.closest("[data-map-reference]");
  if(refButton)showReference(mapReferences.find(ref=>ref.id===refButton.dataset.mapReference));
  const chartButton=event.target.closest("[data-chart-reference]");
  if(chartButton)showReference(chartReferences.find(ref=>ref.id===chartButton.dataset.chartReference));
  const b=event.target.closest("[data-open]");
  if(b){
    const entry=entries.find(e=>e.id===b.dataset.open);
    if(entry)openDemo(entry);
  }
  const toggle=event.target.closest("[data-filter]");
  if(toggle) {
    filter=toggle.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(el=>el.setAttribute("aria-pressed",String(el===toggle)));
    render();
  }
  const turn=event.target.closest("[data-turn]");
  if(turn){
    const [dx,dy]=turn.dataset.turn.split(",").map(Number);
    rotate(dx,dy);
  }
});
$("search").addEventListener("input",render);
window.addEventListener("popstate",()=>readHash(false));
window.addEventListener("hashchange",()=>readHash(false));
$("close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener("close",()=>{
  const returnTo=lastURL;
  stop();
  active=null;
  drag=null;
  closeTooltip();
  if(location.hash.startsWith("#demo-"))history.replaceState(null,"",returnTo);
  else readHash(false);
  if(opener?.isConnected)opener.focus({preventScroll:true});
});
function stepDemo(amount){
  const next=dialogList[dialogList.indexOf(active)+amount];
  if(next)openDemo(next);
}
$("prev").addEventListener("click",()=>stepDemo(-1));
$("next").addEventListener("click",()=>stepDemo(1));
phase.addEventListener("input",()=>{
  stop();
  state.phase=Number(phase.value);
  closeTooltip();
  redraw();
});
$("play").addEventListener("click",()=>{
  if(timer){stop();return;}
  $("play").textContent="Ⅱ Пауза";
  $("play").setAttribute("aria-pressed","true");
  closeTooltip();
  timer=window.setInterval(()=>{
    state.phase=(state.phase+1)%101;
    phase.value=state.phase;
    redraw();
  },75);
});
$("reset").addEventListener("click",()=>{
  state.lon=12;
  state.lat=23;
  closeTooltip();
  redraw();
});
function rotate(dx,dy){
  state.lon=((state.lon+dx+540)%360)-180;
  state.lat=clamp(state.lat+dy,-84,84);
  closeTooltip();
  redraw();
}
function showTooltip(event){
  const rect=canvas.getBoundingClientRect();
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  if(x<0||y<0||x>rect.width||y>rect.height){closeTooltip();return;}
  const px=x/rect.width*W,py=y/rect.height*H,ctx=canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  const hit=hits.findLast(h=>{
    if(h.fill&&ctx.isPointInPath(h.path,px,py,"evenodd"))return true;
    if(!h.stroke)return false;
    ctx.lineWidth=Math.max(8,h.size);
    return ctx.isPointInStroke(h.path,px,py);
  });
  ctx.restore();
  if(!hit){closeTooltip();return;}
  tip.textContent=hit.info;
  tip.hidden=false;
  tip.style.left=Math.max(5,Math.min(x+10,rect.width-tip.offsetWidth-5))+"px";
  tip.style.top=(y<55?y+12:y-tip.offsetHeight-9)+"px";
}
canvas.addEventListener("pointerdown",event=>{
  if(active?.id==="globe"){
    drag=[event.clientX,event.clientY];
    canvas.setPointerCapture(event.pointerId);
  }
  showTooltip(event);
});
canvas.addEventListener("pointermove",event=>{
  if(drag){
    const dx=event.clientX-drag[0],dy=event.clientY-drag[1];
    if(dx||dy)rotate(-dx*.33,dy*.33);
    drag=[event.clientX,event.clientY];
  }else if(!timer)showTooltip(event);
});
canvas.addEventListener("lostpointercapture",()=>{drag=null;});
canvas.addEventListener("pointerleave",closeTooltip);
$("download").addEventListener("click",()=>{
  const name=active.id;
  canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),anchor=make("a");
    anchor.href=url;
    anchor.download=name+".png";
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
});
buildGuide();
paint($("hero-map"),entries.find(e=>e.id==="flows"),{},true);
readHash(Boolean(location.hash));
