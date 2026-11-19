const mapThemes = {
  people: "Население и общество",
  routes: "Транспорт и потоки",
  cities: "Города и инфраструктура",
  land: "Рельеф и экосистемы",
  climate: "Атмосфера и океан",
  history: "История и архивы"
};
const mapModes = {interactive:"Интерактивная",static:"Статичная"};
const mapDialog = document.getElementById("map-reference");
let referenceList = [];
let currentReference = null;
let referenceOpener = null;
let referenceReturnHash = "#maps";

function externalLink(link, url) {
  link.href=url;
  link.target="_blank";
  link.rel="noopener noreferrer";
  return link;
}
const chartModes = {interactive:"Интерактивный",static:"Статичный"};
const referenceHash=ref=>(ref.group?"#chart-":"#map-")+ref.id;
function referenceCard(ref) {
  const chart=Boolean(ref.group);
  const noun=chart?"графика":"карты";
  const item = make("article",chart?"reference-card chart-reference":"reference-card");
  const button = make("button","reference-preview");
  button.type="button";
  button.dataset[chart?"chartReference":"mapReference"]=ref.id;
  button.setAttribute("aria-label","Открыть превью "+noun+" "+ref.title);
  const image = make("img");
  image.src=ref.preview;
  image.alt="";
  image.loading="lazy";
  image.decoding="async";
  button.append(image,make("span","preview-label","Увеличить ↗"));
  const body=make("div","reference-body");
  const meta=make("p","reference-meta");
  meta.append(make("span","reference-format",(chart?chartModes:mapModes)[ref.mode]),make("span","",ref.method));
  const title=make("h3","",ref.title);
  const desc=make("p","reference-desc",ref.description);
  const footer=make("div","reference-footer");
  const original = externalLink(make("a","original-link","Оригинал ↗"),ref.url);
  original.setAttribute("aria-label","Открыть оригинал "+noun+" "+ref.title);
  footer.append(make("span","reference-author",ref.author),original);
  body.append(meta,title,desc,footer);
  item.append(button,body);
  return item;
}
function matchingReferences(filter,theme,matches){
  if(filter==="demo")return [];
  return mapReferences.filter(ref=>
    (filter==="all"||filter===ref.mode) &&
    (theme==="all"||theme===ref.theme) &&
    matches([ref.title,ref.author,ref.description,ref.data,ref.method,mapModes[ref.mode],mapThemes[ref.theme],ref.id].join(" "))
  );
}
function matchingCharts(filter,matches){
  return chartReferences.filter(ref=>
    (filter==="all"||filter===ref.group) &&
    matches([ref.title,ref.author,ref.description,ref.data,ref.method,chartModes[ref.mode],groups[ref.group][0],ref.id].join(" "))
  );
}
function showReference(ref){
  const chart=Boolean(ref.group);
  if(!mapDialog.open){
    referenceOpener=document.activeElement;
    const overview=chart?"#charts":"#maps";
    referenceReturnHash=location.hash===referenceHash(ref)?overview:location.hash||overview;
  }
  currentReference=ref;
  $("ref-title").textContent=ref.title;
  const format=chart?chartModes[ref.mode]+" график":mapModes[ref.mode]+" карта";
  const category=chart?groups[ref.group][0]:mapThemes[ref.theme];
  $("ref-group").textContent=format+" · "+category+" · "+ref.method;
  const image=$("ref-image");
  image.src=ref.preview;
  image.alt=ref.title+" — превью оригинала";
  $("ref-description").textContent=ref.description;
  $("ref-dataset").textContent=ref.data;
  $("ref-author").textContent=ref.author;
  externalLink($("ref-original"),ref.url);
  externalLink($("ref-credit"),ref.previewSource);
  $("ref-credit").textContent=ref.capture?"Страница, с которой снято превью ↗":"Источник превью ↗";
  const index=referenceList.indexOf(ref);
  $("ref-prev").disabled=index<=0;
  $("ref-next").disabled=index<0||index>=referenceList.length-1;
  if(!mapDialog.open)mapDialog.showModal();
  $("ref-close").focus({preventScroll:true});
  history.replaceState(null,"",referenceHash(ref));
}
mapDialog.addEventListener("click",event=>{if(event.target===mapDialog)mapDialog.close();});
document.getElementById("ref-close").addEventListener("click",()=>mapDialog.close());
document.getElementById("ref-prev").addEventListener("click",()=>{
  const previous=referenceList[referenceList.indexOf(currentReference)-1];
  if(previous)showReference(previous);
});
document.getElementById("ref-next").addEventListener("click",()=>{
  const next=referenceList[referenceList.indexOf(currentReference)+1];
  if(next)showReference(next);
});
mapDialog.addEventListener("close",()=>{
  const wasReference=location.hash===referenceHash(currentReference);
  currentReference=null;
  if(wasReference)history.replaceState(null,"",referenceReturnHash);
  else readHash(false);
  if(referenceOpener?.isConnected)referenceOpener.focus({preventScroll:true});
});
