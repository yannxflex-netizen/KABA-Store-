import {db} from "./firebase.js";
import {collection,onSnapshot,query,orderBy} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Les produits viennent de la base Firestore : on les ajoute depuis admin.html */
var PRODUCTS=[],loaded=false,jumped=false;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var cart={},brand="Tous",q="",order="new",mark="Toutes";
var fmt=function(n){return n.toLocaleString("fr-FR")+" FCFA"};
var $=function(i){return document.getElementById(i)};

function renderChips(){renderCats();renderBrands()}
function renderBrands(){
var l=PRODUCTS.filter(function(p){return brand==="Tous"||p.cat===brand}).map(function(p){return (p.brand||"").trim()}).filter(function(b,i,a){return b&&a.indexOf(b)===i});
if(mark!=="Toutes"&&l.indexOf(mark)<0)mark="Toutes";
$("bchips").hidden=!l.length;
$("bchips").innerHTML=["Toutes"].concat(l).map(function(b){return '<button class="chip" aria-pressed="'+(b===mark)+'" data-m="'+esc(b)+'">'+(b==="Toutes"?"Toutes les marques":esc(b))+'</button>'}).join("")}
function renderCats(){
var brands=["Tous"].concat(PRODUCTS.map(function(p){return p.cat}).filter(function(b,i,a){return a.indexOf(b)===i}));
$("chips").innerHTML=brands.map(function(b){return '<button class="chip" aria-pressed="'+(b===brand)+'" data-b="'+esc(b)+'">'+esc(b)+'</button>'}).join("");
}
function renderGrid(){renderGrid0();if(!$("grid").children.length)$("grid").innerHTML='<p class="empty">'+(!loaded?'Chargement des produits…':PRODUCTS.length?'Aucun produit trouvé. Essayez un autre mot ou écrivez-nous sur WhatsApp.':'Les produits arrivent bientôt. Écrivez-nous sur WhatsApp pour connaître nos disponibilités.')+'</p>'}
function imgsOf(p){return p.imgs&&p.imgs.length?p.imgs:(p.img?[p.img]:[])}
function stageHtml(p){
var im=imgsOf(p);
if(im.length>1)return '<div class="slides">'+im.map(function(s){return '<img src="'+s+'" alt="'+esc(p.name)+'">'}).join("")+'</div><span class="cnt">1/'+im.length+'</span>';
if(im.length)return '<img src="'+im[0]+'" alt="'+esc(p.name)+'">';
return '<div class="phone" style="background:'+(p.c||"#d4d4d4")+'"></div>'}
function sorted(l){return order==='asc'?l.slice().sort(function(a,b){return a.price-b.price}):order==='desc'?l.slice().sort(function(a,b){return b.price-a.price}):l.filter(function(p){return p.feat}).concat(l.filter(function(p){return !p.feat}))}
function isNew(p){var t=p.createdAt;if(t===null)return true;return !!(t&&t.toMillis&&Date.now()-t.toMillis()<7*864e5)}
function promo(p){return p.old>p.price}
function renderGrid0(){
$("grid").innerHTML=sorted(PRODUCTS.filter(function(p){return (brand==="Tous"||p.cat===brand)&&(mark==="Toutes"||(p.brand||"").trim()===mark)&&(p.name+" "+(p.desc||"")+" "+(p.brand||"")).toLowerCase().indexOf(q)>-1})).map(function(p){
return '<article class="card'+(p.sold?' sold':'')+(p.feat?' feat':'')+'" data-pid="'+p.id+'"><div class="stage">'+(isNew(p)&&!p.sold?'<span class="tag nw">Nouveau</span>':'')+(p.sold?'<span class="tag">Vendu</span>':'')+(promo(p)&&!p.sold?'<span class="tag pr">-'+Math.round((1-p.price/p.old)*100)+'%</span>':'')+(p.state?'<span class="tag st">'+esc(p.state)+'</span>':'')+stageHtml(p)+'</div>'+
'<span class="meta">'+esc(p.cat)+(p.brand?' · '+esc(p.brand):'')+'</span><h3>'+(p.feat?'★ ':'')+esc(p.name)+'</h3><span class="meta">'+esc(p.desc)+'</span>'+
'<div class="row"><span class="price">'+(promo(p)?'<s class="was">'+fmt(p.old)+'</s>':'')+fmt(p.price)+'</span>'+(p.sold?'<button class="add" disabled>Vendu</button>':'<button class="add" data-id="'+p.id+'">Ajouter</button>')+'</div>'+(p.sold?'':'<div class="acts"><a class="ask" href="'+wa("Bonjour KABA-Store, je suis intéressé par : "+p.name+" ("+fmt(p.price)+"). Est-il disponible ?")+'" target="_blank" rel="noopener">Poser une question</a><button class="shr" type="button" data-share="'+p.id+'" aria-label="Partager ce produit">Partager</button></div>')+'</article>'}).join("");
}
function renderCart(){
Object.keys(cart).forEach(function(id){if(!PRODUCTS.some(function(x){return x.id==id&&!x.sold}))delete cart[id]});
var ids=Object.keys(cart),n=0,t=0;
$("lines").innerHTML=ids.length?ids.map(function(id){
var p=PRODUCTS.filter(function(x){return x.id==id})[0],q=cart[id];n+=q;t+=q*p.price;
return '<div class="line"><div><b>'+esc(p.name)+'</b><br><span class="meta">'+fmt(p.price)+'</span></div><div><button data-d="'+id+'" aria-label="Retirer un">−</button> '+q+' <button data-u="'+id+'" aria-label="Ajouter un">+</button></div></div>'}).join(""):'<p class="empty">Votre panier est vide. Ajoutez un téléphone depuis le catalogue.</p>';
$("count").textContent=n;$("total").textContent=fmt(t);["order","promo"].forEach(function(i){var o=$(i);o.href=n?waLink(i):"#";o.style.opacity=n?1:.4;o.style.pointerEvents=n?"auto":"none"});
}
function wa(m){return "https://wa.me/2250100292559?text="+encodeURIComponent(m)}
function waLink(k){var m="Bonjour KABA-Store, "+(k==="promo"?"je souhaite commander les articles ci-dessous et je voudrais savoir si vous pouvez me faire une réduction :":"je souhaite commander les articles ci-dessous. Le paiement se fera en magasin :")+"\n",t=0;Object.keys(cart).forEach(function(id){var p=PRODUCTS.filter(function(x){return x.id==id})[0];m+="- "+cart[id]+" x "+p.name+" ("+fmt(p.price)+")\n";t+=cart[id]*p.price});m+="Total : "+fmt(t)+(k==="promo"?"\nPouvez-vous me proposer un meilleur prix ? Merci.":"\nPouvez-vous me confirmer la disponibilité ? Merci.");return wa(m)}
function drawer(open){var d=$("drawer");d.classList.toggle("open",open);d.setAttribute("aria-hidden",!open);if(open)$("msg").textContent=""}

$("chips").addEventListener("click",function(e){var b=e.target.getAttribute("data-b");if(b){brand=b;renderChips();renderGrid()}});
$("grid").addEventListener("click",function(e){var id=e.target.getAttribute("data-id");if(id){cart[id]=(cart[id]||0)+1;renderCart();drawer(true)}});
$("grid").addEventListener("scroll",function(e){var s=e.target;
if(s.classList&&s.classList.contains("slides"))s.nextElementSibling.textContent=(Math.round(s.scrollLeft/s.clientWidth)+1)+"/"+s.children.length},true);
$("lines").addEventListener("click",function(e){
var u=e.target.getAttribute("data-u"),d=e.target.getAttribute("data-d");
if(u)cart[u]++;if(d){cart[d]--;if(!cart[d])delete cart[d]}renderCart()});
$("bchips").addEventListener("click",function(e){var m=e.target.getAttribute("data-m");if(m){mark=m;renderBrands();renderGrid()}});
$("grid").addEventListener("click",function(e){
var sid=e.target.getAttribute("data-share");if(!sid)return;
var p=PRODUCTS.filter(function(x){return x.id===sid})[0];if(!p)return;
var url=location.href.split("#")[0]+"#"+sid,text=p.name+" – "+fmt(p.price)+" chez KABA-Store";
if(navigator.share){navigator.share({title:p.name,text:text,url:url}).catch(function(){})}
else{window.open("https://wa.me/?text="+encodeURIComponent(text+"\n"+url),"_blank")}});
function goHash(){var id=location.hash.slice(1).replace(/[^\w-]/g,"");if(!id)return;
var a=document.querySelector('[data-pid="'+id+'"]');if(a){a.scrollIntoView({block:"center"});a.classList.add("hl")}}
$("sort").onchange=function(){order=this.value;renderGrid()};
$("open").onclick=function(){drawer(true)};
$("close").onclick=function(){drawer(false)};
document.addEventListener("keydown",function(e){if(e.key==="Escape"){drawer(false);closeLb()}});
function trocLink(){var a=$("mine").value.trim(),b=$("want").value.trim(),t=$("trocsend"),ok=a&&b;t.href=ok?wa("Bonjour KABA-Store, je souhaite faire un troc.\nMon téléphone : "+a+"\nTéléphone souhaité : "+b+"\nPouvez-vous me proposer une estimation ? Merci."):"#";t.style.opacity=ok?1:.4;t.style.pointerEvents=ok?"auto":"none"}
$("mine").oninput=trocLink;$("want").oninput=trocLink;
$("trocbtn").onclick=function(){var t=$("troc");t.hidden=!t.hidden;trocLink()};
document.querySelectorAll(".act").forEach(function(a){a.onclick=function(){$("msg").textContent="WhatsApp s’ouvre avec votre message. Envoyez-le pour valider."}});

$("q").oninput=function(){q=this.value.trim().toLowerCase();renderGrid();var r=$("catalogue").getBoundingClientRect();if(r.top>150)window.scrollTo({top:window.scrollY+r.top-130,behavior:"smooth"})};
/* Photo en plein écran */
function openLb(p,start){
var im=imgsOf(p);if(!im.length)return;
$("lbs").innerHTML=im.map(function(s){return '<img src="'+s+'" alt="'+esc(p.name)+'">'}).join("");
$("lb").hidden=false;document.body.style.overflow="hidden";
$("lbc").hidden=im.length<2;$("lbc").textContent=(start+1)+"/"+im.length;
$("lbs").scrollLeft=start*$("lbs").clientWidth}
function closeLb(){$("lb").hidden=true;$("lbs").innerHTML="";document.body.style.overflow=""}
$("grid").addEventListener("click",function(e){
var st=e.target.closest(".stage");if(!st||e.target.tagName!=="IMG")return;
var a=st.closest("article"),p=PRODUCTS.filter(function(x){return x.id===a.getAttribute("data-pid")})[0];if(!p)return;
var sl=st.querySelector(".slides");openLb(p,sl?Math.round(sl.scrollLeft/sl.clientWidth):0)});
$("lbs").addEventListener("scroll",function(){var s=$("lbs");$("lbc").textContent=(Math.round(s.scrollLeft/s.clientWidth)+1)+"/"+s.children.length});
$("lbx").onclick=closeLb;
$("lbs").addEventListener("click",function(e){if(e.target.tagName!=="IMG")closeLb()});

renderChips();renderGrid();renderCart();trocLink();
onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),function(snap){
PRODUCTS=snap.docs.map(function(d){var x=d.data();x.id=d.id;return x});
loaded=true;renderChips();renderGrid();renderCart();
if(!jumped&&PRODUCTS.length){jumped=true;goHash()}
},function(err){loaded=true;renderGrid()});
