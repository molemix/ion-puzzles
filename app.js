(() => {
  'use strict';
  const C=Chemistry,P=Puzzle;
  const $=id=>document.getElementById(id);
  const bank=$('bank'),board=$('board'),feedback=$('feedback');
  let taskIndex=0,pieces=[],bankIons=[],selected=null,locked=false,drag=null,nextId=1,previousBankKey='';
  const task=()=>C.tasks[taskIndex];
  const boardSize=()=>({width:board.clientWidth,height:board.clientHeight});
  function pathFor(charge){
    const n=Math.abs(charge),h=n*P.U,w=P.W;
    if(charge>0){
      let d=`M 12 0 H ${w}`;
      for(let j=0;j<n;j++){const y=j*P.U;d+=` C ${w-8} ${y+8}, ${w-18} ${y+16}, ${w-18} ${y+P.U/2} C ${w-18} ${y+26}, ${w-8} ${y+34}, ${w} ${y+P.U}`;}
      return d+` H 12 Q 0 ${h}, 0 ${h-12} V 12 Q 0 0, 12 0 Z`;
    }
    let d=`M 0 0 H ${w-18} V ${h} H 0`;
    for(let j=n-1;j>=0;j--){const y=j*P.U;d+=` C -8 ${y+34}, -18 ${y+26}, -18 ${y+P.U/2} C -18 ${y+16}, -8 ${y+8}, 0 ${y}`;}
    return d+' Z';
  }
  function svgFor(ion){
    const h=Math.abs(ion.charge)*P.U;
    const symbol=ion.symbol.replace(/\d+/g,n=>`<tspan baseline-shift="sub" font-size="14">${n}</tspan>`);
    const charge=(Math.abs(ion.charge)===1?'':Math.abs(ion.charge))+(ion.charge>0?'+':'−');
    const size=ion.symbol.length>3?20:23;
    return `<svg viewBox="-20 0 ${P.W+20} ${h}" aria-hidden="true"><path class="puzzle-path" d="${pathFor(ion.charge)}" fill="${ion.charge>0?'var(--cation)':'var(--anion)'}"/><text class="puzzle-label" style="font-size:${size}px" x="${ion.charge>0?45:37}" y="${h/2}" text-anchor="middle" dominant-baseline="central">${symbol}<tspan baseline-shift="super" font-size="13">${charge}</tspan></text></svg>`;
  }
  function ionName(ion){return ion.charge>0?'Катион '+ion.name:ion.name[0].toUpperCase()+ion.name.slice(1)+'-ион';}
  function clearFeedback(){feedback.hidden=true;feedback.className='feedback';board.classList.remove('wrong','correct');}
  function showFeedback(html,status){feedback.hidden=false;feedback.className='feedback '+(status==='correct'?'correct':'');feedback.innerHTML=html;}
  function renderTools(){
    const p=pieces.find(p=>p.id===selected);
    $('piece-tools').hidden=!p||locked;
    if(p){$('selected-name').innerHTML=C.ionHTML(C.byId[p.ion]);$('detach').disabled=P.component(pieces,p.id).length===1;}
  }
  function positionButtons(){
    for(const p of pieces){const button=board.querySelector(`[data-piece="${p.id}"]`);if(button){button.style.left=(p.x-20)+'px';button.style.top=p.y+'px';}}
  }
  function renderBoard(){
    const focusId=document.activeElement?.dataset?.piece;
    board.querySelectorAll('.piece').forEach(el=>el.remove());
    $('board-empty').hidden=pieces.length>0;
    for(const p of pieces){
      const ion=C.byId[p.ion],button=document.createElement('button');
      button.type='button';button.className='piece';button.dataset.piece=p.id;
      button.style.width=(P.W+20)+'px';button.style.height=P.height(p)+'px';
      button.style.left=(p.x-20)+'px';button.style.top=p.y+'px';
      button.setAttribute('aria-label',ionName(ion)+'. Стрелки — двигать; Enter — соединить; Delete — убрать.');
      button.setAttribute('aria-pressed',String(p.id===selected));
      button.disabled=locked;button.innerHTML=svgFor(ion);
      button.addEventListener('pointerdown',e=>startBoardDrag(e,p.id));
      button.addEventListener('keydown',e=>keyboardMove(e,p.id));
      button.addEventListener('click',e=>{if(e.detail===0&&!locked){selected=p.id;renderBoard();}});
      board.appendChild(button);
    }
    if(focusId)board.querySelector(`[data-piece="${focusId}"]`)?.focus({preventScroll:true});
    renderTools();
  }
  function loadTask(){
    pieces=[];selected=null;locked=false;clearFeedback();
    $('task-title').textContent='Собери '+task().name;
    $('task-number').textContent=(taskIndex+1)+' / '+C.tasks.length;
    $('check').hidden=false;$('next').hidden=true;$('next').textContent=taskIndex===C.tasks.length-1?'Завершить':'Дальше';
    for(let attempt=0;attempt<20;attempt++){
      bankIons=C.makeBank(task());
      if(bankIons.map(i=>i.id).sort().join('|')!==previousBankKey)break;
    }
    // Guarantee a different composition even if a random draw repeats.
    if(bankIons.map(i=>i.id).sort().join('|')===previousBankKey){
      const protectedIds=new Set([task().cat,'K','Ca']);
      const replacement=C.ions.find(i=>i.charge>0&&!bankIons.some(b=>b.id===i.id));
      const index=bankIons.findIndex(i=>i.charge>0&&!protectedIds.has(i.id));
      if(replacement&&index>=0)bankIons[index]=replacement;
    }
    previousBankKey=bankIons.map(i=>i.id).sort().join('|');bank.replaceChildren();
    for(const ion of bankIons){
      const button=document.createElement('button');button.type='button';button.className='ion';button.dataset.ion=ion.id;
      button.setAttribute('aria-label',ionName(ion)+'. Перетащи на поле или нажми, чтобы добавить.');
      button.innerHTML=svgFor(ion);
      button.addEventListener('pointerdown',e=>startBankDrag(e,ion));
      button.addEventListener('click',e=>{if(e.detail===0&&!locked)addIon(ion.id);});
      bank.appendChild(button);
    }
    bank.scrollTop=0;renderBoard();
  }
  function freeSpot(p,existing=pieces,separate=false){
    const {width,height}=boardSize();
    const preferred=C.byId[p.ion].charge>0?width/2-P.W:width/2;
    const xs=[preferred,24,width-P.W-16];
    for(let x=20;x<=width-P.W-10;x+=24)xs.push(x);
    for(const x of xs)for(let y=20;y<=height-P.height(p)-10;y+=P.U){
      const candidate={...p,x,y};
      if(P.within(candidate,width,height)&&!existing.some(q=>P.overlap(candidate,q)||(separate&&P.connected(candidate,q))))return candidate;
    }
    return null;
  }
  function addIon(ionId,position){
    if(locked)throw new Error('Задание уже выполнено.');
    if(!bankIons.some(i=>i.id===ionId))throw new Error('Этого иона нет в текущем банке.');
    let p={id:'p'+nextId++,ion:ionId,x:0,y:0};
    const size=boardSize();
    if(position){
      p.x=Math.max(20,Math.min(size.width-P.W-10,position.x));
      p.y=Math.max(10,Math.min(size.height-P.height(p)-10,position.y));
      pieces.push(p);P.snap(pieces,[p.id],size.width,size.height);
      if(pieces.some(q=>q!==p&&P.overlap(p,q))){pieces.pop();showFeedback('<p>Это место занято. Перетащи деталь на свободное место.</p>','incomplete');return null;}
    }else{
      const spot=freeSpot(p);if(!spot){showFeedback('<p>На поле мало места. Убери лишние детали.</p>','incomplete');return null;}
      p=spot;pieces.push(p);P.snap(pieces,[p.id],size.width,size.height);
    }
    selected=p.id;clearFeedback();renderBoard();return p;
  }
  function startBankDrag(e,ion){
    if(locked||drag||e.button!==0)return;
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    drag={kind:'bank',pointer:e.pointerId,ion,startX:e.clientX,startY:e.clientY,moved:false,source:e.currentTarget};
  }
  function startBoardDrag(e,id){
    if(locked||drag||e.button!==0)return;
    e.preventDefault();selected=id;clearFeedback();
    const group=P.component(pieces,id),button=e.currentTarget;
    button.setPointerCapture(e.pointerId);
    drag={kind:'board',pointer:e.pointerId,ids:group.map(p=>p.id),start:group.map(p=>({...p})),startX:e.clientX,startY:e.clientY,moved:false,source:button};
    board.querySelectorAll('.piece').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.piece===id));if(drag.ids.includes(b.dataset.piece))b.classList.add('dragging');});
    renderTools();
  }
  function pointerMove(e){
    if(!drag||drag.pointer!==e.pointerId)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    drag.moved=true;e.preventDefault();
    if(drag.kind==='bank'){
      if(!drag.ghost){const ghost=document.createElement('div');ghost.className='drag-ghost';ghost.style.width=(P.W+20)+'px';ghost.style.height=(Math.abs(drag.ion.charge)*P.U)+'px';ghost.innerHTML=svgFor(drag.ion);document.body.appendChild(ghost);drag.ghost=ghost;}
      drag.ghost.style.left=(e.clientX-(P.W+20)/2)+'px';drag.ghost.style.top=(e.clientY-Math.abs(drag.ion.charge)*P.U/2)+'px';
    }else{
      const {width,height}=boardSize();
      const minX=Math.min(...drag.start.map(p=>p.x)),maxX=Math.max(...drag.start.map(p=>p.x+P.W));
      const minY=Math.min(...drag.start.map(p=>p.y)),maxY=Math.max(...drag.start.map(p=>p.y+P.height(p)));
      const moveX=Math.max(20-minX,Math.min(width-10-maxX,dx)),moveY=Math.max(10-minY,Math.min(height-10-maxY,dy));
      for(const start of drag.start){const p=pieces.find(p=>p.id===start.id);p.x=start.x+moveX;p.y=start.y+moveY;}
      positionButtons();
    }
  }
  function pointerEnd(e,cancelled=false){
    if(!drag||drag.pointer!==e.pointerId)return;
    const ended=drag;drag=null;ended.ghost?.remove();
    if(ended.kind==='bank'){
      if(cancelled)return;
      if(!ended.moved){addIon(ended.ion.id);return;}
      const r=board.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
        addIon(ended.ion.id,{x:e.clientX-r.left-P.W/2,y:e.clientY-r.top-Math.abs(ended.ion.charge)*P.U/2});
      }
    }else{
      const {width,height}=boardSize();
      if(cancelled){for(const old of ended.start)Object.assign(pieces.find(p=>p.id===old.id),old);}
      else if(ended.moved){
        P.snap(pieces,ended.ids,width,height);
        if(pieces.some(p=>ended.ids.includes(p.id)&&pieces.some(q=>!ended.ids.includes(q.id)&&P.overlap(p,q))))for(const old of ended.start)Object.assign(pieces.find(p=>p.id===old.id),old);
      }
      renderBoard();
    }
  }
  function removeSelected(){if(locked||!selected)return;pieces=pieces.filter(p=>p.id!==selected);selected=null;clearFeedback();renderBoard();}
  function detachSelected(){
    if(locked||!selected)return;
    const p=pieces.find(p=>p.id===selected),spot=freeSpot(p,pieces.filter(q=>q!==p),true);
    if(!spot){showFeedback('<p>Не хватает места для отдельной детали. Можно убрать её из сборки.</p>','incomplete');return;}
    Object.assign(p,spot);clearFeedback();renderBoard();
  }
  function keyboardMove(e,id){
    if(locked)return;selected=id;
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();return;}
    if(e.key==='Escape'){selected=null;renderBoard();return;}
    const group=P.component(pieces,id),before=group.map(p=>({...p})),{width,height}=boardSize();
    const moves={ArrowLeft:[-14,0],ArrowRight:[14,0],ArrowUp:[0,-14],ArrowDown:[0,14]};
    if(moves[e.key]){
      e.preventDefault();const [dx,dy]=moves[e.key];
      for(const p of group){p.x+=dx;p.y+=dy;}
      if(group.some(p=>!P.within(p,width,height)))for(const p of before)Object.assign(pieces.find(q=>q.id===p.id),p);
      clearFeedback();renderBoard();
    }else if(e.key==='Enter'||e.key===' '){
      e.preventDefault();P.snap(pieces,group.map(p=>p.id),width,height);
      if(group.some(p=>pieces.some(q=>!group.includes(q)&&P.overlap(p,q))))for(const p of before)Object.assign(pieces.find(q=>q.id===p.id),p);
      clearFeedback();renderBoard();
    }
  }
  function check(){
    if(taskIndex>=C.tasks.length)return {status:'completed'};
    if(drag)return {status:'dragging'};
    const result=P.inspect(pieces,task());
    if(result.status==='correct'){
      locked=true;selected=null;board.classList.remove('wrong');board.classList.add('correct');
      showFeedback('<p class="status">Правильно!</p><p>'+C.formulaHTML(result.formula)+' — '+result.name+'</p><p class="equation">'+C.dissociationHTML(task())+'</p>','correct');
      $('check').hidden=true;$('next').hidden=false;bank.querySelectorAll('button').forEach(b=>b.disabled=true);renderBoard();
    }else{
      board.classList.remove('correct');board.classList.add('wrong');
      const detail=result.name?'<p>'+C.formulaHTML(result.formula)+' — '+result.name+'</p>':'';
      showFeedback('<p class="status">'+(['wrong','mixed','excess'].includes(result.status)?'Неправильно':'Сборка не завершена')+'</p>'+detail+'<p>'+(result.status==='wrong'?'Измени сборку и проверь ещё раз.':result.message)+'</p>',result.status);
    }
    return result;
  }
  $('check').addEventListener('click',check);
  $('remove').addEventListener('click',removeSelected);
  $('detach').addEventListener('click',detachSelected);
  $('next').addEventListener('click',()=>{
    if(!locked)return;
    if(++taskIndex===C.tasks.length){$('exercise').hidden=true;$('finish').hidden=false;$('restart').focus();}
    else{loadTask();$('task-title').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  });
  $('restart').addEventListener('click',()=>{taskIndex=0;$('finish').hidden=true;$('exercise').hidden=false;loadTask();});
  window.addEventListener('pointermove',pointerMove,{passive:false});
  window.addEventListener('pointerup',e=>pointerEnd(e));
  window.addEventListener('pointercancel',e=>pointerEnd(e,true));
  window.addEventListener('blur',()=>{if(drag)pointerEnd({pointerId:drag.pointer},true);});
  const observer=new ResizeObserver(()=>{
    if(drag)return;
    const {width,height}=boardSize();
    if(!width)return;
    const seen=new Set();
    for(const p of pieces){
      if(seen.has(p.id))continue;
      const group=P.component(pieces,p.id);group.forEach(q=>seen.add(q.id));
      const left=Math.min(...group.map(q=>q.x)),right=Math.max(...group.map(q=>q.x+P.W));
      const top=Math.min(...group.map(q=>q.y)),bottom=Math.max(...group.map(q=>q.y+P.height(q)));
      const dx=left<20?20-left:right>width-10?width-10-right:0;
      const dy=top<10?10-top:bottom>height-10?height-10-bottom:0;
      group.forEach(q=>{q.x+=dx;q.y+=dy;});
    }
    positionButtons();
  });
  observer.observe(board);
  loadTask();
  // Optional browser agent access uses the same actions as the visible controls.
  const context=document.modelContext;
  if(context?.registerTool){
    const lifecycle=new AbortController();
    const state=()=>({task:taskIndex<C.tasks.length?task().name:null,index:Math.min(taskIndex+1,C.tasks.length),finished:taskIndex>=C.tasks.length,locked,bank:bankIons.map(i=>i.id),pieces:pieces.map(p=>({...p}))});
    const definitions=[
      {name:'get_ion_puzzle_state',description:'Read the current exercise, available ions and placed pieces.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:state},
      {name:'add_ion_puzzle_pieces',description:'Place copies of available ions on the field. Does not check the answer.',inputSchema:{type:'object',properties:{ions:{type:'array',items:{type:'string'},minItems:1,maxItems:12}},required:['ions'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{
        if(!input||!Array.isArray(input.ions)||input.ions.length<1||input.ions.length>12||input.ions.some(id=>!bankIons.some(i=>i.id===id)))throw new Error('Укажи от 1 до 12 ионов из текущего банка.');
        if(locked)throw new Error('Задание уже выполнено.');
        const added=[];for(const id of input.ions){const p=addIon(id);if(p)added.push(p.id);}return {added,state:state()};
      }},
      {name:'check_ion_puzzle',description:'Check the current connected puzzle and display the result. A correct answer completes and locks the exercise.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:check}
    ];
    for(const definition of definitions){try{Promise.resolve(context.registerTool(definition,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
