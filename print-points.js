(() => {
  const service=import('./firebase-service.js?v=20261102c');
  const tool=new URLSearchParams(location.search).get('tool')==='income'?'income':'challan';
  const button=document.querySelector(tool==='income'?'#ia-print':'#print');
  if(!button)return;
  button.addEventListener('click',()=>{
    const inputs=[...document.querySelectorAll('input:not([type=password]):not([type=hidden]),select,textarea')];
    if(!inputs.some(input=>input.type==='number'&&Number(input.value)>0)||inputs.some(input=>!input.checkValidity()))return;
    const signature=JSON.stringify(inputs.map(input=>[input.id,input.value]));
    service.then(firebase=>firebase.awardPoints('calculation',tool,signature)).catch(()=>{});
  });
})();
