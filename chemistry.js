(function (root) {
  'use strict';
  const ions = [
    {id:'Na', symbol:'Na', charge:1, name:'натрия'},
    {id:'K', symbol:'K', charge:1, name:'калия'},
    {id:'Ca', symbol:'Ca', charge:2, name:'кальция'},
    {id:'Mg', symbol:'Mg', charge:2, name:'магния'},
    {id:'Ba', symbol:'Ba', charge:2, name:'бария'},
    {id:'Al', symbol:'Al', charge:3, name:'алюминия'},
    {id:'Li', symbol:'Li', charge:1, name:'лития'},
    {id:'NH4', symbol:'NH4', charge:1, name:'аммония', poly:true},
    {id:'Zn', symbol:'Zn', charge:2, name:'цинка'},
    {id:'Cu', symbol:'Cu', charge:2, name:'меди(II)'},
    {id:'Fe2', symbol:'Fe', charge:2, name:'железа(II)'},
    {id:'Fe3', symbol:'Fe', charge:3, name:'железа(III)'},
    {id:'Ag', symbol:'Ag', charge:1, name:'серебра'},
    {id:'NO3', symbol:'NO3', charge:-1, name:'нитрат', poly:true},
    {id:'NO2', symbol:'NO2', charge:-1, name:'нитрит', poly:true},
    {id:'N', symbol:'N', charge:-3, name:'нитрид'},
    {id:'SO4', symbol:'SO4', charge:-2, name:'сульфат', poly:true},
    {id:'SO3', symbol:'SO3', charge:-2, name:'сульфит', poly:true},
    {id:'S', symbol:'S', charge:-2, name:'сульфид'},
    {id:'Cl', symbol:'Cl', charge:-1, name:'хлорид'},
    {id:'OH', symbol:'OH', charge:-1, name:'гидроксид', poly:true},
    {id:'CO3', symbol:'CO3', charge:-2, name:'карбонат', poly:true},
    {id:'PO4', symbol:'PO4', charge:-3, name:'фосфат', poly:true},
    {id:'Br', symbol:'Br', charge:-1, name:'бромид'},
    {id:'I', symbol:'I', charge:-1, name:'иодид'},
    {id:'HCO3', symbol:'HCO3', charge:-1, name:'гидрокарбонат', poly:true},
    {id:'F', symbol:'F', charge:-1, name:'фторид'}
  ];
  const byId=Object.fromEntries(ions.map(i=>[i.id,i]));
  const tasks=[
    ['Na','SO4'],['K','Cl'],['Mg','SO4'],['Na','OH'],['Ca','Cl'],
    ['K','CO3'],['Mg','NO3'],['Ba','OH'],['Na','PO4'],['Al','Cl'],
    ['K','SO4'],['Ca','NO3'],['K','PO4'],['Al','NO3'],['Al','SO4']
  ].map(([cat,an])=>({cat,an,name:byId[an].name+' '+byId[cat].name}));
  function gcd(a,b){return b?gcd(b,a%b):a;}
  function ratio(cat,an){const g=gcd(cat.charge,-an.charge);return {cat:-an.charge/g,an:cat.charge/g};}
  function part(ion,count){return (ion.poly&&count>1?'('+ion.symbol+')':ion.symbol)+(count>1?count:'');}
  function formula(cat,an){const r=ratio(cat,an);return part(cat,r.cat)+part(an,r.an);}
  function formulaHTML(raw){return raw.replace(/\d+/g,s=>'<sub>'+s+'</sub>');}
  function ionHTML(ion){const c=Math.abs(ion.charge);return formulaHTML(ion.symbol)+'<sup>'+(c===1?'':c)+(ion.charge>0?'+':'−')+'</sup>';}
  function dissociationHTML(task){const cat=byId[task.cat],an=byId[task.an],r=ratio(cat,an);return formulaHTML(formula(cat,an))+' → '+(r.cat>1?r.cat:'')+ionHTML(cat)+' + '+(r.an>1?r.an:'')+ionHTML(an);}
  function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function makeBank(task,rng=Math.random){
    const cats=new Set([task.cat,'K','Ca']);
    const ans=new Set([task.an,'NO3','NO2','N','SO4','SO3','S']);
    if(task.cat==='Fe2'||task.cat==='Fe3'){cats.add('Fe2');cats.add('Fe3');}
    for(const i of shuffle(ions.filter(i=>i.charge>0),rng)){if(cats.size>=9)break;cats.add(i.id);}
    for(const i of shuffle(ions.filter(i=>i.charge<0),rng)){if(ans.size>=9)break;ans.add(i.id);}
    return shuffle([...cats,...ans].map(id=>byId[id]),rng);
  }
  const api={ions,byId,tasks,gcd,ratio,formula,formulaHTML,ionHTML,dissociationHTML,shuffle,makeBank};
  root.Chemistry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
