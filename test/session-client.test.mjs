import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionAccountClient, SessionAccountClientError } from "../src/session-client.mjs";
const ID = "copilot-auth/account-a";
const deferred = () => { let resolve,reject; const promise = new Promise((done,fail) => {resolve=done;reject=fail;}); return {promise,resolve,reject}; };
function fixture(overrides = {}) {
  const calls = [];
  let generation = {host:"remote-A",epoch:1}, current = true;
  const connection = { generation: {getSnapshot:()=>generation}, rpc: {call:async(...args)=>{calls.push(args);return overrides.call?overrides.call(...args):{ok:true,value:{host:"remote-A"}};}} };
  const client = createSessionAccountClient({sessionId:"session-A",connection,isCurrent:()=>current});
  return {client,connection,calls,changeGeneration:(next)=>{generation=next;},retire:()=>{current=false;}};
}
const rejected = (promise,code) => assert.rejects(promise,(error)=>error instanceof SessionAccountClientError && error.code===code && !error.message.includes("FAKE_SECRET"));

test("client uses captured native Connection RPC and exact named request payload", async (t) => {
  t.mock.method(globalThis,"fetch",async()=>assert.fail("must not use page fetch or localhost REST"));
  const f = fixture();
  await f.client.catalog();
  await f.client.bind({accountId:ID,expected:{provider:"github-copilot",model:"gpt-5.4",reasoningEffort:"high",account:{secret:"FAKE_SECRET"}}});
  await f.client.profile({accountId:ID});
  await f.client.setDefault({accountId:ID});
  assert.deepEqual(f.calls.map((call)=>call.slice(0,2)),[["/api","copilotAccounts/catalog"],["/api","copilotAccounts/bind"],["/api","copilotAccounts/profile"],["/api","copilotAccounts/setDefault"]]);
  assert.deepEqual(f.calls[0][2],{args:{request:{sessionId:"session-A"}}});
  assert.deepEqual(f.calls[1][2],{args:{request:{sessionId:"session-A",accountId:ID,expected:{provider:"github-copilot",model:"gpt-5.4",reasoningEffort:"high"}}}});
  assert.equal(JSON.stringify(f.calls.map((call)=>call[2])).includes("FAKE_SECRET"),false);
  assert.ok(f.calls.every((call)=>call[3] instanceof AbortSignal));
});

test("caller cannot replace the bound session id or send malformed selections", async () => {
  const f = fixture();
  await rejected(f.client.bind({sessionId:"another-session",accountId:ID}),"INVALID_ARGUMENT");
  await rejected(f.client.bind({accountId:ID,expected:{provider:"github-copilot"}}),"INVALID_ARGUMENT");
  await rejected(f.client.profile({accountId:null}),"INVALID_ARGUMENT");
  await rejected(f.client.setDefault({accountId:42}),"INVALID_ARGUMENT");
  assert.equal(f.calls.length,0);
  await f.client.bind({accountId:null});
  assert.equal(f.calls[0][2].args.request.accountId,null);
});

test("retired binding and changed Host generation fail before issuing a call", async () => {
  const a = fixture();a.retire();
  await rejected(a.client.catalog(),"STALE_SESSION");
  assert.equal(a.calls.length,0);
  const b = fixture();b.changeGeneration({host:"remote-B",epoch:2});
  await rejected(b.client.catalog(),"STALE_SESSION");
  assert.equal(b.calls.length,0);
});

test("old-host success is rejected after await instead of updating current view", async () => {
  const response = deferred(), f = fixture({call:()=>response.promise});
  const pending = f.client.catalog();
  f.changeGeneration({host:"remote-B",epoch:2});
  response.resolve({ok:true,value:{host:"old-host-result"}});
  await rejected(pending,"STALE_SESSION");
  assert.equal(f.calls.length,1);
});

test("same session ids on two hosts never share transports or results", async () => {
  const a = fixture({call:async()=>({ok:true,value:{host:"A"}})});
  const b = fixture({call:async()=>({ok:true,value:{host:"B"}})});
  assert.equal((await a.client.catalog()).host,"A");
  assert.equal((await b.client.catalog()).host,"B");
  assert.equal(a.calls.length,1);assert.equal(b.calls.length,1);
  a.retire();
  await rejected(a.client.profile({accountId:ID}),"STALE_SESSION");
  assert.equal((await b.client.profile({accountId:ID})).host,"B");
});

test("dispose aborts outstanding calls and rejects ignored late responses", async () => {
  const response = deferred(), f = fixture({call:()=>response.promise});
  const pending = f.client.catalog();
  const signal = f.calls[0][3];
  f.client.dispose();f.client.dispose();
  assert.equal(signal.aborted,true);
  response.resolve({ok:true,value:{ignored:true}});
  await rejected(pending,"STALE_SESSION");
  await rejected(f.client.catalog(),"STALE_SESSION");
  assert.equal(f.calls.length,1);
});

test("caller cancellation is honored without retrying mutations", async () => {
  const response = deferred(), f = fixture({call:()=>response.promise}), abort = new AbortController();
  const pending = f.client.bind({accountId:ID},abort.signal);
  abort.abort();
  response.resolve({ok:true,value:{committed:true}});
  await rejected(pending,"REQUEST_CANCELLED");
  assert.equal(f.calls.length,1);
  await rejected(f.client.catalog(abort.signal),"REQUEST_CANCELLED");
  assert.equal(f.calls.length,1);
});

test("transport failures and unknown server diagnostics use fixed safe messages", async () => {
  const transport = fixture({call:()=>{throw new Error("https://private.example/FAKE_SECRET");}});
  await rejected(transport.client.setDefault({accountId:ID}),"TRANSPORT_UNAVAILABLE");
  assert.equal(transport.calls.length,1);
  const known = fixture({call:async()=>({ok:false,error:{code:"POLICY_UNAVAILABLE",message:"FAKE_SECRET",details:{status:418}}})});
  await assert.rejects(known.client.catalog(),(error)=>error.code==="POLICY_UNAVAILABLE" && error.status===503 && !error.message.includes("FAKE_SECRET"));
  const unknown = fixture({call:async()=>({ok:false,error:{code:"UNKNOWN",message:"FAKE_SECRET"}})});
  await rejected(unknown.client.catalog(),"INTERNAL_ERROR");
});

test("missing binding validator/connection is not replaced by a global fallback", () => {
  assert.throws(()=>createSessionAccountClient({sessionId:"s",connection:{rpc:{call(){}}}}),/Invalid Session account request/);
  assert.throws(()=>createSessionAccountClient({sessionId:"",connection:{},isCurrent:()=>true}),/Invalid Session account request/);
});

test("unconnected generation and malformed native response fail safely", async () => {
  const calls = [];
  const client = createSessionAccountClient({sessionId:"s",connection:{generation:{getSnapshot:()=>undefined},rpc:{call:async()=>{calls.push(1);return{ok:true,value:{}};}}},isCurrent:()=>true});
  await rejected(client.catalog(),"TRANSPORT_UNAVAILABLE");
  assert.equal(calls.length,0);
  const malformed = fixture({call:async()=>({ok:true,value:[]})});
  await rejected(malformed.client.catalog(),"INTERNAL_ERROR");
});
