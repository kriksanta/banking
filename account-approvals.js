(() => {
  const service=import('./firebase-service.js?v=20261101a');
  const list=document.querySelector('#approval-requests-list'),status=document.querySelector('#approval-requests-status');
  const badge=document.querySelector('#approval-pending-count'),header=document.querySelector('#open-firebase-admin');
  let stop=()=>{},generation=0;
  function clear() {stop();stop=()=>{};list.replaceChildren();badge.hidden=true;header.removeAttribute('data-pending');}
  function showRequests(rows,firebase) {
    const pending=rows.filter(row=>row.status==='pending').length;
    badge.textContent=pending;badge.hidden=pending===0;
    if(pending)header.dataset.pending=String(pending);else header.removeAttribute('data-pending');
    status.textContent=pending?pending+' account'+(pending===1?' is':'s are')+' waiting for your approval.':'No pending access requests.';
    list.replaceChildren();
    rows.sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||b.date.localeCompare(a.date));
    for(const account of rows) {
      const row=document.createElement('article');row.className='approval-request-row';
      const detail=document.createElement('div'),email=document.createElement('strong'),meta=document.createElement('p');
      email.textContent=account.email;meta.textContent=account.status.charAt(0).toUpperCase()+account.status.slice(1)+(account.date?' · '+new Date(account.date).toLocaleString('en-IN'):'');
      detail.append(email,meta);row.append(detail);
      const controls=document.createElement('div');controls.className='approval-controls';
      for(const [next,label] of [['approved','Approve'],['blocked','Block']]) {
        if(account.status===next)continue;
        const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.approval=next;
        button.setAttribute('aria-label',label+' '+account.email);
        button.addEventListener('click',async()=>{
          controls.querySelectorAll('button').forEach(item=>item.disabled=true);status.textContent='Saving access…';
          try{await firebase.setAccountAccess(account.id,next);}
          catch(error){status.textContent=error.message;controls.querySelectorAll('button').forEach(item=>item.disabled=false);}
        });controls.append(button);
      }
      row.append(controls);list.append(row);
    }
  }
  async function connect() {
    const version=++generation;clear();
    try {
      const firebase=await service,account=await firebase.currentAccount();if(version!==generation)return;
      if(account?.admin) {
        stop=firebase.watchApprovalRequests(rows=>{if(version===generation)showRequests(rows,firebase);},error=>{status.textContent=error.message;});
      }else if(account) {
        stop=firebase.watchMyAccountAccess(access=>{
          if(version!==generation || access==='approved')return;
          Object.values(toolPanels).forEach(panel=>panel.hidden=true);
          document.querySelector('#admin-panel').hidden=true;showLogin();
          const error=document.querySelector('#login-error');error.textContent=access==='blocked'?'Your access has been blocked. Please contact the administrator.':'Please wait for admin approval.';error.hidden=false;
        },()=>{showLogin();});
      }else status.textContent='Sign in as admin to view requests.';
    }catch(error){status.textContent=error.message;}
  }
  window.addEventListener('cash-tool-auth-changed',connect);
  document.querySelector('#refresh-approval-requests').addEventListener('click',connect);
  connect();
})();
