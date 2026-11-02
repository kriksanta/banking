(() => {
  const service=import('./firebase-service.js?v=20261102c');
  let generation=0;
  async function refresh(){
    const version=++generation;
    try{
      const firebase=await service,account=await firebase.currentAccount();
      if(version!==generation||!account?.approved)return;
      await firebase.awardPoints('daily');
    }catch(error){/* Daily rewards retry on the next visit; EXP is shown in Settings. */}
  }
  const toolIds=['denomination','waiver','loan','margin'];
  for(const tool of toolIds){
    const panel=document.querySelector('#tool-'+tool),button=document.createElement('button');
    button.type='button';button.className='points-complete';button.textContent='Calculation complete · +2 points';
    const feedback=document.createElement('p');feedback.className='points-feedback';feedback.setAttribute('role','status');
    if(tool==='margin')button.textContent='Lookup complete · +2 points';
    panel.append(button,feedback);
    button.addEventListener('click',async()=>{
      const inputs=[...panel.querySelectorAll('input:not([type=hidden]):not([type=checkbox]),select')];
      if(inputs.some(input=>!input.checkValidity())){inputs.find(input=>!input.checkValidity()).reportValidity();return;}
      const positive=id=>Number(document.getElementById(id)?.value)>0;
      let ready=tool==='denomination'? [...panel.querySelectorAll('.count')].some(input=>Number(input.value)>0)
        :tool==='waiver'?positive('waiver-pos')&&document.querySelector('#waiver-percent').value!==''
        :tool==='loan'?!document.querySelector('#loan-result').hidden
        :!document.querySelector('#margin-result')?.hidden&&!!document.querySelector('#margin-result')?.textContent.trim();
      if(!ready){feedback.textContent='Complete a calculation first.';return;}
      const signature=JSON.stringify(inputs.map(input=>[input.id||input.name||input.dataset.value||input.className,input.value]));
      button.disabled=true;
      try{const earned=await(await service).awardPoints('calculation',tool,signature);feedback.textContent=earned?'+2 points earned!':'Points already earned for this calculation today.';}
      catch(error){feedback.textContent='Could not save points. Please try again.';}
      finally{button.disabled=false;}
    });
  }
  window.addEventListener('cash-tool-auth-changed',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  // Keep remembered sessions eligible for the next day's bonus without signing out.
  setInterval(()=>{if(!document.hidden)refresh();},60000);
  refresh();
})();
