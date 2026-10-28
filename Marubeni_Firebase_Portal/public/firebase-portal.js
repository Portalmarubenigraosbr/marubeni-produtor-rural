import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore, doc, collection, addDoc, updateDoc, onSnapshot, serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let user=null, fiscal=false, draftTimer=null, statusUnsub=null, pendingSave=null;
window.rtcAuthenticated=false;
const isFiscal=u=>!!u&&!u.isAnonymous&&!!u.email&&u.emailVerified;
const el=id=>document.getElementById(id);
function err(e){console.error(e); alert('Falha na comunicação com Firebase: '+(e?.message||e));}
function showPanel(){
 if(!fiscal){window.rtcOpen();return;}
 el('rtc-access').style.display='block';
 el('rtc-login').style.display='none';
 el('rtc-panel-wrap').style.display='block';
 // Carregar o iframe APOS o login para que reconheca a sessao Fiscal.
 const frame=el('rtc-panel');
 if(frame)frame.src='./painel-fiscal.html?auth='+Date.now();
}
window.rtcOpen=()=>{el('rtc-access').style.display='block';if(fiscal)showPanel();else{el('rtc-login').style.display='block';el('rtc-panel-wrap').style.display='none';}};
window.rtcClose=()=>{el('rtc-access').style.display='none';};
window.rtcShowPanel=showPanel;
window.rtcSavedRecords=()=>{if(fiscal)showPanel();else window.rtcOpen();};
window.rtcLogin=async()=>{
 const email=el('rtc-email').value.trim().toLowerCase(),pass=el('rtc-pass').value;
 el('rtc-error').textContent='';
 try{// O iframe precisa compartilhar a sessao com a pagina principal.
 await setPersistence(auth,browserLocalPersistence);
 const result=await signInWithEmailAndPassword(auth,email,pass);
 if(!result.user.emailVerified){await signOut(auth);throw Error('Verifique o e-mail no Firebase Authentication antes de acessar.');}
 el('rtc-pass').value='';showPanel();}catch(e){el('rtc-error').textContent=e.message;}
};
window.rtcLogout=async()=>{try{await signOut(auth);await signInAnonymously(auth);window.rtcClose();}catch(e){err(e);}};
// IDs do Firestore por rascunho e por usuario: nao reutilizar ID de outra sessao.
const cloudKey=(id)=>'marubeni-cloud-id:'+user.uid+':'+id;
let saveQueue=Promise.resolve();
async function saveRecord(record,final){
 if(!user||fiscal||!record?.id)throw Error('A autenticação do produtor ainda não está pronta.');
 const status=final?'Pendente Fiscal':'Rascunho';
 const key=cloudKey(record.id);
 const savedId=localStorage.getItem(key);
 if(!savedId){
   // Primeira gravação: usa ID novo, como no formulario resumido validado.
   const created=await addDoc(collection(db,'entrevistas'),{
     ownerUid:user.uid,answers:record,status,
     createdAt:serverTimestamp(),updatedAt:serverTimestamp(),fiscal:{}
   });
   localStorage.setItem(key,created.id);
 }else{
   // Proximas gravacoes: somente campos permitidos nas regras de update.
   await updateDoc(doc(db,'entrevistas',savedId),{
     answers:record,status,updatedAt:serverTimestamp()
   });
 }
 watchStatus();
}
window.rtcCloudSave=(record,final)=>{clearTimeout(draftTimer);pendingSave=saveQueue=saveQueue.catch(()=>{}).then(()=>saveRecord(structuredClone(record),final));pendingSave.catch(err);return pendingSave;};
window.rtcWatchCurrent=watchStatus;
window.rtcCloudDraft=(record)=>{
 clearTimeout(draftTimer);
 draftTimer=setTimeout(()=>{
  // O rascunho só é enviado depois de receber um usuário anônimo válido.
  if(user&&!fiscal&&record?.id)window.rtcCloudSave({...record,status:'Rascunho'},false);
 },1400);
};
function watchStatus(){if(statusUnsub){statusUnsub();statusUnsub=null;}
 if(!user||fiscal||!window.rtcGetCurrentId?.())return;
 const cloudId=localStorage.getItem(cloudKey(window.rtcGetCurrentId()));
 if(!cloudId)return;
 statusUnsub=onSnapshot(doc(db,'entrevistas',cloudId),snap=>{
  if(!snap.exists())return;
  const s=snap.data().status;
  const mirror=JSON.parse(localStorage.getItem('marubeni-painel-fiscal-previa-v2')||'[]');
  const items=Array.isArray(mirror)?mirror:[];const i=items.findIndex(x=>x.id===window.rtcGetCurrentId());
  const entry={id:window.rtcGetCurrentId(),status:s};if(i>=0)items[i]={...items[i],...entry};else items.push(entry);
  localStorage.setItem('marubeni-painel-fiscal-previa-v2',JSON.stringify(items));
  const badge=el('rtc-client-status');if(badge){badge.textContent=s==='Aprovado Fiscal'?'Aprovado pelo Fiscal':s==='Correção solicitada'?'Correção solicitada pelo Fiscal':'Aguardando análise da Marubeni';}
 },err);
}
onAuthStateChanged(auth,async u=>{
 user=u;fiscal=isFiscal(u);window.rtcAuthenticated=fiscal;
 if(fiscal){el('rtc-email').value=u.email; if(el('rtc-access').style.display==='block')showPanel();}
 else if(u&&!u.isAnonymous){ // other accounts have no fiscal permissions
  await signOut(auth);return;
 }else if(!u){try{await signInAnonymously(auth);}catch(e){err(e);}return;}
 // Acompanhar status somente após salvar; ouvir documento inexistente pode ser recusado.
});
// Re-register status listener when navigating to a different interview.
const oldRender=window.render;
if(typeof oldRender==='function')window.render=function(...args){const r=oldRender(...args);watchStatus();return r;};
// Existing page initializes with its own local rascunho. Keep it and synchronize on edits.
