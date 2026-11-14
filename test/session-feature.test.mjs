import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createSessionAccountFeature } from "../src/session-feature.mjs";
import { createProfiledAccountAdapter } from "../src/account-profiled-adapter.mjs";
import { createDefaultModelPolicy, createDefaultModelPolicyMarker } from "../src/default-model.mjs";
import { accountRouteId, GLOBAL_COPILOT_ROUTE, isManagedCopilotRoute } from "../src/account-route-id.mjs";
import { createSessionRequestState } from "../src/session-request-state.mjs";
import { accountCredentialIdentity } from "../src/account-identity.mjs";

const A="copilot-auth/account-a",B="copilot-auth/account-b",MAIN="llm-pi-ai/github-copilot";
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return{promise,resolve,reject};};
const grant=(letter)=>({kind:"grant",payload:{type:"oauth",refresh:`FAKE_${letter}_REFRESH`,access:`FAKE_${letter}_ACCESS`,expires:Date.now()+3600000,enterpriseUrl:`company-${letter.toLowerCase()}.ghe.com`,availableModelIds:["gpt-5.4"],account:{login:"alice",domain:`company-${letter.toLowerCase()}.ghe.com`,name:`Account ${letter}`}}});
class FakeError extends Error{constructor(message,code){super(message);this.code=code;}}
class RemoteError extends Error{constructor(code,message,details){super(message);Object.assign(this,{code,details});}}
class RemoteBase{constructor(ctx,name){this.ctx=ctx;this.name=name;}}
const Remote=()=>()=>{};

function fixture(changes={}){
  const records=new Map([[A,grant("A")],[B,grant("B")],[MAIN,grant("B")]]),tails=new Map(),reads=[],writes=[];
  const effects=[],watchers=new Map(),logs=[],events=[],adapters=[],delegates=[],registered=[],replaced=[],removed=[],routes=new Map(),services=new Map(),streamRequests=[],stateFactories=[],scopeCalls=[],stateNotices=[],stateObservers=[];
  let stateDisposed=0; const notices=new Map();
  let profile={tag:"initial"},globalId=B,remote,imports=0,slotReads=0,profileCalls=0,defaultCalls=0,refreshCalls=0;
  const markerState=createDefaultModelPolicyMarker(()=>true);
  services.set("copilotDefaultModelPolicy",markerState.marker);
  const credentials={
    async readRecord(id){reads.push(id);return structuredClone(records.get(id));},
    modifyRecord(id,mutate){const op=(tails.get(id)??Promise.resolve()).then(async()=>{const next=await mutate(structuredClone(records.get(id)));if(next!==undefined){records.set(id,structuredClone(next));writes.push(id);}return structuredClone(records.get(id));});tails.set(id,op.catch(()=>{}));return op;},
  };
  const llm={
    registerAdapter(ids,adapter){let owned=new Set();let released=false;const commit=(next)=>{for(const id of next){assert.equal(!routes.has(id)||owned.has(id),true);assert.equal(adapter.providerInfo(id).id,id);adapter.providerRetryPolicy?.(id);}for(const id of owned)routes.delete(id);owned=new Set(next);for(const id of owned)routes.set(id,adapter);};commit(ids);for(const id of ids)registered.push({id,tag:adapter.providerRetryPolicy?.(id)?.tag});const dispose=()=>{if(released)return;released=true;for(const id of owned){routes.delete(id);removed.push(id);}owned.clear();};dispose.replace=(next)=>{assert.equal(released,false);replaced.push(next);commit(next);};return dispose;},
    async listModels(provider){return provider==="github-copilot"?[{id:"gpt-5.4"}]:routes.get(provider)?.listModels(provider)??[];},
    async resolveCallConfig(selected){if(selected.provider!=="github-copilot")await routes.get(selected.provider).resolveModel(selected.provider,selected.model);return selected;},
  };
  const agent={status:"idle",session:{id:"s",requestHeader:()=>({config:{provider:"github-copilot",model:"gpt-5.4"}})},model:{current:()=>({...agent.selected})},selected:{provider:"github-copilot",model:"gpt-5.4",reasoningEffort:"high"}};
  const defaultSaves=[];
  const defaults=createDefaultModelPolicy({currentSelection:()=>({provider:"github-copilot",model:"gpt-5.4"}),saveSelection:(value)=>{defaultSaves.push(value);return Promise.resolve();}});
  services.set("sessionController",{async resolveAgent(id){return id==="s"?{agent}:{error:{code:"session/not-found"}};},async selectModel(request){agent.selected={provider:request.provider,model:request.model,...(request.reasoningEffort===undefined?{}:{reasoningEffort:request.reasoningEffort})};await defaults.saveSelection(agent.selected);return{selected:agent.selected};}});
  services.set("credentials",credentials);services.set("llm",llm);services.set("loader",{import(){throw new Error("mock loader not used");}});
  services.set("attachments",{fixture:true});services.set("fs",{processPathFromHostPath:(path)=>`mapped:${path}`});
  const ctx={
    get:(key)=>services.get(key),provide(key,value){assert.equal(services.has(key),false);services.set(key,value);return()=>{if(services.get(key)===value)services.delete(key);};},remoteAccess:{allows:()=>true},logger:{warn:(...args)=>logs.push(args)},
    effect(operation){const cleanup=operation();effects.push(cleanup);return cleanup;},
    on(event,callback,options){const row={callback,options};const set=watchers.get(event)??new Set();set.add(row);watchers.set(event,set);return()=>set.delete(row);},
    emit:(...args)=>events.push(args),waterfall:(event,request,headers,next)=>next(),
    plugin(Class){remote=new Class(ctx);services.set("copilotAccounts",remote);return{dispose:async()=>{if(services.get("copilotAccounts")===remote)services.delete("copilotAccounts");}};},
  };
  class Context{static is(value){return value===ctx;}}
  const runtime={Context,LlmAdapter:class{},LlmError:FakeError,Schema:{fixture:true},symbols:{original:Symbol.for("cordis.original")},lastAssistantStreamChunk:()=>undefined,remoteProtocol:{TypertRemoteService:RemoteBase,Remote,RemoteError,principalOf:(invocation)=>invocation?.peer.principal.kind==="owner"?undefined:invocation?.peer.principal},deriveAuth:(payload)=>({baseUrl:`https://copilot-api.${payload.enterpriseUrl}`}),resolveImageAccess:(attachments,map,ref)=>({attachments,path:map(ref.path)}),
    async createAdapter(options){
      adapters.push(options);
      return createProfiledAccountAdapter({LlmAdapter:class{},LlmError:FakeError,accountId:options.accountId,routeId:options.routeId,onPublish:options.onPublish,initialProfile:options.profile,
        createDelegate:async(raw)=>{
          if(changes.createDelegate)await changes.createDelegate(raw,options);
          if(raw?.invalid)throw new Error("https://private.example/FAKE_SECRET_PROFILE");
          const captured=structuredClone(raw);
          const ensure=()=>{if(!options.isEnabled())throw new FakeError("disabled","ACCOUNT_UNAVAILABLE");};
          const delegate={accountId:options.accountId,routeId:options.routeId,disposed:false,
            providerInfo:()=>({id:options.routeId,name:options.displayName()}),providerRetryPolicy:()=>({tag:captured.tag}),
            async listModels(){ensure();return[{provider:options.routeId,id:"gpt-5.4"}];},
            async resolveModel(provider,model){ensure();return{provider,id:model,name:model,inputModalities:["text"],reasoning:{efforts:[{id:"high",name:"High"}]}};},
            async prepareCall(provider,model){ensure();return{model:await delegate.resolveModel(provider,model),stream:(request)=>delegate.stream(request)};},
            async *stream(request){ensure();await options.beforeDispatch({accountId:options.accountId,routeId:options.routeId,signal:request.signal});ensure();const logical=request[Symbol.for("copilot-auth.account-request-context.v1")];const scope=await options.requestScope({sessionId:request.sessionId,accountId:options.accountId,credentialIdentity:accountCredentialIdentity(records.get(options.accountId).payload),logicalProvider:logical?.logicalProvider??request.provider,defaultEpoch:logical?.defaultEpoch,model:request.model,reasoningEffort:request.reasoningEffort,purpose:request.purpose,apiContext:"openai-responses",signal:request.signal});streamRequests.push({accountId:options.accountId,request,messages:structuredClone(request.messages??[]),scope});yield{type:"block-start",index:0,blockType:"text",tag:captured.tag};yield{type:"text-delta",index:0,text:"synthetic"};yield{type:"block-end",index:0,block:{type:"text",text:"synthetic"}};yield{type:"finish",reason:{kind:"stop"},replayState:{kind:"copilot-account",version:1,accountId:options.accountId,credentialIdentity:accountCredentialIdentity(records.get(options.accountId).payload),native:{response:{kind:"pi-ai",version:2,provider:"github-copilot",api:"openai-responses",model:request.model,stopReason:"stop"},blocks:[{type:"text",textSignature:"FAKE_SIGNATURE"}]},cache:scope.cacheMeta}};},
            dispose(){delegate.disposed=true;},
          };
          delegates.push(delegate);return delegate;
        },
      });
    },
  };
  const options={
    listSlots:async()=>{slotReads++;return[...records].filter(([key])=>key.startsWith("copilot-auth/account-")).map(([key,value])=>({key,payload:structuredClone(value.payload)}));},
    collectAccounts:async()=>({signingIn:false,accounts:[...records].filter(([id])=>id.startsWith("copilot-auth/account-")).map(([id,value])=>({id,domain:value.payload.enterpriseUrl,login:value.payload.account?.login,name:value.payload.account?.name,active:id===globalId,payload:{refresh:"FAKE_SECRET"}}))}),
    refreshProfileById:async(id)=>{profileCalls++;const current=records.get(id);records.set(id,{...current,payload:{...current.payload,account:{...current.payload.account,name:"Refreshed"}}});return{ok:true,avatarUrl:"https://company.ghe.com/avatar?fixture=opaque"};},
    setDefaultAccountById:async(id)=>{defaultCalls++;globalId=id;records.set(MAIN,{kind:"grant",payload:{...structuredClone(records.get(id).payload),copilotDefaultEpoch:`chosen-${defaultCalls}`}});return{ok:true,defaultAccountId:id};},
    getProfile:()=>changes.getProfile?changes.getProfile():profile,
    runtimeLoader:async(args)=>{imports++;return changes.runtimeLoader?changes.runtimeLoader(args,runtime):runtime;},
    refreshAccess:async()=>{refreshCalls++;return{access:"FAKE_REFRESHED_ACCESS",expires:Date.now()+3600000,refreshIn:1500,availableModelIds:["gpt-5.4"]};},
    requestStateFactory:async(args)=>{stateFactories.push({args,routes:routes.size});return changes.requestStateFactory?changes.requestStateFactory(args):{async scopeForRequest(request){scopeCalls.push(request);return{transportSessionId:"10000000-0000-4000-8000-000000000001",replayEpoch:"fake-epoch",contextKey:"a".repeat(64),cacheMeta:{version:1,accountId:request.accountId,logicalProvider:request.logicalProvider,epoch:"fake-epoch"}};},notice(id){stateNotices.push(id);return notices.get(id)??null;},observeFailures(context,settings){stateObservers.push({context,settings,routes:routes.size});return()=>{};},async dispose(){stateDisposed++;}};},
  };
  const invoke=(method,request,kind="owner",allowed=true)=>{
    const callContext=Object.assign(Object.create(ctx),{invocation:{peer:{principal:{kind},signal:new AbortController().signal},signal:new AbortController().signal},remoteAccess:{allows:()=>allowed}});
    return remote[method].call(Object.assign(Object.create(remote),{ctx:callContext}),request);
  };
  return{ctx,options,runtime,records,services,credentials,llm,agent,routes,adapters,delegates,registered,replaced,removed,effects,watchers,logs,events,reads,writes,defaultSaves,markerState,invoke,streamRequests,stateFactories,scopeCalls,stateNotices,stateObservers,notices,stateDisposed:()=>stateDisposed,
    setProfile:(value)=>{profile=value;},globalId:()=>globalId,imports:()=>imports,slotReads:()=>slotReads,profileCalls:()=>profileCalls,defaultCalls:()=>defaultCalls,refreshCalls:()=>refreshCalls,
    remote:()=>remote,
    async emitVolatile(){await Promise.all([...(watchers.get("loader/volatile-update")??[])].map((row)=>row.callback()));},
    async disposeContext(){await Promise.all(effects.map((cleanup)=>cleanup?.()));},
  };
}

test("optional compaction bridge absence never blocks runtime, routes or the owner Remote",async()=>{
  const f=fixture();f.services.delete("copilotSessionCompaction");
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(feature.status.phase,"ready");assert.ok(f.imports()>0);assert.ok(f.routes.size>0);assert.ok(f.remote());
  assert.equal(feature.managedDefault.isReady(),true);await feature.dispose();
});

test("policy missing gates runtime import, routes and Remote without affecting global management",async()=>{
  const f=fixture();f.services.delete("copilotDefaultModelPolicy");
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(f.imports(),0);assert.equal(f.routes.size,0);assert.equal(f.remote(),undefined);
  assert.equal(f.effects.length,1);assert.equal(feature.status.errorCode,"POLICY_UNAVAILABLE");
  assert.equal(f.records.has(MAIN),true);await feature.dispose();
});

test("cleanup exists before runtime import and prevents late services/routes",async()=>{
  const loading=deferred(),f=fixture({runtimeLoader:()=>loading.promise});
  const pending=createSessionAccountFeature(f.ctx,f.options);
  assert.equal(f.effects.length,1);
  await f.disposeContext();loading.resolve(f.runtime);
  const feature=await pending;
  assert.equal(feature.status.phase,"disposed");assert.equal(f.routes.size,0);assert.equal(f.remote(),undefined);
  assert.equal(f.watchers.get("loader/volatile-update").size,0);
});

test("policy revocation during import and wrong Host Context fail before publication",async()=>{
  const loading=deferred(),f=fixture({runtimeLoader:()=>loading.promise});
  const pending=createSessionAccountFeature(f.ctx,f.options);f.markerState.deactivate();loading.resolve(f.runtime);
  assert.equal((await pending).status.errorCode,"POLICY_UNAVAILABLE");assert.equal(f.registered.length,0);
  const wrong=fixture();wrong.runtime.Context=class{static is(){return false;}};
  const feature=await createSessionAccountFeature(wrong.ctx,wrong.options);
  assert.equal(feature.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");assert.equal(wrong.registered.length,0);
  await f.disposeContext();await feature.dispose();
});

test("fatal incomplete runtime or Remote mount cannot publish routes through later settings events",async()=>{
  const incomplete=fixture();incomplete.runtime.remoteProtocol.Remote=undefined;
  const first=await createSessionAccountFeature(incomplete.ctx,incomplete.options);
  assert.equal(first.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");
  incomplete.setProfile({tag:"later"});await incomplete.emitVolatile();
  assert.equal(incomplete.routes.size,0);assert.equal(incomplete.adapters.length,0);
  const mount=fixture(),resident=nativeActors(mount).add("before-failed-mount");mount.ctx.plugin=()=>{throw new Error("FAKE_SECRET_MOUNT");};
  const failed=await createSessionAccountFeature(mount.ctx,mount.options);
  assert.equal(failed.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");assert.equal(resident.model.current().provider,"github-copilot");assert.equal(resident.selections.length,0);
  const builtBeforeFailure=mount.adapters.length;
  mount.setProfile({tag:"later"});await mount.emitVolatile();
  assert.equal(mount.routes.size,0);assert.equal(mount.adapters.length,builtBeforeFailure);assert.ok(mount.delegates.every((delegate)=>delegate.disposed));
  assert.equal(JSON.stringify(mount.logs).includes("FAKE_SECRET_MOUNT"),false);
});

test("bootstrap registers stable account proxies and owner native handlers preserve global default separation",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(feature.status.phase,"ready");assert.equal(f.routes.size,3);
  const dto=await f.invoke("catalog",{sessionId:"s"});
  assert.equal(dto.accounts.length,2);assert.equal(dto.accounts.find((row)=>row.id===B).globalActive,true);
  assert.equal(dto.accounts[0].routeAvailable,true);assert.equal(JSON.stringify(dto).includes("FAKE_SECRET"),false);
  await f.invoke("bind",{sessionId:"s",accountId:A,expected:f.agent.selected});
  assert.equal(f.agent.selected.provider,accountRouteId(A));assert.deepEqual(f.defaultSaves,[]);
  await f.invoke("profile",{sessionId:"s",accountId:A});assert.equal(feature.registry.account(A).name,"Refreshed");
  await f.invoke("setDefault",{sessionId:"s",accountId:A});assert.equal(f.globalId(),A);
  assert.equal(f.agent.selected.provider,accountRouteId(A));assert.equal(f.defaultCalls(),1);
  await assert.rejects(f.invoke("catalog",{sessionId:"s"},"share-viewer"),(error)=>error.code==="OWNER_REQUIRED");
  const before=f.slotReads();await assert.rejects(f.invoke("catalog",{sessionId:"s"},"owner",false),(error)=>error.code==="SESSION_FORBIDDEN");assert.equal(f.slotReads(),before);
  await feature.dispose();assert.equal(f.routes.size,0);
});

test("bad initial profile keeps Remote/global account handling available and repairs on settings change",async()=>{
  const f=fixture();f.setProfile({invalid:true});const main=structuredClone(f.records.get(MAIN));
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(feature.status.errorCode,"ACCOUNT_PROFILE_INVALID");assert.deepEqual([...f.routes.keys()],[GLOBAL_COPILOT_ROUTE]);assert.ok(f.remote());
  assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);
  const dto=await f.invoke("catalog",{sessionId:"s"});assert.equal(dto.accounts[0].available,true);assert.equal(dto.accounts[0].routeAvailable,false);
  await f.invoke("setDefault",{sessionId:"s",accountId:A});assert.equal(f.globalId(),A);
  assert.equal(f.records.get(MAIN).payload.refresh,f.records.get(A).payload.refresh);assert.notDeepEqual(f.records.get(MAIN),main);
  const chosen=structuredClone(f.records.get(MAIN));
  f.setProfile({tag:"repaired"});await f.emitVolatile();
  assert.equal(f.routes.size,3);assert.equal(feature.status.phase,"ready");assert.deepEqual(f.records.get(MAIN),chosen);
  assert.equal(JSON.stringify(f.logs).includes("FAKE_SECRET_PROFILE"),false);
  await feature.dispose();
});

test("settings watcher ignores equal JSON, updates stable proxies eagerly and preserves prepared generations",async()=>{
  const f=fixture();f.setProfile({tag:"one",nested:{a:1,b:2}});const feature=await createSessionAccountFeature(f.ctx,f.options);
  const route=accountRouteId(A),proxy=f.routes.get(route),prepared=await proxy.prepareCall(route,"gpt-5.4");
  const builds=f.delegates.length;
  f.setProfile({nested:{b:2,a:1},tag:"one"});await f.emitVolatile();assert.equal(f.delegates.length,builds);
  f.setProfile({tag:"two"});await f.emitVolatile();assert.equal(f.routes.get(route),proxy);assert.ok(f.replaced.length>=2);
  const old=[];for await(const chunk of prepared.stream({provider:route,model:"gpt-5.4"}))old.push(chunk);
  assert.equal(old[0].tag,"one");
  const fresh=[];for await(const chunk of proxy.stream({provider:route,model:"gpt-5.4"}))fresh.push(chunk);
  assert.equal(fresh[0].tag,"two");
  assert.equal(f.watchers.get("loader/volatile-update").values().next().value.options.global,true);
  await feature.dispose();
});

test("invalid new profile blocks new prepares but freshness does not poison an old prepared call",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options),route=accountRouteId(A),proxy=f.routes.get(route);
  const prepared=await proxy.prepareCall(route,"gpt-5.4");
  assert.equal(await feature.updateProfile({invalid:true}),false);
  await assert.rejects(proxy.prepareCall(route,"gpt-5.4"),(error)=>error.code==="ACCOUNT_PROFILE_INVALID");
  const chunks=[];for await(const chunk of prepared.stream({provider:route,model:"gpt-5.4"}))chunks.push(chunk);
  assert.equal(chunks[0].tag,"initial");assert.equal(feature.status.errorCode,"ACCOUNT_PROFILE_INVALID");
  await feature.dispose();
});

test("login reactivation and synchronous removal never resurrect tombstoned account routes",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options),route=accountRouteId(A);
  feature.remove(A);assert.equal(f.routes.has(route),false);
  await feature.reconcile();assert.equal(f.routes.has(route),false);
  await assert.rejects(f.invoke("profile",{sessionId:"s",accountId:A}),(error)=>error.code==="ACCOUNT_UNAVAILABLE");
  assert.equal(f.profileCalls(),0);
  f.records.set(A,grant("A"));await feature.reactivate(A);assert.equal(f.routes.has(route),true);
  await assert.rejects(f.invoke("setDefault",{sessionId:"s",accountId:"copilot-auth/account-missing"}),(error)=>error.code==="ACCOUNT_UNAVAILABLE");
  await feature.dispose();
});

test("beforeDispatch freshness writes only the selected account and then publishes availability",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options),main=structuredClone(f.records.get(MAIN)),b=structuredClone(f.records.get(B));
  const options=f.adapters.find((value)=>value.accountId===A),events=f.events.length;
  await options.beforeDispatch({accountId:A,routeId:accountRouteId(A)});
  await options.beforeDispatch({accountId:A,routeId:accountRouteId(A)});
  assert.equal(f.refreshCalls(),1);assert.deepEqual(f.writes,[A]);assert.ok(f.events.length>=events);
  assert.deepEqual(f.records.get(MAIN),main);assert.deepEqual(f.records.get(B),b);assert.equal(f.reads.includes(MAIN),true); // Read-only default identity resolution is expected; auth refresh writes remain A-only.
  f.markerState.deactivate();await assert.rejects(options.beforeDispatch({accountId:A}),(error)=>error.code==="POLICY_UNAVAILABLE");
  assert.equal(f.refreshCalls(),1);await feature.dispose();
});

test("default HTTP wiring derives selected endpoint and refreshes access plus models atomically",async(t)=>{
  const requests=[];
  t.mock.method(globalThis,"fetch",async(url,init)=>{
    requests.push({url,init});
    if(url.endsWith("/copilot_internal/v2/token"))return{ok:true,json:async()=>({token:"FAKE_HTTP_ACCESS",expires_at:Date.now()/1000+3600,refresh_in:1200})};
    return{ok:true,json:async()=>({data:[{id:"gpt-5.4",model_picker_enabled:true,policy:{state:"enabled"},capabilities:{supports:{tool_calls:true}}}]})};
  });
  const f=fixture();delete f.options.refreshAccess;
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  await f.adapters.find((value)=>value.accountId===A).beforeDispatch({accountId:A});
  assert.deepEqual(requests.map((row)=>row.url),["https://api.company-a.ghe.com/copilot_internal/v2/token","https://copilot-api.company-a.ghe.com/models"]);
  assert.ok(requests.every((row)=>row.init.redirect==="error"&&row.init.signal instanceof AbortSignal));
  assert.equal(f.records.get(A).payload.access,"FAKE_HTTP_ACCESS");assert.deepEqual(f.records.get(A).payload.availableModelIds,["gpt-5.4"]);
  assert.deepEqual(f.writes,[A]);await feature.dispose();
});

test("attachment/header/replay integrations forward only supported runtime seams",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options),options=f.adapters[0];
  assert.deepEqual(options.resolveAttachments(),{fixture:true});
  assert.deepEqual(options.resolveImageAccess({fixture:"attachments"},{path:"/host/image"}),{attachments:{fixture:"attachments"},path:"mapped:/host/image"});
  const headers=new Headers({"x-safe":"yes"});assert.equal(options.prepareHeaders({provider:"github-copilot"},headers),headers);
  options.onReplayDegrade({reason:"https://private.example/FAKE_SECRET_REPLAY"});
  assert.equal(JSON.stringify(f.logs).includes("FAKE_SECRET_REPLAY"),false);await feature.dispose();
});

test("profile change during import is captured before any route registration",async()=>{
  const loading=deferred(),f=fixture({runtimeLoader:()=>loading.promise});
  const pending=createSessionAccountFeature(f.ctx,f.options);
  f.setProfile({tag:"latest"});await f.emitVolatile();loading.resolve(f.runtime);
  const feature=await pending;assert.ok(f.registered.every((row)=>row.tag==="latest"));await feature.dispose();
});

test("settings change during initial compile catches up before publication",async()=>{
  const first=deferred(),entered=deferred();let once=true;
  const f=fixture({createDelegate:async(raw)=>{if(once){once=false;entered.resolve();await first.promise;}}});
  const pending=createSessionAccountFeature(f.ctx,f.options);await entered.promise;
  f.setProfile({tag:"latest"});const update=f.emitVolatile();first.resolve();
  const feature=await pending;await update;
  assert.ok(f.registered.every((row)=>row.tag==="latest"));await feature.dispose();
});

test("obsolete settings compile failure cannot poison the latest valid profile",async()=>{
  const old=deferred();const f=fixture({createDelegate:async(raw)=>{if(raw.tag==="old-fail"){await old.promise;throw new Error("FAKE_SECRET_STALE");}}});
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  const stale=feature.updateProfile({tag:"old-fail"});const latest=feature.updateProfile({tag:"new-valid"});
  await latest;old.resolve();assert.equal(await stale,false);
  assert.equal(feature.status.phase,"ready");assert.ok(feature.registry.accounts().every((row)=>row.routeAvailable===true));
  assert.equal(JSON.stringify(f.logs).includes("FAKE_SECRET_STALE"),false);await feature.dispose();
});

test("disposal during initial profile compilation revokes late delegates and Remote",async()=>{
  const first=deferred(),entered=deferred();const f=fixture({createDelegate:async()=>{entered.resolve();await first.promise;}});
  const pending=createSessionAccountFeature(f.ctx,f.options);await entered.promise;
  await f.disposeContext();first.resolve();const feature=await pending;
  assert.equal(feature.status.phase,"disposed");assert.equal(f.routes.size,0);assert.equal(f.services.has("copilotAccounts"),false);
  assert.ok(f.delegates.every((delegate)=>delegate.disposed));
});

test("loader/profile failures expose static status only, and profile getter can later repair",async()=>{
  const f=fixture({runtimeLoader:async()=>{throw new Error("https://private.example/FAKE_SECRET_RUNTIME");}});
  const failed=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(failed.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");assert.equal(f.registered.length,0);
  assert.equal(JSON.stringify(f.logs).includes("FAKE_SECRET_RUNTIME"),false);await failed.dispose();
  let broken=true;const recover=fixture({getProfile:()=>{if(broken)throw new Error("private");return{tag:"fixed"};}});
  const feature=await createSessionAccountFeature(recover.ctx,recover.options);
  assert.deepEqual([...recover.routes.keys()],[GLOBAL_COPILOT_ROUTE]);assert.ok(recover.remote());assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);broken=false;await recover.emitVolatile();
  assert.equal(recover.routes.size,3);await feature.dispose();
});

function nativeActors(f){
  const agents=new Map(),sessions=new Map(),owners=new Map();
  const directory={get:(id)=>agents.get(id),isOwnedBy:(id,owner)=>owners.get(id)===owner,roots:()=>[...agents.values()].filter((agent)=>owners.get(agent.id)===undefined),list:()=>[...agents.values()]};
  f.services.set("agents",directory);f.services.set("sessions",{get:(id)=>sessions.get(id)});
  const add=(id,provider="github-copilot",options={})=>{
    const selections=[];let selected={provider,model:"gpt-5.4",reasoningEffort:"high"};
    const immutable=Object.freeze({config:Object.freeze({...selected})});
    const session={id,header:Object.freeze({version:4,id,...(options.origin?{origin:options.origin}:{}),createdAt:1000,isSeeded:false,delegationDepth:options.owner?1:0}),requestHeader:()=>immutable,seq:0};
    const actor={id,session,status:options.status??"idle",ctx:options.ctx??f.ctx,selections,model:{current:()=>({...selected}),select(value){selected={...value};selections.push({...value});session.seq++;}}};
    agents.set(id,actor);sessions.set(id,session);if(options.owner)owners.set(id,options.owner);return actor;
  };
  const announce=async(agent,source="startup")=>{for(const row of [...(f.watchers.get("agent/created")?.values()??[])])await row.callback({agent,source,signal:new AbortController().signal});};
  return{add,announce,agents,sessions,owners,directory};
}

test("one public owner registers managed and pinned routes only after request-state guard",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(new Set(f.routes.values()).size,1);assert.equal(f.registered.length,1);
  assert.equal(feature.hub.adapter,f.routes.get(GLOBAL_COPILOT_ROUTE));
  assert.notEqual(feature.registry.delegateForAccount(A),feature.hub.adapter);
  assert.equal(f.stateFactories.length,1);assert.equal(f.stateFactories[0].routes,0);
  assert.equal(f.stateObservers.length,1);assert.equal(f.stateObservers[0].routes,3);
  assert.equal(f.stateObservers[0].settings.isManagedProvider(GLOBAL_COPILOT_ROUTE),true);
  assert.equal(f.stateObservers[0].settings.isManagedProvider(accountRouteId(A)),true);
  assert.equal(f.stateObservers[0].settings.isManagedProvider("github-copilot"),false);
  const pinned=await feature.hub.adapter.prepareCall(accountRouteId(A),"gpt-5.4"),global=await feature.hub.adapter.prepareCall(GLOBAL_COPILOT_ROUTE,"gpt-5.4");
  for await(const _ of pinned.stream({provider:accountRouteId(A),model:"gpt-5.4",messages:[],sessionId:"s"})){}
  for await(const _ of global.stream({provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",messages:[],sessionId:"s"})){}
  assert.deepEqual(f.streamRequests.map((row)=>row.accountId),[A,B]);
  assert.equal(f.scopeCalls.at(-1).logicalProvider,GLOBAL_COPILOT_ROUTE);
  assert.equal(typeof f.scopeCalls.at(-1).defaultEpoch,"string");
  f.notices.set("s",{id:"10000000-0000-4000-8000-000000000001",sessionId:"s",accountId:A,code:"ACCOUNT_REQUEST_FAILED",logicalProvider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",privateDiagnostic:"FAKE_SECRET_NOTICE"});
  const noticeCatalog=await f.invoke("catalog",{sessionId:"s"});assert.ok(f.stateNotices.includes("s"));
  assert.equal(noticeCatalog.notice?.code,"ACCOUNT_REQUEST_FAILED");assert.equal(noticeCatalog.notice?.logicalProvider,GLOBAL_COPILOT_ROUTE);
  assert.equal(JSON.stringify(noticeCatalog).includes("FAKE_SECRET_NOTICE"),false);
  await feature.dispose();assert.equal(f.stateDisposed(),1);assert.equal(f.services.has("copilotManagedDefault"),false);
});


test("explicit default action acknowledges after managed reconcile but never rebinds pinned or prepared calls",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options);
  await f.invoke("bind",{sessionId:"s",accountId:B,expected:f.agent.selected});
  const prepared=await feature.hub.adapter.prepareCall(GLOBAL_COPILOT_ROUTE,"gpt-5.4");
  const before=feature.managed.defaultEpoch;
  await f.invoke("setDefault",{sessionId:"s",accountId:A});
  assert.equal(feature.managed.defaultEpoch,"chosen-1");assert.notEqual(feature.managed.defaultEpoch,before);
  assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),true);
  assert.equal(f.agent.selected.provider,accountRouteId(B));
  for await(const _ of prepared.stream({provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",messages:[],sessionId:"s"})){}
  for await(const _ of feature.hub.adapter.stream({provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",messages:[],sessionId:"s"})){}
  assert.deepEqual(f.streamRequests.slice(-2).map((row)=>row.accountId),[B,A]);
  const catalog=await f.invoke("catalog",{sessionId:"s"});
  assert.equal(catalog.accounts.find((row)=>row.id===A).globalActive,true);assert.equal(catalog.accounts.find((row)=>row.id===B).globalActive,false);
  await feature.dispose();
});

test("managed identity is unique normalized OAuth match, never a display active flag or first-slot guess",async()=>{
  const f=fixture();f.records.set(MAIN,grant("UNKNOWN"));
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);
  let catalog=await f.invoke("catalog",{sessionId:"s"});assert.ok(catalog.accounts.every((row)=>row.globalActive===false&&row.active===false));
  await assert.rejects(feature.hub.adapter.prepareCall(GLOBAL_COPILOT_ROUTE,"gpt-5.4"),(error)=>error.code==="ACCOUNT_UNAVAILABLE");
  f.records.set(MAIN,{kind:"grant",payload:{...structuredClone(f.records.get(B).payload),enterpriseUrl:"https://COMPANY-B.ghe.com/",access:"FAKE_MAIN_ROTATED_DIFFERENT_ACCESS",copilotDefaultEpoch:7}});
  await feature.reconcile();assert.equal(feature.managedDefault.isAvailable(),true);assert.equal(feature.managed.defaultEpoch,"7");
  catalog=await f.invoke("catalog",{sessionId:"s"});assert.equal(catalog.accounts.find((row)=>row.id===B).globalActive,true);
  f.records.set("copilot-auth/account-duplicate",grant("B"));await feature.reconcile();
  assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);
  catalog=await f.invoke("catalog",{sessionId:"s"});assert.ok(catalog.accounts.every((row)=>row.globalActive===false));
  await feature.dispose();
});

test("missing/deleted defaults stay ready-unavailable; only proven auth/wire override is unmanaged",async()=>{
  const f=fixture(),feature=await createSessionAccountFeature(f.ctx,f.options);
  feature.remove(B);assert.equal(f.routes.has(accountRouteId(B)),false);assert.equal(f.routes.has(accountRouteId(A)),true);
  await feature.refreshDefault();assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);
  assert.equal(feature.hub.adapter.providerInfo(GLOBAL_COPILOT_ROUTE).id,GLOBAL_COPILOT_ROUTE);
  f.records.delete(MAIN);await feature.refreshDefault();assert.equal(feature.managedDefault.isReady(),true);
  f.records.set(MAIN,{kind:"api-key",key:"FAKE_EXPLICIT_API_KEY"});await feature.refreshDefault();
  assert.equal(feature.managedDefault.isReady(),false);assert.equal(feature.managedDefault.isAvailable(),false);
  let catalog=await f.invoke("catalog",{sessionId:"s"});assert.ok(catalog.accounts.every((row)=>row.globalActive===false));
  f.records.set(MAIN,grant("A"));await feature.refreshDefault();assert.equal(feature.managedDefault.isReady(),true);
  for(const override of [{apiKeyEnv:"FAKE_REF"},{headers:{Authorization:"FAKE_OVERRIDE"}},{api:"openai-responses"},{baseURL:"https://unsupported.invalid"}]){
    f.setProfile({tag:"override",...override});await f.emitVolatile();assert.equal(feature.managedDefault.isReady(),false);
    catalog=await f.invoke("catalog",{sessionId:"s"});assert.ok(catalog.accounts.every((row)=>row.globalActive===false));
  }
  f.setProfile({invalid:true});await f.emitVolatile();assert.equal(feature.managedDefault.isReady(),true);assert.equal(feature.managedDefault.isAvailable(),false);
  await feature.dispose();
});

test("ordinary same-root native migration is released, next-step only and never overwrites aliases/children/scopes",async()=>{
  const f=fixture(),n=nativeActors(f),legacy=n.add("legacy","github-copilot",{status:"running"}),pinned=n.add("pinned",accountRouteId(A)),other=n.add("other","different-provider"),child=n.add("child","github-copilot",{origin:"subagent",owner:legacy});
  const isolated=n.add("isolated","github-copilot",{ctx:{get:(name)=>name==="llm"?{different:true}:f.services.get(name)}});
  const header=legacy.session.requestHeader(),frozen=Object.freeze({provider:"github-copilot",model:"gpt-5.4",reasoningEffort:"high"});
  const feature=await createSessionAccountFeature(f.ctx,f.options);
  assert.deepEqual(legacy.model.current(),{provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",reasoningEffort:"high"});
  assert.equal(legacy.selections.length,1);assert.equal(legacy.session.requestHeader(),header);assert.equal(header.config.provider,"github-copilot");assert.equal(frozen.provider,"github-copilot");
  for(const actor of [pinned,other,child,isolated])assert.equal(actor.selections.length,0);
  const ownsAgent=f.stateObservers[0].settings.ownsAgent;
  assert.equal(ownsAgent(legacy),true);assert.equal(ownsAgent(pinned),true);assert.equal(ownsAgent(child),true,"request-state observation includes owned native children");
  assert.equal(ownsAgent(isolated),false);assert.equal(ownsAgent({...legacy}),false,"same id is not exact runtime ownership");
  const resumed=n.add("resumed");await n.announce(resumed,"resume");assert.equal(resumed.model.current().provider,GLOBAL_COPILOT_ROUTE);
  const fresh=n.add("fresh");await n.announce(fresh,"startup");assert.equal(fresh.model.current().provider,GLOBAL_COPILOT_ROUTE);
  const newlyPinned=n.add("newly-pinned",accountRouteId(B));await n.announce(newlyPinned);assert.equal(newlyPinned.selections.length,0);
  await feature.refreshDefault();assert.equal(legacy.selections.length,1,"scanning managed roots must not rebind/rewrite a selected route");
  const late=n.add("late-selection"),gate=deferred(),entered=deferred(),read=f.credentials.readRecord.bind(f.credentials);
  f.credentials.readRecord=async(id)=>{if(id===MAIN){entered.resolve();await gate.promise;}return read(id);};
  const initializing=n.announce(late,"startup");await entered.promise;
  late.model.select({provider:accountRouteId(A),model:"gpt-5.4",reasoningEffort:"high"});gate.resolve();await initializing;
  assert.equal(late.model.current().provider,accountRouteId(A));assert.equal(late.selections.length,1,"async migration refresh must not overwrite a newer explicit bound choice");
  f.credentials.readRecord=read;
  assert.equal(f.watchers.has("llm/stream"),false,"feature never rewrites frozen request options in a stream waterfall");
  await feature.dispose();assert.equal(feature.managedDefault.isReady(),false);
});

test("request-state guard failure and late initialization publish no routes or leaked observers",async()=>{
  const failed=fixture({requestStateFactory:async()=>{throw new Error("FAKE_PRIVATE_PROJECTION");}}),feature=await createSessionAccountFeature(failed.ctx,failed.options);
  assert.equal(feature.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");assert.equal(failed.routes.size,0);assert.equal(failed.adapters.length,0);assert.equal(JSON.stringify(failed.logs).includes("PRIVATE"),false);
  const missing=fixture();delete missing.options.requestStateFactory;const normative=await createSessionAccountFeature(missing.ctx,missing.options);
  assert.equal(normative.status.errorCode,"ACCOUNT_RUNTIME_UNAVAILABLE");assert.equal(missing.routes.size,0);assert.equal(missing.adapters.length,0,"production manager cannot silently fall back without normative projection capability");
  const gate=deferred(),entered=deferred();let disposed=0;
  const late=fixture({requestStateFactory:async()=>{entered.resolve();await gate.promise;return{scopeForRequest(){},notice(){},observeFailures(){},dispose(){disposed++;}};}});
  const pending=createSessionAccountFeature(late.ctx,late.options);await entered.promise;await late.disposeContext();gate.resolve();const stopped=await pending;
  assert.equal(stopped.status.phase,"disposed");assert.equal(late.routes.size,0);assert.equal(disposed,1);
});

const nativeModules=new URL("../../dsh-session-account-review/installed/dsh/node_modules/",import.meta.url);
const coreUrl=new URL("@deepseek-ai/cordis/lib/index.js",nativeModules);
const protocolUrl=new URL("@deepseek-ai/dsh-typert-protocol/lib/index.js",nativeModules);
test("optional real Host Context owns native Remote and disposes assembled feature",{skip:existsSync(coreUrl)&&existsSync(protocolUrl)?false:"optional extracted Host Context fixture absent"},async(t)=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>assert.fail("Network forbidden in native feature test");t.after(()=>{globalThis.fetch=previous;});
  const [{Context},protocol]=await Promise.all([import(coreUrl.href),import(protocolUrl.href)]);
  const f=fixture(),root=new Context();t.after(()=>root.fiber.dispose());
  for(const [name,value] of f.services)root.provide(name,value);
  root.provide("remoteAccess",{allows:()=>true});
  f.runtime.Context=Context;f.runtime.remoteProtocol=protocol;
  const feature=await createSessionAccountFeature(root,f.options);
  assert.equal(feature.status.phase,"ready");assert.equal(f.routes.size,3);
  const scoped=root.extend({invocation:{peer:{principal:{kind:"owner"},signal:new AbortController().signal},signal:new AbortController().signal}});
  const catalog=await scoped.get("copilotAccounts").catalog({sessionId:"s"});
  assert.equal(catalog.accounts.length,2);assert.equal(catalog.accounts[0].routeAvailable,true);
  await assert.rejects(root.get("copilotAccounts").catalog({sessionId:"s"}),(error)=>error.code==="OWNER_REQUIRED");
  await feature.dispose();assert.equal(f.routes.size,0);assert.equal(root.get("copilotAccounts"),undefined);
});

test("optional actual LLM core feature keeps managed/pinned replay under one owner with normative projection",{skip:existsSync(coreUrl)?false:"optional extracted native core fixture absent"},async(t)=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>assert.fail("Network forbidden in actual-core feature test");t.after(()=>{globalThis.fetch=previous;});
  const load=(path)=>import(new URL(path,nativeModules).href);
  const [cordis,core,session,agent,projection,query,schema,protocol]=await Promise.all([
    load("@deepseek-ai/cordis/lib/index.js"),load("@deepseek-ai/dsh-llm/lib/index.js"),load("@deepseek-ai/dsh-session/lib/index.js"),load("@deepseek-ai/dsh-agent/lib/index.js"),
    load("@deepseek-ai/dsh-session-projection/lib/index.js"),load("@deepseek-ai/dsh-session-query/lib/index.js"),load("@deepseek-ai/schemastery/lib/index.mjs"),load("@deepseek-ai/dsh-typert-protocol/lib/index.js")]);
  const f=fixture(),root=new cordis.Context();t.after(()=>root.fiber.dispose());
  for(const[name,value]of f.services)if(name!=="llm")root.provide(name,value);
  root.provide("remoteAccess",{allows:()=>true});new session.SessionStore(root);new agent.AgentRegistry(root);new projection.default(root);new query.SessionQueryEngine(root);
  const llm=new core.LlmRuntime(root);
  class Builtin extends core.LlmAdapter{providerInfo(provider){return{id:provider,name:"Synthetic builtin"};}async*stream(){assert.fail("must never dispatch unmanaged builtin during feature test");}}
  llm.registerAdapter(["github-copilot"],new Builtin());
  Object.assign(f.runtime,{Context:cordis.Context,LlmAdapter:core.LlmAdapter,LlmError:core.LlmError,symbols:cordis.symbols,Schema:schema.default,lastAssistantStreamChunk:core.lastAssistantStreamChunk,remoteProtocol:protocol});
  delete f.options.requestStateFactory; // ACTUAL normative projection manager, no fake fallback.
  const s=root.sessions.create("native-feature-session",{meta:{createdAt:1000,delegationDepth:0}});
  const read=()=>s.snapshotEvents().reduce(agent.modelSelectionProjectionDefinition.apply,agent.modelSelectionProjectionDefinition.init());
  const machine={id:s.id,session:s,ctx:root,status:"idle",model:new agent.AgentModel(read,s,{provider:"github-copilot",model:"gpt-5.4",reasoningEffort:"high"})};
  const detach=root.agents.enter(machine);t.after(()=>detach());await root.agents.announce(machine,"startup");
  const feature=await createSessionAccountFeature(root,f.options);t.after(()=>feature.dispose());
  assert.equal(feature.status.phase,"ready");assert.equal(machine.model.current().provider,GLOBAL_COPILOT_ROUTE);
  assert.equal(root.get("copilotManagedDefault").isReady(),true);assert.equal(feature.hub.routes().length,3);
  await f.options.setDefaultAccountById(A);await feature.reconcile();
  const route=accountRouteId(A);machine.model.select({provider:route,model:"gpt-5.4",reasoningEffort:"high"});
  s.append("turn/start",{turn:1});s.append("step/start",{turn:1,step:1});s.append("request/header",{header:{config:{provider:route,model:"gpt-5.4",reasoningEffort:"high"}},reason:"initial"});
  const collect=async(source)=>{const chunks=[];for await(const chunk of source)chunks.push(chunk);return chunks;};
  const invoke=async(provider,messages=[])=>{const call=await llm.prepareCall({provider,model:"gpt-5.4",reasoningEffort:"high"});return collect(call.stream({...call.config,messages,sessionId:s.id,signal:new AbortController().signal}));};
  const pinned=await invoke(route);
  const assembler=new core.BlockAssembler(),acc=new core.AssistantStreamAccumulator();pinned.forEach((chunk,index)=>{assembler.push(chunk);acc.push({time:1000+index,chunk});});
  const message=core.createAssistantMessage({content:assembler.blocks(),source:{provider:route,model:"gpt-5.4",replayState:pinned.at(-1).replayState}});
  s.append("assistant/message",{turn:1,step:1,message,stream:acc.snapshot()},{surfaceOp:"append"});s.append("step/end",{turn:1,step:1});
  machine.model.select({provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",reasoningEffort:"high"});s.append("step/start",{turn:1,step:2});
  s.append("request/header",{header:{config:{provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",reasoningEffort:"high"}},reason:"change"});
  await invoke(GLOBAL_COPILOT_ROUTE,[message]);
  assert.deepEqual(f.streamRequests.at(-1).messages[0].source.replayState,message.source.replayState,"actual core does not prestrip same-account alias replay across the common public adapter owner");
  assert.equal(f.streamRequests.at(-1).messages[0].source.provider,route);
  const legacy={...message,source:{...message.source,provider:"github-copilot"}};
  await invoke(GLOBAL_COPILOT_ROUTE,[legacy]);assert.equal(f.streamRequests.at(-1).messages[0].source.replayState,undefined,"raw builtin ownership is never inferred");
  await f.options.setDefaultAccountById(B);await feature.reconcile();
  await invoke(GLOBAL_COPILOT_ROUTE,[message]);assert.equal(f.streamRequests.at(-1).accountId,B);assert.equal(f.streamRequests.at(-1).messages[0].source.replayState,undefined);
  assert.equal(feature.requestState.scopeForRequest instanceof Function,true);
  const [sub,fork]=await Promise.all([load("@deepseek-ai/dsh-subagent/lib/index.js"),load("@deepseek-ai/dsh-subagent-fork-in-process/lib/index.js")]);
  const parentSession=root.sessions.create("native-global-fork-parent",{meta:{createdAt:1000,delegationDepth:0}});
  const modelFor=(owner,options)=>new agent.AgentModel(()=>owner.snapshotEvents().reduce(agent.modelSelectionProjectionDefinition.apply,agent.modelSelectionProjectionDefinition.init()),owner,options);
  const parentOptions={provider:route,model:"gpt-5.4",reasoningEffort:"high"},parentModel=modelFor(parentSession,parentOptions);
  parentModel.select(parentOptions);parentSession.append("turn/start",{turn:1});parentSession.append("request/header",{header:{config:parentOptions},reason:"initial"});parentSession.append("turn/end",{turn:1,reason:{kind:"completed"}});
  parentModel.select({provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",reasoningEffort:"high"});parentSession.append("turn/start",{turn:2});parentSession.append("request/header",{header:{config:{provider:GLOBAL_COPILOT_ROUTE,model:"gpt-5.4",reasoningEffort:"high"}},reason:"change"});
  const parent={id:parentSession.id,session:parentSession,ctx:root,status:"running",model:parentModel,options:parentOptions};
  const detachParent=root.agents.enter(parent);t.after(()=>detachParent());await root.agents.announce(parent,"startup");
  let forkProvider;fork.apply({subagents:{registerProvider(value){forkProvider=value;}}},{providerName:"fork"});
  const forkSeed=await forkProvider.prepareContinuable({parent}),childOptions=sub.resolveChildAgentOptions(parent,undefined,1);
  const childSession=root.sessions.create("native-global-fork-child",{seed:forkSeed.seed,inheritedEventCount:forkSeed.seed.length,meta:{createdAt:1000,origin:"subagent",parentSession:parent.id,isSeeded:true,delegationDepth:1}});
  childSession.append("subagent/descriptor",sub.snapshotSubagentDescriptor({mode:"continuable",provider:"fork",label:"synthetic",agentProvider:childOptions.provider,agentModel:childOptions.model,agentReasoningEffort:childOptions.reasoningEffort}));
  const childModel=modelFor(childSession,childOptions),child={id:childSession.id,session:childSession,ctx:root,status:"idle",model:childModel,options:childOptions};
  assert.equal(childModel.current().provider,route,"native fork seed would otherwise revive the old pinned account mode");
  const detachChild=root.agents.enter(child,parent);t.after(()=>detachChild());await root.agents.announce(child,"startup");
  assert.equal(childModel.current().provider,GLOBAL_COPILOT_ROUTE,"assembled fork policy includes logical managed route family, not aliases only");
  assert.equal(parentSession.requestHeader().config.provider,GLOBAL_COPILOT_ROUTE);
  await feature.dispose();assert.equal(root.get("copilotManagedDefault"),undefined);assert.equal(feature.hub.routes().length,0);
});
