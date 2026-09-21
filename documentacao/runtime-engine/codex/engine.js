/* Executable teaching model. The event controls stand in for people, clocks and workers. */
(function(root){
 'use strict';
 const create=()=>({schema:2,clock:0,nextId:101,active:null,instances:[],deliveries:[]});
 const current=s=>s.instances.find(i=>i.id===s.active);
 const entry=(s,i,text)=>i.history.push({at:s.clock,text});
 function dispatch(s,event){
  let i=current(s);
  if(event.type==='start'){
   i={id:s.nextId++,person:event.person||'Ana',version:1,stage:'human',priority:null,route:null,branches:{record:false,prepare:false},due:null,retries:3,retryAt:0,lockedBy:null,lockUntil:0,attempts:0,history:[]};
   s.instances.push(i);s.active=i.id;entry(s,i,'O início criou uma execução do roteiro versão 1.');entry(s,i,'O trabalho automático gerou o número do pedido.');entry(s,i,'A tarefa “Confirmar os dados” ficou aberta para uma pessoa.');return 'Pedido #'+i.id+' iniciado.';
  }
  if(event.type==='select'){if(s.instances.some(x=>x.id===event.id))s.active=event.id;return '';}
  if(event.type==='tick'){
   s.clock+=event.minutes;
   s.instances.forEach(p=>{
    if(p.stage==='timer'&&s.clock>=p.due){p.stage='message';entry(s,p,'O prazo venceu. O motor liberou a continuação.');entry(s,p,'Um serviço enviou o convite. O pedido passou a esperar “Agendamento confirmado”.');}
    if(p.lockedBy&&s.clock>=p.lockUntil){p.lockedBy=null;entry(s,p,'A reserva do trabalho venceu. Outro executor pode assumir.');}
   });return 'Relógio avançou '+event.minutes+' minutos.';
  }
  if(event.type==='message'){
   const target=s.instances.find(p=>p.id===event.id&&p.stage==='message'&&event.name==='Agendamento confirmado');
   s.deliveries.push({at:s.clock,id:event.id,name:event.name,accepted:Boolean(target)});
   if(!target)return 'A mensagem não encontrou um pedido esperando esse assunto com esse número.';
   target.stage='integration';entry(s,target,'A integração recebeu “Agendamento confirmado” para #'+target.id+'.');entry(s,target,'O motor encerrou essa espera e criou o trabalho “Efetivar instalação”.');return 'A mensagem liberou apenas o pedido #'+target.id+'.';
  }
  if(!i)return 'Inicie um pedido para experimentar.';
  switch(event.type){
   case 'human':
    if(i.stage!=='human')return 'Esta tarefa já foi concluída. O pedido permanece onde está.';
    i.priority=event.priority===true;i.route=i.priority?'Prioritário':'Comum';
    entry(s,i,'A pessoa concluiu a tarefa. O motor guardou “Prioridade: '+(i.priority?'sim':'não')+'”.');
    entry(s,i,'O serviço consultou o cadastro e devolveu um resultado válido.');
    entry(s,i,'A regra escolheu somente o caminho '+i.route.toLowerCase()+'.');
    entry(s,i,i.priority?'O serviço marcou o pedido para atendimento prioritário.':'O serviço manteve o atendimento comum.');
    i.stage='parallel';entry(s,i,'O motor abriu dois trabalhos independentes: registrar e preparar.');return 'Resposta aceita. O motor avançou até os trabalhos pendentes.';
   case 'branch':
    if(i.stage!=='parallel'||!Object.hasOwn(i.branches,event.branch)||i.branches[event.branch])return 'Esse trabalho não está pendente.';
    i.branches[event.branch]=true;entry(s,i,event.branch==='record'?'O registro do pedido terminou.':'O preparo do atendimento terminou.');
    if(i.branches.record&&i.branches.prepare){i.stage='timer';i.due=s.clock+10;entry(s,i,'Os dois caminhos chegaram ao encontro. O motor marcou uma espera de 10 minutos.');return 'Os dois trabalhos terminaram. A espera por prazo começou.';}
    return 'Um trabalho terminou. O ponto de encontro aguarda o outro.';
   case 'claim':
    if(i.stage!=='integration')return 'Não há um trabalho disponível nesta etapa.';
    if(s.clock<i.retryAt)return 'A próxima tentativa ainda não está liberada.';
    if(i.lockedBy)return 'O trabalho já está reservado por '+i.lockedBy+'.';
    i.lockedBy=event.worker||'Executor A';i.lockUntil=s.clock+2;
    entry(s,i,i.lockedBy+' reservou o trabalho por 2 minutos.');return 'Trabalho reservado. O executor pode chamar o serviço.';
   case 'fail':
   case 'succeed':
    if(i.stage!=='integration'||!i.lockedBy)return 'Um executor precisa reservar o trabalho primeiro.';
    i.attempts++;i.lockedBy=null;
    if(event.type==='succeed'){i.stage='ended';entry(s,i,'O serviço respondeu com sucesso. O executor concluiu o trabalho.');entry(s,i,'O motor chegou ao fim. Não restam caminhos ativos.');return 'Pedido concluído.';}
    i.retries--;i.retryAt=s.clock+2;entry(s,i,'O serviço falhou. Restam '+i.retries+' tentativas.');
    if(i.retries===0){i.stage='incident';entry(s,i,'As tentativas terminaram. O pedido precisa de intervenção.');return 'O pedido ficou pendente de intervenção.';}
    return 'Falha guardada. Uma nova tentativa estará disponível em 2 minutos.';
   case 'repair':
    if(i.stage!=='incident')return 'Este pedido não precisa de intervenção.';
    i.retries=1;i.retryAt=s.clock;i.stage='integration';entry(s,i,'Após corrigir a causa, o responsável liberou uma nova tentativa.');return 'Nova tentativa liberada após a correção.';
   default:return '';
  }
 }
 const api={create,current,dispatch};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MotorDemo=api;
})(typeof globalThis!=='undefined'?globalThis:this);
