(() => {
  const tabs=[...document.querySelectorAll('[data-admin-tab]')],tabBar=document.querySelector('.admin-tabs');
  const picker=document.createElement('div');picker.className='admin-section-picker';
  const label=document.createElement('label');label.htmlFor='admin-section-select';label.textContent='Manage';
  const select=document.createElement('select');select.id='admin-section-select';
  const names={approvals:'Access requests',margins:'Business margins',submissions:'Issue submissions',notice:'Notice board',activity:'Accounts & logs',permissions:'Tool access',account:'My account'};
  for(const tab of tabs)select.append(new Option(names[tab.dataset.adminTab],tab.dataset.adminTab));
  const pending=document.createElement('button');pending.type='button';pending.className='admin-pending-link';pending.hidden=true;
  pending.addEventListener('click',()=>document.querySelector('[data-admin-tab="approvals"]').click());
  picker.append(label,select,pending);tabBar.before(picker);
  select.addEventListener('change',()=>tabs.find(tab=>tab.dataset.adminTab===select.value)?.click());
  function sync() {
    const tab=tabs.find(item=>item.getAttribute('aria-selected')==='true');if(tab)select.value=tab.dataset.adminTab;
    const count=document.querySelector('#approval-pending-count');
    const value=Number(count.textContent)||0;pending.hidden=count.hidden||value===0;
    pending.textContent=value+' pending request'+(value===1?'':'s');
    select.querySelector('option[value="approvals"]').textContent='Access requests'+(value?' ('+value+')':'');
  }
  const observer=new MutationObserver(sync);tabs.forEach(tab=>observer.observe(tab,{attributes:true,attributeFilter:['aria-selected']}));
  observer.observe(document.querySelector('#approval-pending-count'),{attributes:true,childList:true,subtree:true,characterData:true});
  sync();
})();
