(() => {
  const service=import('./firebase-service.js?v=20261102c');
  const panel=document.querySelector('#admin-panel'),grid=document.querySelector('#admin-hub-grid');
  const paths={
    approvals:'M9 11l2 2 4-4M8 4h8l2 2v15H6V6l2-2zM9 4V2h6v2',
    margins:'M4 20V10m5 10V6m5 14v-9m5 9V3M2 22h20',
    submissions:'M4 4h16v12H9l-5 4V4zM8 8h8m-8 4h5',
    notice:'M4 11l15-6v14L4 13v-2zM7 14l2 7h3l-2-6M21 9v6',
    users:'M16 21v-3a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3m13-13a4 4 0 0 1 0 8m3 5v-3a4 4 0 0 0-2-3M14 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    activity:'M5 3h14v18H5V3zM8 7h8m-8 5h8m-8 5h5',
    permissions:'M12 3l8 4v6c0 5-8 9-8 9S4 18 4 13V7l8-4zM9 12l2 2 4-4',
    account:'M5 21v-2a7 7 0 0 1 14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    tools:'M3 10l9-7 9 7v11h-7v-7h-4v7H3V10z'
  };
  const sections=[['approvals','Access requests'],['margins','Business margins'],['submissions','Ticket management'],['notice','Announcement'],['users','User'],['activity','Logs'],['permissions','Tool access'],['account','My account'],['tools','User tools']];
  const names=Object.fromEntries(sections);
  for(const [key,name] of sections){
    const card=document.createElement('button');card.type='button';card.className='admin-hub-card';card.dataset.adminOpen=key;
    const icon=document.createElement('span');icon.className='admin-hub-icon';icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg viewBox="0 0 24 24"><path d="'+paths[key]+'"/></svg>';
    const label=document.createElement('span');label.textContent=name;card.append(icon,label);
    if(key==='approvals'){const badge=document.createElement('span');badge.id='admin-hub-pending';badge.className='admin-hub-pending';badge.hidden=true;card.append(badge);}
    card.addEventListener('click',()=>{if(key==='tools')document.querySelector('#open-firebase-admin').click();else document.querySelector('[data-admin-tab="'+key+'"]').click();});
    grid.append(card);
  }
  // Counts and login events are shown on separate pages.
  const usersContent=document.querySelector('#admin-users-content');
  usersContent.append(document.querySelector('.account-metrics'),document.querySelector('.activity-note'));
  document.querySelector('.activity-note').textContent='Counts update every 30 seconds while this page is open. Existing accounts appear after signing in.';
  document.querySelector('#admin-activity [id="account-logs"]').previousElementSibling.textContent='Recent login activity';
  const tabs=[...document.querySelectorAll('[data-admin-tab]')];
  function sync(){
    const selected=tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.dataset.adminTab||'dashboard';
    const isHome=selected==='dashboard';panel.dataset.hubView=isHome?'home':'section';
    document.body.classList.toggle('admin-section-view',!panel.hidden&&!isHome);
    document.querySelector('.admin-section-toolbar').hidden=isHome;
    document.querySelector('#admin-title').textContent=isHome?'Admin dashboard':names[selected]||'Admin';
    const count=document.querySelector('#approval-pending-count'),badge=document.querySelector('#admin-hub-pending');
    badge.textContent=count.textContent;badge.hidden=count.hidden||Number(count.textContent)===0;
  }
  const observer=new MutationObserver(sync);observer.observe(panel,{attributes:true,attributeFilter:['hidden']});tabs.forEach(tab=>observer.observe(tab,{attributes:true,attributeFilter:['aria-selected']}));
  observer.observe(document.querySelector('#approval-pending-count'),{attributes:true,childList:true,subtree:true,characterData:true});
  document.querySelector('[data-admin-dashboard-back]').addEventListener('click',()=>document.querySelector('[data-admin-tab="dashboard"]').click());
  let loading=false;
  async function loadUsers(){
    if(loading)return;loading=true;
    const list=document.querySelector('#admin-user-directory');list.replaceChildren();
    try{const firebase=await service,users=await firebase.listToolAccess();
      for(const user of users){const row=document.createElement('div');row.className='admin-account-row';const email=document.createElement('strong');email.textContent=user.email;row.append(email);list.append(row);}
    }catch(error){const text=document.createElement('p');text.textContent=error.message;list.append(text);}
    finally{loading=false;}
  }
  document.querySelector('[data-admin-tab="users"]').addEventListener('click',loadUsers);
  document.querySelector('#refresh-user-accounts').addEventListener('click',loadUsers);
  window.addEventListener('cash-tool-auth-changed',async()=>{try{if(!await(await service).currentAdmin())document.querySelector('#admin-user-directory').replaceChildren();}catch{}});
  sync();
})();
