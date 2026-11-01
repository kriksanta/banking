(() => {
  const panel=document.querySelector('#admin-panel'),issueCard=document.querySelector('#issue-card');
  const service=import('./firebase-service.js?v=20261101a');
  const adminPortalButton=document.querySelector('#open-firebase-admin');
  let adminUser=null,loadingInbox=false,savingMargins=false,savedNotice='',needsMarginImport=false,loadingActivity=false;
  function message(id,text,state='') {const element=document.querySelector('#'+id);element.textContent=text;element.dataset.state=state;}
  function connection(text) {document.querySelector('#firebase-connection-status').textContent=text;}
  function openAdmin() {
    appShell.dataset.admin='true';appShell.dataset.firebaseAdmin='true';adminPortalButton.hidden=false;adminPortalButton.textContent='User';adminPortalButton.setAttribute('aria-label','Switch to user tools');
    toolMenu.hidden=true;Object.values(toolPanels).forEach(tool=>tool.hidden=true);issueCard.hidden=true;panel.hidden=false;settingsEditor.hidden=false;
    document.querySelector('#admin-account-username').value=adminUser.username;
    document.querySelector('#notice-form button[type="submit"]').disabled=false;
    document.querySelector('#admin-account-form button[type="submit"]').disabled=false;
    marginSaveButton.disabled=!marginDataDirty&&!needsMarginImport;
    renderSettingsList();clearTimeout(safetyToastTimer);safetyToast.classList.remove('is-visible');showApp(true);
    document.querySelector('[data-admin-tab="dashboard"]').click();connection('Connected to Firebase · '+adminUser.username);window.scrollTo({top:0,behavior:'auto'});
  }
  adminPortalButton.addEventListener('click',async()=>{
    if(adminUser){if(!panel.hidden){openUserView();}else openAdmin();return;}
    adminPortalButton.disabled=true;
    try {
      const account=await(await service).currentAccount();
      if(account?.admin){adminUser=account;openAdmin();return;}
      const dialog=document.querySelector('#admin-access-dialog');
      document.querySelector('#admin-access-message').textContent=account?'Your account is signed in. Admin access has not been enabled for this email yet.':'Please log in with your admin email first.';
      dialog.showModal();
    }catch(problem){const dialog=document.querySelector('#admin-access-dialog');document.querySelector('#admin-access-message').textContent=problem.message;dialog.showModal();}
    finally{adminPortalButton.disabled=false;}
  });
  document.querySelector('#close-admin-access').addEventListener('click',()=>document.querySelector('#admin-access-dialog').close());
  function resetAdmin() {
    adminUser=null;adminPortalButton.hidden=true;adminPortalButton.textContent='Admin';delete appShell.dataset.firebaseAdmin;delete appShell.dataset.admin;panel.hidden=true;
    Object.values(toolPanels).forEach(tool=>tool.hidden=true);toolMenu.hidden=false;
    document.querySelector('#notice-form button[type="submit"]').disabled=true;
    document.querySelector('#admin-account-form button[type="submit"]').disabled=true;
    connection('Sign in with the Firebase admin account to save changes.');
    document.querySelector('#submission-inbox').replaceChildren();
    document.querySelector('#account-logs').replaceChildren();
    ['account-total','account-active','account-verified'].forEach(id=>document.querySelector('#'+id).textContent='—');
  }
  function openUserView() {
    panel.hidden=true;delete appShell.dataset.admin;
    toolMenu.hidden=false;Object.values(toolPanels).forEach(tool=>tool.hidden=true);issueCard.hidden=false;
    adminPortalButton.textContent='Admin';adminPortalButton.setAttribute('aria-label','Switch to admin controls');
    sessionStorage.removeItem(toolSessionKey);showApp(true);window.scrollTo({top:0,behavior:'auto'});
  }
  function openUser() {resetAdmin();showApp(true);issueCard.hidden=toolMenu.hidden;}
  window.cashToolAdminLogin=async(email,password)=>{
    const button=loginForm.querySelector('[type="submit"]'),error=document.querySelector('#login-error');button.disabled=true;error.hidden=true;
    try {const firebase=await service;const account=await firebase.login(email,password);localStorage.removeItem('bfilCashToolsSignedIn');if(account.admin){adminUser=account;openAdmin();}else openUser();document.querySelector('#login-password').value='';window.dispatchEvent(new Event('cash-tool-auth-changed'));}
    catch(problem){error.textContent=problem.message;error.hidden=false;}
    finally{button.disabled=false;}
  };
  async function logoutAdmin() {
    try{await(await service).logout();}catch{}
    resetAdmin();window.dispatchEvent(new Event('cash-tool-auth-changed'));localStorage.removeItem('bfilCashToolsSignedIn');showLogin();loginForm.reset();
    document.querySelector('#login-password').type='password';document.querySelector('#password-toggle').setAttribute('aria-pressed','false');
    document.querySelector('#admin-account-form').reset();
  }
  document.querySelector('#logout-app').addEventListener('click',logoutAdmin);
  let accountActionBusy=false;
  async function accountAction(action) {
    if(accountActionBusy)return;
    const email=document.querySelector('#login-username'),password=document.querySelector('#login-password'),error=document.querySelector('#login-error');
    if(!email.reportValidity() || (action!=='reset'&&!password.reportValidity()))return;
    accountActionBusy=true;const buttons=[...loginForm.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);error.hidden=false;error.textContent='Please wait…';
    try {
      const firebase=await service;
      if(action==='register'){await firebase.register(email.value,password.value);error.textContent='Account created. Verify your email, then wait for admin approval before logging in.';}
      if(action==='verify'){await firebase.resendVerification(email.value,password.value);error.textContent='If verification is needed, a new email has been sent. Check your inbox, then log in.';}
      if(action==='reset'){await firebase.resetPassword(email.value);error.textContent='If this email has an account, a password reset email has been sent.';}
      password.value='';
    }catch(problem){error.textContent=problem.message;}
    finally{accountActionBusy=false;buttons.forEach(button=>button.disabled=false);}
  }
  document.querySelector('#create-email-account').addEventListener('click',()=>accountAction('register'));
  document.querySelector('#resend-email-verification').addEventListener('click',()=>accountAction('verify'));
  document.querySelector('#reset-email-password').addEventListener('click',()=>accountAction('reset'));
  new MutationObserver(()=>{issueCard.hidden=!panel.hidden||toolMenu.hidden;}).observe(toolMenu,{attributes:true,attributeFilter:['hidden']});
  const tabs=[...document.querySelectorAll('[data-admin-tab]')];
  function selectTab(button){tabs.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.querySelector('#admin-'+tab.dataset.adminTab).hidden=!selected;});if(button.dataset.adminTab==='submissions')loadInbox();if(['activity','users'].includes(button.dataset.adminTab))loadActivity();}
  tabs.forEach(tab=>tab.addEventListener('click',()=>selectTab(tab)));
  document.querySelector('.admin-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let index=tabs.indexOf(document.activeElement);
    index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabs[index]);tabs[index].focus();
  });
  async function loadInbox(){
    if(loadingInbox)return;
    if(!adminUser){message('submissions-status','Sign in with the Firebase admin account to read submissions.');return;}
    loadingInbox=true;const button=document.querySelector('#refresh-submissions');button.disabled=true;const inbox=document.querySelector('#submission-inbox');inbox.replaceChildren();message('submissions-status','Loading…');
    try{
      const firebase=await service,issues=await firebase.listIssues();
      for(const issue of issues){
        const article=document.createElement('article');article.className='message-item';const meta=document.createElement('div');meta.className='message-meta';
        const name=document.createElement('strong');name.textContent=issue.name;const time=document.createElement('time');time.dateTime=issue.date;time.textContent=issue.date?new Date(issue.date).toLocaleString('en-IN'):'';
        const text=document.createElement('p');text.textContent=issue.message;const controls=document.createElement('div');controls.className='issue-controls';
        const badge=document.createElement('span');badge.className='issue-status-badge';let status=issue.status==='closed'?'closed':'open';const toggle=document.createElement('button');toggle.type='button';
        function render(){badge.dataset.status=status;badge.textContent=status==='closed'?'Closed':'Open';toggle.textContent=status==='closed'?'Mark open':'Mark closed';toggle.setAttribute('aria-label',toggle.textContent+': '+issue.name);}
        render();toggle.addEventListener('click',async()=>{toggle.disabled=true;const next=status==='open'?'closed':'open';toggle.textContent='Saving…';try{await firebase.setIssueStatus(issue.id,next);status=next;message('submissions-status','Issue marked '+status+'.','success');}catch(problem){message('submissions-status',problem.message,'error');}finally{toggle.disabled=false;render();}});
        meta.append(name,time);controls.append(badge,toggle);article.append(meta,text,controls);inbox.append(article);
      }
      if(!issues.length){const empty=document.createElement('p');empty.className='inbox-empty';empty.textContent='No issues submitted yet.';inbox.append(empty);}
      message('submissions-status',issues.length===500?'Showing the latest 500 submissions.':'');
    }catch(problem){message('submissions-status',problem.message,'error');}
    finally{loadingInbox=false;button.disabled=false;}
  }
  document.querySelector('#refresh-submissions').addEventListener('click',loadInbox);
  async function loadActivity() {
    if(loadingActivity)return;
    if(!adminUser){message('account-activity-status','Sign in with your approved admin email to view accounts and logs.');return;}
    loadingActivity=true;const button=document.querySelector('#refresh-account-activity');button.disabled=true;
    message('account-activity-status','Loading account activity…');message('users-count-status','Loading accounts…');
    try {
      const data=await(await service).accountDashboard();
      document.querySelector('#account-total').textContent=data.total;
      document.querySelector('#account-active').textContent=data.active;
      document.querySelector('#account-verified').textContent=data.verified;
      const list=document.querySelector('#account-logs');list.replaceChildren();
      for(const log of data.logs){
        const row=document.createElement('div');row.className='account-log-row';
        const info=document.createElement('div'),email=document.createElement('strong'),event=document.createElement('small'),time=document.createElement('time');
        email.textContent=log.email;event.textContent=({created:'Account created',login:'Signed in',logout:'Signed out'})[log.event]||'Account activity';
        time.dateTime=log.date;time.textContent=log.date?new Date(log.date).toLocaleString('en-IN'):'';
        info.append(email,event);row.append(info,time);list.append(row);
      }
      if(!data.logs.length){const empty=document.createElement('p');empty.textContent='No activity recorded yet.';list.append(empty);}
      message('account-activity-status','Updated '+new Date().toLocaleTimeString('en-IN')+' · latest 100 events');message('users-count-status','Updated '+new Date().toLocaleTimeString('en-IN'));
    }catch(problem){message('account-activity-status',problem.message,'error');message('users-count-status',problem.message,'error');}
    finally{loadingActivity=false;button.disabled=false;}
  }
  document.querySelector('#refresh-account-activity').addEventListener('click',loadActivity);document.querySelector('#refresh-user-accounts').addEventListener('click',loadActivity);
  setInterval(()=>{if(!document.hidden && !panel.hidden && (!document.querySelector('#admin-activity').hidden||!document.querySelector('#admin-users').hidden))loadActivity();},30000);
  document.querySelector('#issue-form').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');button.disabled=true;message('issue-status','Submitting…');
    try{await(await service).submitIssue(document.querySelector('#issue-name').value,document.querySelector('#issue-description').value,document.querySelector('#issue-website').value);form.reset();message('issue-status','Your issue has been submitted. Thank you.','success');}
    catch(problem){message('issue-status',problem.message,'error');}finally{button.disabled=false;}
  });
  marginSaveButton.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!adminUser){marginSaveStatus.textContent='Sign in with the Firebase admin account to save.';return;}
    if(savingMargins||(!marginDataDirty&&!needsMarginImport))return;savingMargins=true;marginSaveButton.disabled=true;marginSaveStatus.textContent='Saving to Firebase…';
    try{await(await service).saveMargins(businessMargins);marginDataDirty=false;needsMarginImport=false;marginSaveButton.textContent='Save to Firebase';marginSaveStatus.textContent='Saved to Firebase. The shared list updates for everyone.';}
    catch(problem){marginSaveStatus.textContent=problem.message;}finally{savingMargins=false;marginSaveButton.disabled=!marginDataDirty&&!needsMarginImport;}
  },true);
  document.querySelector('#notice-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!adminUser)return;const button=event.currentTarget.querySelector('[type="submit"]');button.disabled=true;message('notice-save-status','Saving…');
    try{await(await service).saveNotice(document.querySelector('#notice-content').value);message('notice-save-status','Notice saved. It updates for everyone.','success');}
    catch(problem){message('notice-save-status',problem.message,'error');}finally{button.disabled=false;}
  });
  document.querySelector('#admin-account-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!adminUser)return;const password=document.querySelector('#admin-new-password').value;
    if(password!==document.querySelector('#admin-confirm-password').value){message('admin-account-status','New passwords do not match.','error');return;}
    const button=event.currentTarget.querySelector('[type="submit"]');button.disabled=true;message('admin-account-status','Updating…');
    try{adminUser=await(await service).changeAccount(document.querySelector('#admin-account-username').value,document.querySelector('#admin-current-password').value,password);['admin-current-password','admin-new-password','admin-confirm-password'].forEach(id=>document.querySelector('#'+id).value='');message('admin-account-status','Admin account updated.','success');connection('Connected to Firebase · '+adminUser.username);}
    catch(problem){message('admin-account-status',problem.message,'error');}finally{button.disabled=false;}
  });
  service.then(async firebase=>{
    try{const response=await fetch('./business-margins.json',{cache:'no-store'});if(response.ok){const rows=await response.json();if(Array.isArray(rows)&&rows.every(row=>Array.isArray(row)&&typeof row[0]==='string'&&Number.isFinite(row[1]))){businessMargins=rows;renderBusinessDirectory();renderSettingsList();}}}catch{}
    setInterval(()=>{if(!document.hidden && !appShell.hidden)firebase.recordAccountActivity().catch(()=>{});},60000);
    document.querySelector('#issue-form button[type="submit"]').disabled=false;
    firebase.watchMargins(rows=>{
      if(rows===null){needsMarginImport=true;marginSaveButton.textContent='Import current margins';marginSaveButton.disabled=!adminUser;marginSaveStatus.textContent='The current list is ready to import after admin sign-in.';return;}
      if(marginDataDirty||savingMargins)return;businessMargins=rows;renderBusinessDirectory();renderSettingsList();marginSaveStatus.textContent='Shared margins loaded from Firebase.';
    },problem=>{marginSaveStatus.textContent=problem.message;});
    firebase.watchNotice(text=>{
      document.querySelector('#published-notice').textContent=text;document.querySelector('#notice-footer').hidden=!text;
      const input=document.querySelector('#notice-content');if(input.value===savedNotice)input.value=text;savedNotice=text;
    },problem=>message('notice-save-status',problem.message,'error'));
    const account=await firebase.currentAccount();window.dispatchEvent(new Event('cash-tool-auth-changed'));if(account)await firebase.recordAccountActivity().catch(()=>{});if(account?.admin){adminUser=account;openAdmin();}else if(account?.approved)openUser();else {showLogin();if(account){const error=document.querySelector('#login-error');error.textContent=account.status==='blocked'?'Your access has been blocked. Please contact the administrator.':'Please wait for admin approval.';error.hidden=false;}connection('Sign in with your admin email to save changes.');}
  }).catch(problem=>{connection('Firebase could not connect. '+problem.message);});
})();
