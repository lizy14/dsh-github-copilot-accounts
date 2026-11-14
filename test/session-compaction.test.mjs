import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { installSessionCompaction, createSessionCompactionEngine, expandSessionCompactionPolicies } from '../src/session-compaction.mjs';
import { accountRouteId, GLOBAL_COPILOT_ROUTE as G } from '../src/account-route-id.mjs';
const base = new URL('../../dsh-session-account-review/installed/dsh/node_modules/', import.meta.url);
const load = p => import(new URL(p, base));
const nativeOptions = { skip: !existsSync(new URL('@deepseek-ai/dsh-compaction-basic/lib/index.js', base)) };
const A=accountRouteId('copilot-auth/account-a'), B=accountRouteId('copilot-auth/account-b');
const NATIVE='@deepseek-ai/dsh-compaction-basic', ROLE='dsh-github-copilot-accounts/session-compaction', REALM='copilot-session-compaction-backing';
async function fixture(t,{disabled=false,auto=true,first='native',config={},failPublic=false}={}) {
  const [{Context},{Loader,interpolate},{BasicCompactionEngine:Native},sessions]=await Promise.all([
    load('@deepseek-ai/cordis/lib/index.js'),load('@deepseek-ai/cordis-plugin-loader/lib/index.js'),load(NATIVE+'/lib/index.js'),load('@deepseek-ai/dsh-session/lib/index.js')]);
  const root=new Context(),calls=[],metadata=[],state={};
  t.after(()=>root.fiber.dispose());
  root.provide('logger',{info(){},warn(){},error(){},debug(){}});
  new sessions.SessionStore(root);
  root.provide('llm',{resolveModelInfo:async()=>({context:{contextWindow:10000},defaultMaxTokens:100}),async *stream(request){
    calls.push(request);if(request.provider===A)throw new Error('FAKE_ACCOUNT_A_QUOTA');
    yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'safe summary'};
    yield {type:'block-end',index:0,block:{type:'text',text:'safe summary'}};yield{type:'finish',reason:{kind:'stop'}};
  }});
  root.provide('tokenMeter',{measure(session){const nodes=session.surface.nodes.map(seq=>({seq,tokens:session.surface.replaceGeneration>0?10:5000,heuristicTokens:5000}));return{nodes,totalTokens:nodes.reduce((n,x)=>n+x.tokens,0)};},estimateMessage(){return 10;}});
  root.provide('credentials',{async listRecords(){metadata.push(true);return['a','b'].map(x=>({kind:'grant',key:'copilot-auth/account-'+x}));},readRecord(){assert.fail('compaction must never read grant payloads');}});
  class MaybeFail extends Native { constructor(ctx,cfg){super(ctx,cfg);if(failPublic&&ctx.root===root&&cfg.auto!==false)throw new Error('FAKE_PUBLIC_FAILURE');} }
  const Basic=failPublic?MaybeFail:Native;
  class MemoryLoader extends Loader {commit(){};import(name,outer){
    if(name===NATIVE)return Promise.resolve({default:Native});
    if(name===ROLE)return Promise.resolve({apply(ctx){state.task=installSessionCompaction(ctx,{Context,BasicCompactionEngine:Basic,interpolate});}});
    return super.import(name,outer);
  }}
  const loader=root.plugin(MemoryLoader);await loader.await();
  const original={id:'compaction-basic',name:NATIVE,disabled,config:{auto,headroomTokens:500,retainTokens:50,maxTokens:321,...config},isolate:{compaction:REALM},inject:['copilotCompactionControls']};
  const role={id:'copilot-session-compaction',name:ROLE,isolate:{compaction:REALM}};
  await root.loader.root.update(first==='native'?[original,role]:[role,original]);await root.loader.await();
  if(failPublic)await assert.rejects(state.task.await(),/FAKE_PUBLIC_FAILURE/);else await state.task?.await();
  function agent(){
    const session=root.sessions.create('fake-session-'+Math.random(),{meta:{createdAt:1000,cwd:process.cwd()}});
    session.append('request/header',{header:{config:{provider:A,model:'chat'}},reason:'initial'});
    session.append('user/message',{role:'user',content:[{type:'text',text:'old history 1'}]},{surfaceOp:'append'});
    session.append('user/message',{role:'user',content:[{type:'text',text:'old history 2'}]},{surfaceOp:'append'});
    session.append('user/message',{role:'user',content:[{type:'text',text:'retained tail'}]},{surfaceOp:'append'});
    session.append('turn/start',{turn:1});
    return {ctx:root,session,status:'running',options:{provider:B,model:'chat'},model:{current:()=>({provider:B,model:'chat'})}};
  }
  return{root,Context,Native,calls,metadata,original,role,agent};
}

test('disabled native compaction remains disabled without failed role or public engine in either startup order',nativeOptions,async(t)=>{
  for(const first of ['native','role']){const f=await fixture(t,{disabled:true,first});
    assert.equal(f.root.loader.resolve('copilot-session-compaction').fiber.state,2);
    assert.equal(f.root.get('compaction'),undefined);assert.equal(f.root.get('copilotSessionCompaction').mode,'disabled');
    assert.equal(f.root.get('copilotSessionCompaction').isReady(),true);assert.equal(f.metadata.length,0);
    assert.equal(f.root.loader.resolve('compaction-basic').disabled,true);
  }
});
for(const first of ['native','role'])test('enabled original/public composition '+first+' retains raw controls and one automatic engine',nativeOptions,async(t)=>{
  const f=await fixture(t,{first});const original=f.root.loader.resolve('compaction-basic');
  assert.equal(original.fiber.state,2);assert.deepEqual(original.options.config,f.original.config);
  assert.equal(original.ctx.get('compaction').config.auto,false);assert.equal(f.root.get('compaction').config.auto,true);
  assert.notEqual(original.ctx.get('compaction'),f.root.get('compaction'));
  assert.equal(f.root.get('copilotSessionCompaction').isReady(),true);
});

test('real native automatic model-switch pressure transaction records summary on B and never calls exhausted A',nativeOptions,async(t)=>{
  const f=await fixture(t),agent=f.agent(),old=structuredClone(agent.session.requestHeader());
  const proposed={provider:B,model:'chat'};
  const result=await f.root.waterfall('agent/request',{agent,signal:new AbortController().signal},()=>proposed);
  assert.equal(result,proposed);assert.deepEqual(f.calls.map(x=>x.provider),[B]);
  assert.equal(f.calls[0].purpose,'compaction');
  assert.deepEqual(agent.session.requestHeader(),old,'old immutable request header must not be rewritten');
  const summary=agent.session.snapshotEvents().find(x=>x.type==='compaction/summary');
  assert.equal(summary.data.provider,B);assert.equal(summary.data.llmStreamCall,true);
  assert.ok(agent.session.surface.replaceGeneration>0,'actual native Surface transaction committed');
});

test('real native pre-step pressure uses driver-captured B, not later mutable pending model',nativeOptions,async(t)=>{
  const f=await fixture(t),agent=f.agent();agent.model.current=()=>({provider:A,model:'chat'});
  await f.root.waterfall('agent/pre-step',{agent,modelSelection:{provider:B,model:'chat'},signal:new AbortController().signal},()=>undefined);
  assert.deepEqual(f.calls.map(x=>x.provider),[B]);
});

test('explicit summary provider/model override C remains authoritative',nativeOptions,async(t)=>{
  const f=await fixture(t,{config:{summarizationProvider:'explicit-summary',summarizationModel:'summary-model'}}),agent=f.agent();
  await f.root.waterfall('agent/request',{agent,signal:new AbortController().signal},()=>({provider:B,model:'chat'}));
  assert.deepEqual(f.calls.map(x=>[x.provider,x.model]),[['explicit-summary','summary-model']]);
});

test('per-model family rules expand into managed/startup aliases without changing raw defaults',()=>{
  const raw={modelPolicies:[{provider:'github-copilot',model:'chat',headroomTokens:321,summarizationProvider:'summary',summarizationModel:'s'},{provider:B,model:'chat',maxTokens:99}]};
  const expanded=expandSessionCompactionPolicies(raw,[A,B]);
  assert.equal(raw.modelPolicies.length,2);
  for(const provider of [A,B,G])assert.equal(expanded.config.modelPolicies.find(x=>x.provider===provider).headroomTokens,321);
  assert.equal(expanded.config.modelPolicies.find(x=>x.provider===B).maxTokens,99);
  const warm=accountRouteId('copilot-auth/account-new');assert.equal(expanded.supportsRoute({provider:warm,model:'chat'}),false);
  assert.equal(expanded.supportsRoute({provider:warm,model:'other'}),true);
});

test('original auto false preference stays false while manual summary uses B',nativeOptions,async(t)=>{
  const f=await fixture(t,{auto:false}),agent=f.agent();agent.status='idle';
  const result=await f.root.get('compaction').summarize({messages:[],tools:[]},agent,new AbortController().signal);
  assert.equal(f.root.get('compaction').config.auto,false);assert.equal(result.provider,B);
});

test('same id in a foreign Session scope cannot send a summary through this Host',nativeOptions,async(t)=>{
  const f=await fixture(t),agent=f.agent();agent.session={...agent.session,id:agent.session.id};
  await assert.rejects(f.root.get('compaction').summarize({messages:[]},agent),/scope is unsupported/);assert.equal(f.calls.length,0);
});

test('failed enabled public engine refuses managed execution without loading or dispatching old account',nativeOptions,async(t)=>{
  const f=await fixture(t,{failPublic:true}),agent=f.agent();
  assert.notEqual(f.root.get('copilotSessionCompaction')?.isReady(),true);
  assert.throws(()=>f.root.waterfall('agent/pre-step',{agent,modelSelection:{provider:B,model:'chat'},signal:new AbortController().signal},()=>undefined),error=>error.code==='COPILOT_COMPACTION_UNAVAILABLE');
  assert.equal(f.calls.length,0);
});

test('policy-sensitive warm alias fails explicitly before old-account compaction; unrelated models remain supported',nativeOptions,async(t)=>{
  const f=await fixture(t,{config:{modelPolicies:[{provider:'github-copilot',model:'chat',headroomTokens:500,maxTokens:321,retainTokens:50}]}}),agent=f.agent();
  const warm=accountRouteId('copilot-auth/account-warm'),marker=f.root.get('copilotSessionCompaction');
  assert.equal(marker.supportsRoute({provider:warm,model:'chat'}),false);
  assert.equal(marker.supportsRoute({provider:warm,model:'other'}),true);
  await assert.rejects(f.root.waterfall('agent/request',{agent,signal:new AbortController().signal},()=>({provider:warm,model:'chat'})),error=>error.code==='COPILOT_RESTART_REQUIRED');
  assert.equal(f.calls.length,0);
});

test('model-specific inherited explicit summary override is used during real native pricing',nativeOptions,async(t)=>{
  const f=await fixture(t,{config:{modelPolicies:[{provider:'github-copilot',model:'chat',summarizationProvider:'explicit-family',summarizationModel:'s',maxTokens:111}]}}),agent=f.agent();
  await f.root.waterfall('agent/request',{agent,signal:new AbortController().signal},()=>({provider:B,model:'chat'}));
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].provider,'explicit-family');assert.equal(f.calls[0].maxTokens,111);
});

test('raw configuration edits and enabling a cold-disabled engine require restart; disabling never enables fallback hooks',nativeOptions,async(t)=>{
  const f=await fixture(t),original=f.root.loader.resolve('compaction-basic');
  await assert.rejects(original.update({config:{...f.original.config,maxTokens:999}}),error=>error.code==='COPILOT_RESTART_REQUIRED');
  const disabled=await fixture(t,{disabled:true});
  await assert.rejects(disabled.root.loader.resolve('compaction-basic').update({disabled:false}),error=>error.code==='COPILOT_RESTART_REQUIRED');
  const active=await fixture(t),row=active.root.loader.resolve('compaction-basic');
  await row.update({disabled:true});await active.root.loader.await();
  assert.equal(row.disabled,true);assert.equal(active.root.get('compaction'),undefined);
  assert.equal(active.calls.length,0);
});

test('actual patch never enables a disabled native entry or makes account Remote depend on compaction',async()=>{
  const patch=parse(await readFile(new URL('../cordis.patch.yml',import.meta.url),'utf8'));
  const native=patch.find(x=>x.id==='compaction-basic');assert.equal(native.disabled,undefined);
  assert.equal(native.name,NATIVE);assert.deepEqual(native.inject,['copilotCompactionControls']);
  const host=await readFile(new URL('../src/host.mjs',import.meta.url),'utf8');
  assert.ok(!host.match(/ctx\.inject\(\([^)]*copilotSessionCompaction/));
  assert.ok(!host.includes('"copilotSessionCompaction"'));
});
