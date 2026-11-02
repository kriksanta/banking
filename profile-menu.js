(() => {
  const service=import('./firebase-service.js?v=20261102c');
  const logout=document.querySelector('#logout-app');
  const profile=document.createElement('div');profile.className='profile-control';
  profile.innerHTML='<button type="button" class="profile-toggle" aria-label="Your account" aria-expanded="false" aria-controls="profile-dropdown"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg></button><div id="profile-dropdown" class="profile-dropdown" hidden><button type="button" data-profile-settings>Settings</button><button type="button" data-profile-logout>Logout</button></div>';
  logout.before(profile);logout.hidden=true;
  const toggle=profile.querySelector('.profile-toggle'),dropdown=profile.querySelector('#profile-dropdown');
  function closeMenu(){dropdown.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{dropdown.hidden=!dropdown.hidden;toggle.setAttribute('aria-expanded',String(!dropdown.hidden));});
  document.addEventListener('click',event=>{if(!profile.contains(event.target))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dropdown.hidden){closeMenu();toggle.focus();}});
  profile.querySelector('[data-profile-logout]').addEventListener('click',()=>{closeMenu();logout.click();});
  const dialog=document.createElement('dialog');dialog.id='user-settings';dialog.className='user-settings';
  dialog.setAttribute('aria-labelledby','user-settings-title');
  dialog.innerHTML=`<div class="user-settings-heading"><h2 id="user-settings-title">Settings</h2><button type="button" data-close-settings aria-label="Close settings">×</button></div>
    <div class="profile-exp"><span>EXP</span><strong id="profile-exp-total">—</strong></div>
    <form id="user-name-form"><label for="profile-username">Username</label><input id="profile-username" autocomplete="nickname" minlength="3" maxlength="40" pattern="[a-zA-Z0-9_.-]{3,40}" required><small>Your email remains your sign-in.</small><button type="submit">Save username</button><p role="status" data-name-status></p></form>
    <form id="user-password-form"><h3>Change password</h3><label for="profile-current-password">Current password</label><input id="profile-current-password" type="password" autocomplete="current-password" required><label for="profile-new-password">New password</label><input id="profile-new-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required><label for="profile-confirm-password">Confirm new password</label><input id="profile-confirm-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required><button type="submit">Change password</button><p role="status" data-password-status></p></form>
    <section class="profile-access-request"><h3>Request access</h3><p>Send an access request to the administrator.</p><button type="button" data-request-access>Send request</button><p role="status" data-request-status></p></section>`;
  document.body.append(dialog);
  let stopPoints=()=>{},generation=0;
  dialog.querySelector('[data-close-settings]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{generation++;stopPoints();dialog.querySelector('#user-password-form').reset();toggle.focus();});
  profile.querySelector('[data-profile-settings]').addEventListener('click',async()=>{
    closeMenu();const version=++generation;dialog.querySelectorAll('[role=status]').forEach(item=>item.textContent='');dialog.querySelector('#profile-exp-total').textContent='—';dialog.querySelector('#profile-username').value='';dialog.showModal();
    try{const firebase=await service,account=await firebase.currentAccount();if(version!==generation||!dialog.open)return;if(!account)throw new Error('Please sign in again.');dialog.querySelector('#profile-username').value=account.username===account.email?'':account.username;
      stopPoints=firebase.watchPoints(total=>dialog.querySelector('#profile-exp-total').textContent=total.toLocaleString('en-IN'),()=>{dialog.querySelector('#profile-exp-total').textContent='Unavailable';});
    }catch(error){dialog.querySelector('[data-name-status]').textContent=error.message;}
  });
  function busy(form,value){form.querySelectorAll('button,input').forEach(input=>input.disabled=value);}
  const nameForm=dialog.querySelector('#user-name-form');
  nameForm.addEventListener('submit',async event=>{event.preventDefault();const name=dialog.querySelector('#profile-username').value.trim(),status=dialog.querySelector('[data-name-status]');busy(nameForm,true);status.textContent='Saving…';try{await(await service).saveMyUsername(name);status.textContent='Username saved.';}catch(error){status.textContent=error.message;}finally{busy(nameForm,false);}});
  const passwordForm=dialog.querySelector('#user-password-form');
  passwordForm.addEventListener('submit',async event=>{
    event.preventDefault();const status=dialog.querySelector('[data-password-status]'),current=dialog.querySelector('#profile-current-password').value,next=dialog.querySelector('#profile-new-password').value;
    if(next!==dialog.querySelector('#profile-confirm-password').value){status.textContent='New passwords do not match.';return;}
    busy(passwordForm,true);status.textContent='Changing password…';
    try{await(await service).changeMyPassword(current,next);passwordForm.reset();status.textContent='Password changed.';}catch(error){status.textContent=error.message;}finally{busy(passwordForm,false);}
  });
  dialog.querySelector('[data-request-access]').addEventListener('click',async event=>{
    const button=event.currentTarget,status=dialog.querySelector('[data-request-status]');button.disabled=true;status.textContent='Sending…';
    try{await(await service).requestMoreAccess();status.textContent='Request sent to the administrator.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  window.addEventListener('cash-tool-auth-changed',()=>{closeMenu();if(dialog.open)dialog.close();});
})();
