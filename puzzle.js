(function (root) {
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./chemistry.js'):root.Chemistry;
  const W=112,U=42;
  const ion=p=>C.byId[p.ion];
  const height=p=>Math.abs(ion(p).charge)*U;
  function connected(a,b){
    if(ion(a).charge*ion(b).charge>=0)return false;
    const cat=ion(a).charge>0?a:b,an=cat===a?b:a;
    return Math.abs(cat.x+W-an.x)<.5&&Math.abs((cat.y-an.y)/U-Math.round((cat.y-an.y)/U))<.01&&Math.min(cat.y+height(cat),an.y+height(an))-Math.max(cat.y,an.y)>=U-.5;
  }
  function component(pieces,id){
    const ids=new Set([id]);let changed=true;
    while(changed){changed=false;for(const p of pieces)if(!ids.has(p.id)&&pieces.some(q=>ids.has(q.id)&&connected(p,q))){ids.add(p.id);changed=true;}}
    return pieces.filter(p=>ids.has(p.id));
  }
  function overlap(a,b){
    if(connected(a,b))return false;
    return Math.min(a.x+W,b.x+W)-Math.max(a.x,b.x)>1&&Math.min(a.y+height(a),b.y+height(b))-Math.max(a.y,b.y)>1;
  }
  function within(p,width,boardHeight){return p.x>=20&&p.x+W<=width-10&&p.y>=10&&p.y+height(p)<=boardHeight-10;}
  function closed(pieces){return pieces.every(p=>{
    const covered=pieces.filter(q=>connected(p,q)).reduce((sum,q)=>sum+Math.min(p.y+height(p),q.y+height(q))-Math.max(p.y,q.y),0);
    return Math.abs(covered-height(p))<.5;
  });}
  function snap(pieces,movingIds,width,boardHeight){
    const moving=pieces.filter(p=>movingIds.includes(p.id)),fixed=pieces.filter(p=>!movingIds.includes(p.id));
    const options=[];
    for(const p of moving)for(const q of fixed){
      if(ion(p).charge*ion(q).charge>=0)continue;
      const dx=(ion(p).charge>0?q.x-W:q.x+W)-p.x;
      if(Math.abs(dx)>34)continue;
      const np=Math.abs(ion(p).charge),nq=Math.abs(ion(q).charge);
      for(let offset=1-np;offset<nq;offset++){
        const dy=q.y+offset*U-p.y;
        if(Math.abs(dy)>26)continue;
        const shifted=moving.map(m=>({...m,x:m.x+dx,y:m.y+dy}));
        if(shifted.every(m=>within(m,width,boardHeight))&&!shifted.some(m=>fixed.some(f=>overlap(m,f))))options.push({dx,dy,distance:Math.hypot(dx,dy)});
      }
    }
    options.sort((a,b)=>a.distance-b.distance);
    if(!options.length)return false;
    for(const p of moving){p.x+=options[0].dx;p.y+=options[0].dy;}
    return true;
  }
  function inspect(pieces,task){
    if(!pieces.length)return {status:'empty',message:'Перетащи ионы на поле и собери вещество.'};
    if(component(pieces,pieces[0].id).length!==pieces.length)return {status:'incomplete',message:'Соедини все выбранные детали в один пазл.'};
    const charge=pieces.reduce((n,p)=>n+ion(p).charge,0);
    if(charge!==0||!closed(pieces))return {status:'incomplete',message:'Пазл ещё не собран: остались свободные места соединения.'};
    const cats=new Set(pieces.filter(p=>ion(p).charge>0).map(p=>p.ion)),ans=new Set(pieces.filter(p=>ion(p).charge<0).map(p=>p.ion));
    if(cats.size!==1||ans.size!==1)return {status:'mixed',message:'Неправильно: в этом задании нужен один вид катионов и один вид анионов.'};
    const cat=C.byId[[...cats][0]],an=C.byId[[...ans][0]],r=C.ratio(cat,an);
    const nc=pieces.filter(p=>p.ion===cat.id).length,na=pieces.length-nc;
    const name=an.name+' '+cat.name,formula=C.formula(cat,an);
    if(cat.id!==task.cat||an.id!==task.an)return {status:'wrong',name,formula,message:'Неправильно. Ты собрал другое вещество.'};
    if(nc!==r.cat||na!==r.an)return {status:'excess',name,formula,message:'Ионы выбраны верно, но нужна одна минимальная сборка вещества. Убери лишние детали.'};
    return {status:'correct',name,formula};
  }
  const api={W,U,height,connected,component,overlap,within,closed,snap,inspect};root.Puzzle=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
