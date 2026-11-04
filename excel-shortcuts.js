(() => {
  const root=document.querySelector('#excel-shortcut-finder');if(!root)return;
  root.innerHTML=`<div class="excel-finder-heading"><span class="excel-badge" aria-hidden="true">X</span><div><h2>Excel shortcut finder</h2><p>Find the keys for what you want to do.</p></div></div>
    <section class="excel-preview" hidden aria-label="Selected shortcut"><span class="excel-preview-category"></span><h3></h3><div class="excel-preview-keys"></div><div class="excel-preview-bottom"><small class="excel-source"></small><button type="button" class="excel-copy">Copy shortcut</button></div><p class="excel-copy-status" role="status"></p></section>
    <div class="excel-search-fields"><label>Search<input type="search" class="excel-search" placeholder="Try bold, print, Ctrl + Shift…" autocomplete="off"></label><label>Category<select class="excel-category"><option value="">All categories</option></select></label></div>
    <div class="excel-list-heading"><span class="excel-count" role="status">Loading shortcuts…</span><span>Windows · Excel</span></div>
    <div class="excel-results"></div><button type="button" class="excel-more" hidden>Show more</button>`;
  const search=root.querySelector('.excel-search'),category=root.querySelector('.excel-category'),results=root.querySelector('.excel-results'),count=root.querySelector('.excel-count'),more=root.querySelector('.excel-more'),preview=root.querySelector('.excel-preview');
  let rows=[],selected=null,limit=30;
  const normal=text=>text.toLowerCase().replace(/control/g,'ctrl').replace(/page\s*down/g,'pgdn').replace(/page\s*up/g,'pgup').replace(/arrow\s*down/g,'↓').replace(/arrow\s*up/g,'↑').replace(/arrow\s*left/g,'←').replace(/arrow\s*right/g,'→').replace(/[^\p{L}\p{N}↑↓←→%$@#!&*=;{}\[\]]+/gu,' ').trim();
  function keyCaps(value){
    const fragment=document.createDocumentFragment();
    value.split(' OR ').forEach((alternative,altIndex)=>{
      if(altIndex){const or=document.createElement('span');or.className='excel-key-separator';or.textContent='or';fragment.append(or);}
      alternative.split(/,\s*/).forEach((sequence,index)=>{
        if(index){const then=document.createElement('span');then.className='excel-key-separator';then.textContent='then';fragment.append(then);}
        const tokens=sequence.split(/\s+\+\s+/);
        tokens.forEach((token,keyIndex)=>{
          if(keyIndex){const plus=document.createElement('span');plus.className='excel-key-separator';plus.textContent='+';fragment.append(plus);}
          // The source separates later Ribbon keys with spaces after a comma.
          const keys=index?token.trim().split(/\s+/):[token.trim()];
          keys.forEach((key,keyPosition)=>{if(keyPosition){const then=document.createElement('span');then.className='excel-key-separator';then.textContent='then';fragment.append(then);}const cap=document.createElement('kbd');cap.textContent=key;fragment.append(cap);});
        });
      });
    });
    return fragment;
  }
  function choose(row){
    selected=row;preview.hidden=false;preview.querySelector('h3').textContent=row.action;
    preview.querySelector('.excel-preview-category').textContent=row.category;
    preview.querySelector('.excel-preview-keys').replaceChildren(keyCaps(row.keys));
    preview.querySelector('.excel-source').textContent='Your shortcut guide · page '+row.page;
    preview.querySelector('.excel-copy-status').textContent='';
    preview.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
  }
  function render(){
    const terms=normal(search.value).split(' ').filter(Boolean);
    const found=rows.filter(row=>(!category.value||row.category===category.value)&&terms.every(term=>normal(row.action+' '+row.keys+' '+row.category).includes(term)));
    count.textContent=found.length+' shortcut'+(found.length===1?'':'s');results.replaceChildren();
    found.slice(0,limit).forEach(row=>{
      const button=document.createElement('button');button.type='button';button.className='excel-result';
      const text=document.createElement('span'),action=document.createElement('strong'),tag=document.createElement('small'),keys=document.createElement('span');
      action.textContent=row.action;tag.textContent=row.category;text.append(action,tag);keys.className='excel-result-keys';keys.append(keyCaps(row.keys));button.append(text,keys);
      button.addEventListener('click',()=>choose(row));results.append(button);
    });
    if(!found.length){const empty=document.createElement('p');empty.className='excel-empty';empty.textContent='No matching shortcuts. Try a different action or category.';results.append(empty);}
    more.hidden=found.length<=limit;more.textContent='Show more ('+Math.max(0,found.length-limit)+' remaining)';
  }
  function filter(){limit=30;preview.hidden=true;selected=null;render();}
  search.addEventListener('input',filter);category.addEventListener('change',filter);
  more.addEventListener('click',()=>{limit+=30;render();});
  search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}});
  root.querySelector('.excel-copy').addEventListener('click',async()=>{if(!selected)return;try{await navigator.clipboard.writeText(selected.keys);preview.querySelector('.excel-copy-status').textContent='Shortcut copied.';}catch{preview.querySelector('.excel-copy-status').textContent='Select the keys above to copy them.';}});
  fetch('./excel-shortcuts.json').then(response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
    rows=data;[...new Set(rows.map(row=>row.category))].sort().forEach(name=>category.append(new Option(name,name)));render();
  }).catch(()=>{count.textContent='Shortcuts could not be loaded. Please refresh.';});
})();
