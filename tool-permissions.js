(() => {
  const service=import('./firebase-service.js?v=20261102c');
  const restrictedTools=['margin','loan','challan','income'];
  const noAccess={margin:false,loan:false,challan:false,income:false};
  let allowed={...noAccess},stop=()=>{},generation=0,loading=false;
  const status=document.querySelector('#tool-access-status');
  function applyAccess(next) {
    allowed=next;
    for(const tool of restrictedTools) {
      document.querySelector('[data-open-tool="'+tool+'"]').hidden=!next[tool];
      if(!next[tool]) {
        const panel=document.querySelector('#tool-'+tool),frame=panel.querySelector('iframe');
        if(!panel.hidden){panel.hidden=true;toolMenu.hidden=false;sessionStorage.removeItem(toolSessionKey);}
        if(frame?.hasAttribute('src'))frame.removeAttribute('src');
      }
    }
  }
  async function refreshAccess() {
    const version=++generation;stop();applyAccess({...noAccess});
    try {
      const firebase=await service;
      if(version!==generation)return;
      stop=firebase.watchAllowedTools(next=>{if(version===generation)applyAccess(next);},()=>{if(version===generation)applyAccess({...noAccess});});
    }catch{applyAccess({...noAccess});}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-open-tool]');
    if(button && restrictedTools.includes(button.dataset.openTool) && !allowed[button.dataset.openTool]) {
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  restrictedTools.forEach(tool=>{
    const panel=document.querySelector('#tool-'+tool);
    new MutationObserver(()=>{if(!allowed[tool]&&!panel.hidden)applyAccess(allowed);}).observe(panel,{attributes:true,attributeFilter:['hidden']});
  });
  window.addEventListener('cash-tool-auth-changed',refreshAccess);
  refreshAccess();
  async function loadUsers() {
    if(loading)return;loading=true;
    const list=document.querySelector('#tool-access-users'),refresh=document.querySelector('#refresh-tool-access');
    refresh.disabled=true;list.replaceChildren();status.textContent='Loading users…';
    try {
      const firebase=await service,owner=await firebase.currentAdmin();
      if(!owner)throw new Error('Sign in with your approved admin email to manage tool access.');
      const users=await firebase.listToolAccess();
      for(const user of users) {
        const row=document.createElement('div');row.className='tool-access-row';
        const email=document.createElement('strong');email.textContent=user.email;row.append(email);
        const fields={};
        for(const [tool,name] of [['margin','Margin Finder'],['loan','Loan Schedule'],['challan','Slip Creator'],['income','Income Assessment']]) {
          const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';
          input.checked=user.uid===owner.uid || user[tool]===true;input.disabled=user.uid===owner.uid;
          label.append(input,document.createTextNode(name));fields[tool]=input;row.append(label);
        }
        if(user.uid===owner.uid){const note=document.createElement('span');note.textContent='Admin · full access';row.append(note);}
        else {
          const save=document.createElement('button');save.type='button';save.textContent='Save access';row.append(save);
          save.addEventListener('click',async()=>{
            save.disabled=true;Object.values(fields).forEach(input=>input.disabled=true);status.textContent='Saving…';
            try{await firebase.saveToolAccess(user.uid,Object.fromEntries(restrictedTools.map(tool=>[tool,fields[tool].checked])));status.textContent='Access saved for '+user.email+'.';}
            catch(error){status.textContent=error.message;}
            finally{save.disabled=false;Object.values(fields).forEach(input=>input.disabled=false);}
          });
        }
        list.append(row);
      }
      status.textContent=users.length?'Choose permissions, then save each user.':'No users tracked yet. Users appear after signing in.';
    }catch(error){status.textContent=error.message;}
    finally{loading=false;refresh.disabled=false;}
  }
  document.querySelector('[data-admin-tab="permissions"]').addEventListener('click',loadUsers);
  document.querySelector('#refresh-tool-access').addEventListener('click',loadUsers);
})();
