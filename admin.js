import {db,auth} from "./firebase.js";
import {signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {collection,addDoc,updateDoc,deleteDoc,doc,onSnapshot,query,orderBy,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

var $=function(i){return document.getElementById(i)};
var items=[],editId=null,photos=[],unsub=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(n){return Number(n).toLocaleString("fr-FR")+" FCFA"}
function msg(t,ok){var m=$("fmsg");m.textContent=t;m.className=ok?"":"err"}

/* Connexion */
onAuthStateChanged(auth,function(u){
$("login").hidden=!!u;$("panel").hidden=!u;
if(u){$("who").textContent=u.email;listen()}else if(unsub){unsub();unsub=null}
});
$("lform").onsubmit=async function(e){
e.preventDefault();$("lmsg").textContent="";
try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("pass").value)}
catch(err){$("lmsg").textContent="E-mail ou mot de passe incorrect."}
};
$("logout").onclick=function(){signOut(auth)};

/* Photos */
function resize(f){return new Promise(function(ok){
var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
var k=Math.min(1,700/Math.max(im.width,im.height)),c=document.createElement("canvas");
c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",0.7))};
im.src=r.result};r.readAsDataURL(f)})}
function showPrev(){$("prev").innerHTML=photos.map(function(s,i){
return '<div class="th"><img src="'+s+'" alt=""><button type="button" data-r="'+i+'" aria-label="Retirer">×</button></div>'}).join("")}
$("photo").onchange=async function(){
var files=Array.prototype.slice.call(this.files);
for(var i=0;i<files.length;i++){
if(photos.length>=5){msg("5 photos maximum.");break}
photos.push(await resize(files[i]))}
this.value="";showPrev()};
$("prev").addEventListener("click",function(e){var r=e.target.getAttribute("data-r");if(r!==null){photos.splice(Number(r),1);showPrev()}});

/* Publier ou modifier */
function reset(){editId=null;photos=[];$("pform").reset();showPrev();
$("ftitle").textContent="Publier un produit";$("save").textContent="Publier";$("cancel").hidden=true}
$("cancel").onclick=function(){reset();msg("")};
$("pform").onsubmit=async function(e){
e.preventDefault();
var d={name:$("name").value.trim(),cat:$("cat").value,price:Number($("price").value),desc:$("desc").value.trim(),sold:$("sold").checked,old:Number($("old").value)||0,brand:$("brand").value.trim(),state:$("state").value,feat:$("feat").checked};
if(!d.name||!(d.price>=0)){msg("Le nom et le prix sont obligatoires.");return}
if(JSON.stringify(photos).length>900000){msg("Photos trop lourdes. Retirez-en une.");return}
if(d.old<=d.price)d.old=0;
d.imgs=photos;d.img=photos[0]||"";
$("save").disabled=true;
try{
if(editId){await updateDoc(doc(db,"products",editId),d);reset();msg("Produit modifié.",true)}
else{d.createdAt=serverTimestamp();await addDoc(collection(db,"products"),d);reset();msg("Produit publié. Il est visible sur le site.",true)}
}catch(err){msg("Échec de l’enregistrement ("+(err.code||"erreur")+"). Vérifiez les règles Firestore.")}
$("save").disabled=false;
};

/* Liste des produits */
function listen(){
if(unsub)return;
unsub=onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),function(snap){
items=snap.docs.map(function(d){var x=d.data();x.id=d.id;return x});
$("n").textContent=items.length;
$("plist").innerHTML=items.length?items.map(function(p){
return '<div class="prow">'+(p.img?'<img src="'+p.img+'" alt="">':'<div class="noimg"></div>')+
'<div class="grow"><b>'+esc(p.name)+'</b>'+(p.sold?' <span class="err">· VENDU</span>':'')+(p.feat?' ★':'')+'<br><span class="meta">'+esc(p.cat)+(p.brand?' · '+esc(p.brand):'')+' · '+fmt(p.price)+'</span></div>'+
'<button class="sm" data-s="'+p.id+'">'+(p.sold?'Remettre en vente':'Marquer vendu')+'</button> <button class="sm" data-e="'+p.id+'">Modifier</button> <button class="sm" data-x="'+p.id+'">Supprimer</button></div>'}).join(""):'<p class="empty">Aucun produit pour l’instant.</p>';
},function(err){$("plist").innerHTML='<p class="err">Lecture impossible. Code d’erreur : '+esc(err.code||err.message)+'</p>'});
}
$("plist").addEventListener("click",async function(e){
var ed=e.target.getAttribute("data-e"),x=e.target.getAttribute("data-x"),s=e.target.getAttribute("data-s");
if(s){
var q=items.filter(function(i){return i.id===s})[0];
if(q){try{await updateDoc(doc(db,"products",s),{sold:!q.sold})}catch(err){msg("Échec ("+(err.code||"erreur")+").")}}
}
if(ed){
var p=items.filter(function(i){return i.id===ed})[0];if(!p)return;
editId=ed;photos=p.imgs||(p.img?[p.img]:[]);showPrev();$("sold").checked=!!p.sold;$("old").value=p.old||"";$("brand").value=p.brand||"";$("state").value=p.state||"";$("feat").checked=!!p.feat;
$("name").value=p.name;$("cat").value=p.cat;$("price").value=p.price;$("desc").value=p.desc||"";
$("ftitle").textContent="Modifier le produit";$("save").textContent="Enregistrer";$("cancel").hidden=false;msg("");
window.scrollTo({top:0,behavior:"smooth"});
}
if(x&&confirm("Supprimer ce produit ?")){
try{await deleteDoc(doc(db,"products",x))}catch(err){msg("Suppression impossible ("+(err.code||"erreur")+").")}
}
});
