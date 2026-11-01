(() => {
  const adminPanel=document.querySelector('#admin-panel'),adminSwitch=document.querySelector('#open-firebase-admin');
  let restoring=false,started=false,lastPage=null;
  const marker='cashToolNavigation';
  let restoreTarget=history.state?.[marker] && history.state.route.page!=='login'?history.state.route:null;
  function currentPage() {
    if(appShell.hidden)return {page:'login'};
    const dialog=[...document.querySelectorAll('dialog[open]')].find(item=>item.id);
    let route;
    if(!adminPanel.hidden)route={page:'admin',tab:document.querySelector('[data-admin-tab][aria-selected="true"]')?.dataset.adminTab||'dashboard'};
    else {const tool=Object.keys(toolPanels).find(key=>!toolPanels[key].hidden);route={page:tool||'home'};}
    if(dialog)route.dialog=dialog.id;
    return route;
  }
  function save(route,depth,replace=false) {
    const value={[marker]:true,route,depth};
    history[replace?'replaceState':'pushState'](value,'');lastPage=JSON.stringify(route);
  }
  function record() {
    if(restoring)return;
    const route=currentPage(),key=JSON.stringify(route);
    document.body.classList.toggle('login-visible',route.page==='login');
    document.body.classList.toggle('tool-view',Object.prototype.hasOwnProperty.call(toolPanels,route.page));
    if(restoreTarget && route.page!=='login') {
      const target=restoreTarget;
      const button=toolPanels[target.page]?document.querySelector('[data-open-tool="'+target.page+'"]'):null;
      if(button?.hidden && route.page==='home')return;
      restoreTarget=null;
      if(!button?.hidden){apply(target);save(currentPage(),history.state?.depth||0,true);return;}
    }
    if(lastPage===key)return;
    if(!started){
      started=true;
      // Preserve an existing in-app history entry on a refresh until auth restores.
      if(history.state?.[marker] && route.page==='login'){lastPage=key;return;}
    }
    if(route.page==='login'){save(route,0,true);return;}
    if(!history.state?.[marker] || history.state.route.page==='login') {
      save({page:'home'},0,true);
      if(route.page!=='home')save(route,1);
      return;
    }
    save(route,(history.state.depth||0)+1);
  }
  function apply(route) {
    // Browser history must never bypass login or account approval.
    if(appShell.hidden)return;
    restoring=true;
    try {
      document.querySelectorAll('dialog[open]').forEach(dialog=>{if(dialog.id!==route.dialog)dialog.close();});
      if(!adminPanel.hidden && route.page!=='admin')adminSwitch.click();
      if(route.page==='admin') {
        if(adminSwitch.hidden || appShell.dataset.firebaseAdmin!=='true')route={page:'home'};
        else {
          if(adminPanel.hidden)adminSwitch.click();
          const tab=[...document.querySelectorAll('[data-admin-tab]')].find(item=>item.dataset.adminTab===route.tab);
          tab?.click();
        }
      }
      if(route.page!=='admin') {
        Object.values(toolPanels).forEach(panel=>panel.hidden=true);toolMenu.hidden=false;sessionStorage.removeItem(toolSessionKey);
        if(toolPanels[route.page]) {
          const button=document.querySelector('[data-open-tool="'+route.page+'"]');
          if(button && !button.hidden)button.click();
        }
      }
      if(route.dialog){const dialog=document.getElementById(route.dialog);if(dialog?.tagName==='DIALOG'&&!dialog.open)dialog.showModal();}
      history.replaceState({...history.state,route:currentPage()},'');lastPage=JSON.stringify(currentPage());
      document.body.classList.toggle('tool-view',Object.prototype.hasOwnProperty.call(toolPanels,currentPage().page));
      window.scrollTo({top:0,behavior:'auto'});
    }finally{queueMicrotask(()=>{restoring=false;});}
  }
  window.addEventListener('popstate',event=>{
    if(event.state?.[marker])apply(event.state.route);
  });
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-back-to-menu],[data-admin-dashboard-back]'))return;
    if(history.state?.[marker] && history.state.depth>0){event.preventDefault();event.stopImmediatePropagation();history.back();}
  },true);
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;record();});
  });
  observer.observe(appShell,{subtree:true,attributes:true,attributeFilter:['hidden','aria-selected']});
  document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  record();

  const fullscreen=document.querySelector('#mobile-fullscreen');
  fullscreen.addEventListener('click',async()=>{
    try {
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
      else document.querySelector('#install-help').showModal();
    }catch{document.querySelector('#install-help').showModal();}
  });
  document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Full screen'));
  // Request immersive mode during the user's tap, before asynchronous sign-in.
  function enterMobileFullscreen(){
    if(!matchMedia('(max-width:640px), (pointer:coarse)').matches||document.fullscreenElement||!document.fullscreenEnabled)return;
    document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
  }
  document.querySelector('#login-form').addEventListener('submit',enterMobileFullscreen,true);

  const header=document.querySelector('.app-header');
  new ResizeObserver(()=>document.documentElement.style.setProperty('--cash-header-offset',(header.offsetHeight+(parseFloat(getComputedStyle(header).top)||0))+'px')).observe(header);
})();
