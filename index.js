
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {onDocumentUpdated}=require("firebase-functions/v2/firestore");
const {initializeApp}=require("firebase-admin/app");
const {getFirestore,FieldValue,Timestamp}=require("firebase-admin/firestore");
const {getAuth}=require("firebase-admin/auth");
const crypto=require("crypto");
initializeApp();
const db=getFirestore();
const region="southamerica-east1";
const normalize=x=>String(x||"").replace(/\D/g,"");
const cpf=x=>`${x.slice(0,3)}.${x.slice(3,6)}.${x.slice(6,9)}-${x.slice(9)}`;
const cnpj=x=>`${x.slice(0,2)}.${x.slice(2,5)}.${x.slice(5,8)}/${x.slice(8,12)}-${x.slice(12)}`;
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
const emailOk=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const hmac=(code,salt)=>crypto.createHmac("sha256",salt).update(code).digest("hex");
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function throttle(key,max,period){
 const ref=db.collection("_otp_limits").doc(hash(key));
 return db.runTransaction(async tx=>{
  const s=await tx.get(ref),d=s.data(),now=Date.now();
  const count=d&&d.until>now?d.count:0;
  if(count>=max)return false;
  tx.set(ref,{count:count+1,until:now+period,expiresAt:Timestamp.fromMillis(now+period+86400000)});
  return true;
 });
}
async function findProducer(taxId){
 const formats=[taxId,taxId.length===11?cpf(taxId):cnpj(taxId)];
 const snapshots=await Promise.all(formats.map(x=>db.collection("entrevistas").where("answers.taxId","==",x).limit(10).get()));
 const docs=new Map();
 for(const s of snapshots)for(const d of s.docs)if(normalize(d.data()?.answers?.taxId)===taxId)docs.set(d.id,d);
 return [...docs.values()].filter(d=>emailOk(String(d.data().answers?.email||"").trim()))
  .sort((a,b)=>(b.data().updatedAt?.toMillis?.()||0)-(a.data().updatedAt?.toMillis?.()||0))[0];
}
exports.solicitarCodigoProdutor=onCall({region,maxInstances:5},async request=>{
 const taxId=normalize(request.data?.taxId);
 if(![11,14].includes(taxId.length))throw new HttpsError("invalid-argument","CPF ou CNPJ inválido.");
 const ip=String(request.rawRequest?.ip||"unknown");
 const allowedIp=await throttle("ip:"+ip,12,3600000);
 const allowedDoc=await throttle("doc:"+taxId,4,3600000);
 if(!allowedIp||!allowedDoc)throw new HttpsError("resource-exhausted","Muitas solicitações. Aguarde e tente novamente.");
 const requestId=crypto.randomUUID();
 const record=await findProducer(taxId);
 if(record){
  const code=String(crypto.randomInt(0,1000000)).padStart(6,"0");
  const salt=crypto.randomBytes(24).toString("hex");
  const ref=db.collection("_otp_requests").doc(requestId);
  await ref.set({recordId:record.id,hash:hmac(code,salt),salt,attempts:0,used:false,
    expiresAt:Timestamp.fromMillis(Date.now()+600000)});
  await db.collection("mail").add({
    to:[record.data().answers.email.trim().toLowerCase()],
    message:{subject:"Marubeni | Código de acesso ao cadastro",
      text:`Seu código para consultar o cadastro no Portal Marubeni é: ${code}\n\nVálido por 10 minutos. Se não solicitou, ignore esta mensagem.`}
  });
 }
 // Resposta indistinguível para CPF/CNPJ encontrado ou não.
 return {requestId};
});
exports.validarCodigoProdutor=onCall({region,maxInstances:5},async request=>{
 const requestId=String(request.data?.requestId||"");
 const code=String(request.data?.code||"");
 if(!/^[0-9a-f-]{36}$/.test(requestId)||!/^\d{6}$/.test(code))
  throw new HttpsError("invalid-argument","Código inválido.");
 const ref=db.collection("_otp_requests").doc(requestId);
 const recordId=await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),d=snap.data();
  if(!d||d.used||d.attempts>=5||d.expiresAt.toMillis()<Date.now())return null;
  const actual=Buffer.from(hmac(code,d.salt),"hex"),expected=Buffer.from(d.hash,"hex");
  const ok=crypto.timingSafeEqual(actual,expected);
  tx.update(ref,ok?{used:true}:{attempts:FieldValue.increment(1)});
  return ok?d.recordId:null;
 });
 if(!recordId)throw new HttpsError("permission-denied","Código incorreto, expirado ou já utilizado.");
 const producerUntil=Date.now()+30*60000;
 const token=await getAuth().createCustomToken("producer_"+recordId,{producerRecordId:recordId,producerUntil});
 return {token,recordId};
});
exports.avisarCorrecaoFiscal=onDocumentUpdated({document:"entrevistas/{recordId}",region},async event=>{
 const before=event.data?.before?.data(),after=event.data?.after?.data();
 if(!after||after.status!=="Correção solicitada"||before?.status==="Correção solicitada")return;
 const email=String(after.answers?.email||"").trim().toLowerCase();
 if(!emailOk(email))return;
 await db.collection("mail").add({to:[email],message:{
  subject:"Marubeni | Correção solicitada no cadastro",
  text:"O setor Fiscal da Marubeni solicitou uma correção no seu cadastro.\n\nAcesse o Portal do Produtor Rural, selecione Acompanhamento, informe seu CPF/CNPJ e valide o código enviado ao seu e-mail para consultar o parecer e corrigir os dados.\n\nAcesse: https://marubeni-fiscal-homologacao.pages.dev/\n\nPor segurança, não responda a este e-mail com documentos ou dados pessoais."
 }});
});
