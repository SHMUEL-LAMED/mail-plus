import {verifyGoogle,isAllowedEmail} from './auth.mjs';
import {THEMES,PRESETS,DEFAULT_THEME,themeOf,presetOf,buildEmailHtml,previewPage} from './templates.mjs';
const BASE='https://mail-plus-gmail.smwlyqswkwt232.workers.dev';
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const para=text=>({textParagraph:{text}});
const button=(text,path,parameters={})=>({buttonList:{buttons:[{text,onClick:{action:{function:BASE+path,parameters:Object.entries(parameters).map(([key,value])=>({key,value:String(value)}))}}}]}});
const card=(widgets,update=false)=>({action:{navigations:[{[update?'updateCard':'pushCard']:{header:{title:'מייל פלוס',subtitle:'כלים אישיים בתוך Gmail'},sections:[{widgets}]}}]}});
const input=(e,k)=>String(e.commonEventObject?.formInputs?.[k]?.stringInputs?.value?.[0]||'').trim();
const inputs=(e,k)=>(e.commonEventObject?.formInputs?.[k]?.stringInputs?.value||[]).map(String);
const COMPOSE_SCOPE='https://www.googleapis.com/auth/gmail.addons.current.action.compose';
const dropdown=(name,label,items,selected)=>({selectionInput:{name,label,type:'DROPDOWN',items:Object.entries(items).map(([value,v])=>({text:v.name,value,selected:value===selected}))}});
let prefsReady=false;
async function prefs(env,owner){
 if(!prefsReady){await env.DB.prepare('CREATE TABLE IF NOT EXISTS gmail_addon_prefs (owner TEXT PRIMARY KEY, theme TEXT NOT NULL, signature TEXT NOT NULL, role TEXT NOT NULL, bh INTEGER NOT NULL DEFAULT 1)').bind().run();prefsReady=true;}
 return (await env.DB.prepare('SELECT theme,signature,role,bh FROM gmail_addon_prefs WHERE owner=?').bind(owner).first())||{theme:DEFAULT_THEME,signature:'',role:'',bh:1};
}
async function composeCard(env,user){
 const p=await prefs(env,user.email);
 return card([
  para('<b>מייל מעוצב</b><br>בוחרים עיצוב ונוסח, והמייל נכנס לטיוטה עם רקע, כותרת וחתימה. אפשר להמשיך לערוך אותו בטיוטה.'),
  dropdown('theme','עיצוב',THEMES,themeOf(p.theme)),
  dropdown('preset','נוסח מוכן',PRESETS,'free'),
  {textInput:{name:'title',label:'כותרת (לא חובה)',type:'SINGLE_LINE'}},
  {textInput:{name:'body',label:'תוכן המייל',type:'MULTIPLE_LINE',hintText:'אם ריק – ייכנס הנוסח המוכן שנבחר'}},
  {textInput:{name:'signature',label:'שם לחתימה',type:'SINGLE_LINE',value:String(p.signature||'')}},
  {textInput:{name:'role',label:'תפקיד / ארגון (לא חובה)',type:'SINGLE_LINE',value:String(p.role||'')}},
  {selectionInput:{name:'options',label:'אפשרויות',type:'CHECK_BOX',items:[{text:'ב״ה בראש המייל',value:'bh',selected:p.bh!==0},{text:'לזכור עיצוב וחתימה לפעם הבאה',value:'save',selected:true}]}},
  button('הכנס מייל מעוצב לטיוטה','/insert'),
  {buttonList:{buttons:[{text:'צפייה בכל העיצובים',onClick:{openLink:{url:BASE+'/preview'}}}]}}
 ]);
}
async function home(env,user,update=false){
 const result=await env.DB.prepare('SELECT id,title FROM gmail_addon_tasks WHERE owner=? AND done=0 ORDER BY created DESC LIMIT 30').bind(user.email).all();
 const widgets=[para('המשימות שלך נשמרות בענן. פתח הודעה כדי ליצור ממנה משימת מעקב.'),{textInput:{name:'title',label:'משימה חדשה',type:'SINGLE_LINE'}},button('הוסף משימה','/add')];
 for(const t of result.results||[]) widgets.push(para(esc(t.title)),button('סמן כבוצע','/done',{id:t.id}));
 widgets.push({buttonList:{buttons:[{text:'פתיחת כלי המייל המלאים',onClick:{openLink:{url:'https://shmuel-lamed.github.io/mail-plus/'}}}]}});
 return card(widgets,update);
}
export default {async fetch(request,env){
 const url=new URL(request.url),p=url.pathname;
 const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(p==='/preview'&&request.method==='GET')return new Response(previewPage(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
 if(p==='/health'&&request.method==='GET')return json({service:'mail-plus-gmail',version:'1.1.0',status:env.ADDON_CLIENT_ID&&env.ADDON_SERVICE_ACCOUNT?'ready':'awaiting-google-registration'});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!['/home','/add','/done','/message','/followup','/compose','/insert'].includes(p))return json({error:'Not found'},404);
 if(!env.ADDON_CLIENT_ID||!env.ADDON_SERVICE_ACCOUNT)return json({error:'Google registration required'},503);
 if(Number(request.headers.get('content-length')||0)>65536)return json({error:'Payload too large'},413);
 try{
 const raw=await request.text();if(raw.length>65536)return json({error:'Payload too large'},413);
 let e;try{e=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 // Verify both the Google deployment service account and the end user.
 const system=e.authorizationEventObject?.systemIdToken||(request.headers.get('authorization')||'').replace(/^Bearer /,'');
 const sys=await verifyService(system,BASE+p,env.ADDON_SERVICE_ACCOUNT);
 if(!sys)return json({error:'Unauthorized'},401);
 const user=await verifyGoogle(new Request(BASE,{headers:{authorization:'Bearer '+(e.authorizationEventObject?.userIdToken||'')}}),env.ADDON_CLIENT_ID);
 if(!user||!(await isAllowedEmail(user.email)))return json({error:'Forbidden'},403);
 const params=e.commonEventObject?.parameters||{};
 if(p==='/add'){
  const title=input(e,'title').slice(0,200);if(!title)return json(card([para('נא לכתוב שם למשימה.')]));
  await env.DB.prepare('INSERT INTO gmail_addon_tasks(id,owner,title,created,done) VALUES(?,?,?,?,0)').bind(crypto.randomUUID(),user.email,title,Date.now()).run();
 }
 if(p==='/done')await env.DB.prepare('UPDATE gmail_addon_tasks SET done=1 WHERE id=? AND owner=?').bind(String(params.id||''),user.email).run();
 if(p==='/compose')return json(await composeCard(env,user));
 if(p==='/insert'){
  if(!e.authorizationEventObject?.authorizedScopes?.includes(COMPOSE_SCOPE))return json({requesting_google_scopes:{scopes:[COMPOSE_SCOPE]}});
  const theme=themeOf(input(e,'theme')),preset=PRESETS[presetOf(input(e,'preset'))],opts=inputs(e,'options');
  const signature=input(e,'signature').slice(0,120),role=input(e,'role').slice(0,160),bh=opts.includes('bh');
  const body=String(e.commonEventObject?.formInputs?.body?.stringInputs?.value?.[0]||'').slice(0,20000).trim()||preset.body;
  const html=buildEmailHtml({theme,title:input(e,'title')||preset.title,body,signature,role,bh});
  if(opts.includes('save'))await env.DB.prepare('INSERT INTO gmail_addon_prefs(owner,theme,signature,role,bh) VALUES(?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET theme=excluded.theme,signature=excluded.signature,role=excluded.role,bh=excluded.bh').bind(user.email,theme,signature,role,bh?1:0).run();
  return json({renderActions:{hostAppAction:{gmailAction:{updateDraftActionMarkup:{updateBody:{insertContents:[{content:html,contentType:'MUTABLE_HTML'}],type:'IN_PLACE_INSERT'}}}}}});
 }
 if(p==='/message'||p==='/followup'){
  const scope='https://www.googleapis.com/auth/gmail.addons.current.message.metadata';
  if(!e.authorizationEventObject?.authorizedScopes?.includes(scope))return json({requesting_google_scopes:{scopes:[scope]}});
  const id=e.gmail?.messageId,token=e.authorizationEventObject?.userOAuthToken,access=e.gmail?.accessToken;
  if(typeof id!=='string'||!token||!access)return json(card([para('פתח הודעת מייל ונסה שוב.')]));
  const api=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id));
  api.searchParams.set('format','metadata');api.searchParams.append('metadataHeaders','Subject');api.searchParams.append('metadataHeaders','From');
  const r=await fetch(api,{headers:{Authorization:'Bearer '+token,'X-Goog-Gmail-Access-Token':access},signal:AbortSignal.timeout(8000)});
  if(!r.ok)return json(card([para('לא ניתן לקרוא את פרטי ההודעה. בדוק שהרשאת ההודעה הנוכחית אושרה.')]));
  const msg=await r.json(),headers=msg.payload?.headers||[],subject=headers.find(h=>h.name.toLowerCase()==='subject')?.value||'ללא נושא';
  if(p==='/followup'){
   await env.DB.prepare('INSERT INTO gmail_addon_tasks(id,owner,title,created,done) VALUES(?,?,?,?,0)').bind(crypto.randomUUID(),user.email,('מעקב: '+subject).slice(0,200),Date.now()).run();
   return json(await home(env,user,true));
  }
  return json(card([para('<b>'+esc(subject)+'</b>'),para(esc(headers.find(h=>h.name.toLowerCase()==='from')?.value||'')),button('צור משימת מעקב','/followup')]));
 }
 return json(await home(env,user,p!=='/home'));
 }catch{return json(card([para('הפעולה נכשלה. נסה שוב בעוד רגע.')]));}
}};
let keys,until=0;
async function verifyService(token,audience,email){
 try{
 if(typeof token!=='string'||token.length>10000)return false;
 const parts=token.split('.');if(parts.length!==3)return false;
 const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),c=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Date.now()/1000;
 if(h.alg!=='RS256'||!h.kid||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||c.aud!==audience||c.email!==email||c.email_verified!==true||!Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.iat)||c.iat>now+60)return false;
 if(!keys||until<Date.now()){const r=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(8000)});if(!r.ok)return false;keys=(await r.json()).keys;until=Date.now()+300000}
 const jwk=keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)return false;
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false}
}
