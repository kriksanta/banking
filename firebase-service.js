import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot, where, getCountFromServer, Timestamp,
  serverTimestamp, writeBatch} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const response = await fetch('./firebase-config.json', {cache:'no-store'});
if (!response.ok) throw new Error('Firebase configuration could not be loaded.');
export const config = await response.json();
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);
await new Promise(resolve => {const stop = onAuthStateChanged(auth, () => {stop();resolve();});});

function friendly(error) {
  const code = error?.code || '';
  if (['auth/invalid-credential','auth/invalid-login-credentials','auth/wrong-password','auth/user-not-found'].includes(code)) return new Error('Incorrect email or password.');
  if (code === 'auth/email-already-in-use') return new Error('This email already has an account. Log in or reset your password.');
  if (code === 'auth/invalid-email') return new Error('Enter a valid email address.');
  if (code === 'auth/weak-password') return new Error('Choose a stronger password with at least 10 characters.');
  if (code === 'auth/operation-not-allowed') return new Error('The required sign-in method has not been enabled in Firebase.');
  if (code === 'permission-denied') return new Error('Access denied. Check the Firebase rules and admin account setup.');
  if (code === 'auth/too-many-requests') return new Error('Too many attempts. Please try again later.');
  if (code === 'auth/network-request-failed' || code === 'unavailable') return new Error('Connection unavailable. Please try again.');
  return new Error(error?.message || 'Firebase could not complete this request.');
}

async function admin() {
  if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error('Please log in to the admin account.');
  const role = await getDoc(doc(db,'adminRoles',auth.currentUser.uid));
  if (!role.exists() || role.data().admin !== true) throw new Error('This account does not have admin access.');
  return auth.currentUser;
}

export async function login(email,password) {
  try {
    await signInWithEmailAndPassword(auth,String(email).trim(),password);
    await requestAccountAccess();
    if (!auth.currentUser.emailVerified) throw new Error('Verify your email before logging in. Use Resend verification if needed.');
    const account=await currentAccount();
    if(!account.approved)throw new Error(account.status==='blocked'?'Your access has been blocked. Please contact the administrator.':'Please wait for admin approval.');
    await recordAccountActivity('login').catch(()=>{});
    return account;
  } catch (error) {throw friendly(error);}
}

export async function register(email,password) {
  try {
    if (password.length < 10 || password.length > 128) throw new Error('Use a password with 10–128 characters.');
    const result=await createUserWithEmailAndPassword(auth,String(email).trim(),password);
    await requestAccountAccess();
    await recordAccountActivity('created').catch(()=>{});
    await sendEmailVerification(result.user);
  } catch(error) {throw friendly(error);}
}
export async function resendVerification(email,password) {
  try {
    await signInWithEmailAndPassword(auth,String(email).trim(),password);
    if(auth.currentUser.emailVerified) return;
    await sendEmailVerification(auth.currentUser);
  } catch(error) {throw friendly(error);}
}
export async function resetPassword(email) {
  try {await sendPasswordResetEmail(auth,String(email).trim());} catch(error) {throw friendly(error);}
}
export async function currentAccount() {
  const user=auth.currentUser;
  if(!user || user.isAnonymous || !user.emailVerified) return null;
  const role=await getDoc(doc(db,'adminRoles',user.uid));
  const isAdmin=role.exists() && role.data().admin === true;
  const access=isAdmin?null:await getDoc(doc(db,'accountAccess',user.uid));
  const status=isAdmin?'approved':access?.data()?.status || 'pending';
  return {uid:user.uid,email:user.email,username:user.email,admin:isAdmin,approved:status==='approved',status};
}
export async function requestAccountAccess() {
  const user=auth.currentUser;if(!user || user.isAnonymous)return;
  const role=await getDoc(doc(db,'adminRoles',user.uid));if(role.data()?.admin===true)return;
  const ref=doc(db,'accountAccess',user.uid),existing=await getDoc(ref);
  if(!existing.exists())await setDoc(ref,{uid:user.uid,email:user.email,status:'pending',requestedAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export function watchApprovalRequests(receive,fail) {
  return onSnapshot(collection(db,'accountAccess'),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),date:item.data().requestedAt?.toDate().toISOString()||''}))),error=>fail(friendly(error)));
}
export async function setAccountAccess(uid,status) {
  await admin();if(!['approved','blocked'].includes(status))throw new Error('Invalid access status.');
  await updateDoc(doc(db,'accountAccess',uid),{status,updatedAt:serverTimestamp()});
}
export function watchMyAccountAccess(receive,fail) {
  const user=auth.currentUser;if(!user || user.isAnonymous)return ()=>{};
  return onSnapshot(doc(db,'accountAccess',user.uid),snapshot=>receive(snapshot.data()?.status||'pending'),fail);
}
export async function currentAdmin() {
  try {
    const user=await currentAccount();
    return user?.admin ? user : null;
  } catch {return null;}
}
export async function logout() {
  try {if(auth.currentUser && !auth.currentUser.isAnonymous)await recordAccountActivity('logout');}
  finally {await signOut(auth);}
}

export async function recordAccountActivity(event='') {
  const user=auth.currentUser;
  if(!user || user.isAnonymous)return;
  const ref=doc(db,'accounts',user.uid),existing=await getDoc(ref);
  const batch=writeBatch(db);
  batch.set(ref,{uid:user.uid,email:user.email,verified:user.emailVerified,
    createdAt:existing.exists()?existing.data().createdAt:serverTimestamp(),lastSeenAt:serverTimestamp(),
    online:event!=='logout'});
  if(event)batch.set(doc(collection(db,'accountLogs')),{uid:user.uid,email:user.email,event,at:serverTimestamp()});
  await batch.commit();
}
export async function accountDashboard() {
  try {
    await admin();
    const [total,active,verified,logs]=await Promise.all([
      getCountFromServer(collection(db,'accounts')),
      getCountFromServer(query(collection(db,'accounts'),where('lastSeenAt','>=',Timestamp.fromMillis(Date.now()-120000)))),
      getCountFromServer(query(collection(db,'accounts'),where('verified','==',true))),
      getDocs(query(collection(db,'accountLogs'),orderBy('at','desc'),limit(100)))
    ]);
    // Recently active includes accounts that signed out within the last two minutes.
    return {total:total.data().count,active:active.data().count,verified:verified.data().count,
      logs:logs.docs.map(item=>({id:item.id,...item.data(),date:item.data().at?.toDate().toISOString()||''}))};
  }catch(error){throw friendly(error);}
}
export async function allowedTools() {
  const user=await currentAccount();
  if(!user?.approved)return {challan:false,income:false};
  if(user.admin)return {challan:true,income:true};
  const access=await getDoc(doc(db,'toolAccess',user.uid));
  return {challan:access.data()?.challan===true,income:access.data()?.income===true};
}
export function watchAllowedTools(receive,fail) {
  let stops=[],cancelled=false;
  currentAccount().then(user=>{
    if(cancelled)return;
    if(!user){receive({challan:false,income:false});return;}
    if(user.admin){receive({challan:true,income:true});return;}
    let approved=false,tools={},approvalReady=false,toolsReady=false;
    const emit=()=>{if(approvalReady && (toolsReady || !approved))receive({challan:approved&&tools.challan===true,income:approved&&tools.income===true});};
    stops.push(onSnapshot(doc(db,'accountAccess',user.uid),snapshot=>{approved=snapshot.data()?.status==='approved';approvalReady=true;emit();},fail));
    stops.push(onSnapshot(doc(db,'toolAccess',user.uid),snapshot=>{tools=snapshot.data()||{};toolsReady=true;emit();},fail));
  }).catch(fail);
  return ()=>{cancelled=true;stops.forEach(stop=>stop());};
}
export async function listToolAccess() {
  await admin();
  const [accounts,grants]=await Promise.all([getDocs(collection(db,'accounts')),getDocs(collection(db,'toolAccess'))]);
  const access=new Map(grants.docs.map(item=>[item.id,item.data()]));
  return accounts.docs.map(item=>({uid:item.id,email:item.data().email,...access.get(item.id)})).sort((a,b)=>a.email.localeCompare(b.email));
}
export async function saveToolAccess(uid,tools) {
  await admin();
  await setDoc(doc(db,'toolAccess',uid),{challan:tools.challan===true,income:tools.income===true,updatedAt:serverTimestamp()});
}

export async function changeAccount(username,currentPassword,newPassword) {
  let passwordChanged=false;
  try {
    const user = await admin();
    username = String(username).trim();
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username) || username.toLowerCase() === 'admin') throw new Error('Choose 3–40 letters, numbers, dots, hyphens or underscores. The name admin is reserved.');
    if (newPassword && (newPassword.length < 10 || newPassword.length > 128)) throw new Error('Use a password with 10–128 characters.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email,currentPassword));
    if (newPassword) {await updatePassword(user,newPassword);passwordChanged=true;}
    await setDoc(doc(db,'settings','adminLogin'),{username,updatedAt:serverTimestamp()});
    return {username,uid:user.uid,email:user.email,admin:true};
  } catch (error) {if(passwordChanged)throw new Error('Your password was changed, but the username could not be saved. Sign in with the new password and try the username change again.');throw friendly(error);}
}

export function watchMargins(receive,fail) {
  return onSnapshot(doc(db,'settings','margins'),snapshot => {
    if (!snapshot.exists()) {receive(null);return;}
    const entries = snapshot.data().entries;
    if (!Array.isArray(entries)) {fail(new Error('The saved margin list is invalid.'));return;}
    receive(entries.map(entry=>[entry.label,entry.margin,entry.nature || entry.label,entry.remarks || '',entry.segment || '',entry.sourceId ?? null]));
  },error=>fail(friendly(error)));
}
export async function saveMargins(rows) {
  try {
    await admin();
    if (!Array.isArray(rows) || rows.length > 500 || !rows.every(row=>typeof row[0]==='string' && row[0].trim() && Number.isFinite(row[1]) && row[1]>=0 && row[1]<=100)) throw new Error('Check the business names and margin percentages.');
    const entries=rows.map(row=>({label:row[0],margin:row[1],nature:row[2] || row[0],remarks:row[3] || '',segment:row[4] || '',sourceId:row[5] ?? null}));
    await setDoc(doc(db,'settings','margins'),{entries,updatedAt:serverTimestamp()});
  } catch(error) {throw friendly(error);}
}
export function watchNotice(receive,fail) {
  let revision=0;const stop=onSnapshot(doc(db,'settings','notice'),snapshot=>{const current=++revision;if(snapshot.exists()){receive(String(snapshot.data().text||''));return;}fetch('./notice.json',{cache:'no-store'}).then(response=>response.ok?response.json():{text:''}).then(value=>{if(current===revision)receive(String(value.text||''));}).catch(()=>{if(current===revision)receive('');});},error=>fail(friendly(error)));return ()=>{revision++;stop();};
}
export async function saveNotice(text) {
  try {await admin();if(text.length>500)throw new Error('Keep the notice within 500 characters.');await setDoc(doc(db,'settings','notice'),{text:text.trim(),updatedAt:serverTimestamp()});}
  catch(error){throw friendly(error);}
}
export async function submitIssue(name,message,website) {
  try {
    name=name.trim();message=message.trim();
    if(website || !name || name.length>80 || !message || message.length>2000) throw new Error('Enter your name and issue (up to 2,000 characters).');
    if(!auth.currentUser || auth.currentUser.isAnonymous || !auth.currentUser.emailVerified) throw new Error('Please log in with your verified email first.');
    if(!(await currentAccount())?.approved)throw new Error('Admin approval is required before submitting an issue.');
    const uid=auth.currentUser.uid;
    const state=await getDoc(doc(db,'submissionState',uid));
    const submitted=state.data()?.lastSubmittedAt?.toMillis?.() || 0;
    if(Date.now()-submitted<60000)throw new Error('Please wait a minute before submitting another issue.');
    const issue=doc(collection(db,'issues'));
    const batch=writeBatch(db);
    batch.set(issue,{name,message,status:'open',ownerUid:uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    batch.set(doc(db,'submissionState',uid),{lastIssueId:issue.id,lastSubmittedAt:serverTimestamp()});
    await batch.commit();
  } catch(error){throw friendly(error);}
}
export async function listIssues() {
  try {
    await admin();const snapshot=await getDocs(query(collection(db,'issues'),orderBy('createdAt','desc'),limit(500)));
    return snapshot.docs.map(entry=>({id:entry.id,...entry.data(),date:entry.data().createdAt?.toDate().toISOString() || ''}));
  } catch(error){throw friendly(error);}
}
export async function setIssueStatus(id,status) {
  try {await admin();if(!['open','closed'].includes(status))throw new Error('Invalid issue status.');await updateDoc(doc(db,'issues',id),{status,updatedAt:serverTimestamp()});}
  catch(error){throw friendly(error);}
}
