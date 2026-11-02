const tool=new URLSearchParams(location.search).get('tool')==='income'?'income':'challan';
let denied=false;
function block() {
  if(denied)return;denied=true;
  const show=()=>{
    const main=document.createElement('main');main.style.cssText='display:block;max-width:480px;margin:60px auto;padding:24px;font:16px Arial,sans-serif';
    const title=document.createElement('h1');title.textContent='Access required';
    const text=document.createElement('p');text.textContent='Log in with an account approved by the administrator to use this tool.';
    main.append(title,text);document.body.replaceChildren(main);document.documentElement.removeAttribute('data-tool-access');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
}
import('./firebase-service.js?v=20261102c').then(({watchAllowedTools})=>watchAllowedTools(access=>{
  if(!access[tool])block();
  else if(denied)location.reload();
  else document.documentElement.removeAttribute('data-tool-access');
},block)).catch(block);
