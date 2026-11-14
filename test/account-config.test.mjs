import { test } from "node:test";
import assert from "node:assert/strict";
import { readAccountConfig, fillMissingAccountModels } from "../src/account-config.mjs";
const service = (profile = {}, revision = 0) => ({ describe: () => [{ ns: "llm-pi-ai", revision, value: { providers: { "github-copilot": profile } } }] });
const editor = (profile={}) => ({entries:()=>[{options:{id:"llm-pi-ai",name:"@deepseek-ai/dsh-llm-pi-ai",config:{providers:{"github-copilot":profile}}}}]});

test("released describe value preserves explicit models, overrides and native auth/endpoint settings without get", () => {
  const profile = { models: [{id:"kept",contextWindow:12345}], modelOverrides: {kept:{maxTokens:100}}, apiKeyEnv:"FAKE_REF", baseURL:"https://example.invalid", headers:{"x-fixture":"yes"} };
  const settings=service(profile,4), result=readAccountConfig(settings,editor(profile));
  assert.equal(settings.get,undefined); assert.deepEqual(result,{profile,revision:4});
  result.profile.models.length=0; assert.equal(profile.models.length,1);
});
test("missing, malformed, ambiguous and throwing descriptors never become writable empty config", async () => {
  for(const settings of [{}, {describe:()=>[]}, {describe:()=>[{ns:"llm-pi-ai",revision:0}]},
    {describe:()=>[...service().describe(),...service().describe()]}, {describe:()=>{throw new Error("PRIVATE");}}, service([],0), service({},NaN)]) {
    let writes=0; settings.mutate=async()=>writes++;
    assert.throws(()=>readAccountConfig(settings,editor()),error=>error.code==="ACCOUNT_PROFILE_INVALID"&&!error.message.includes("PRIVATE"));
    await assert.rejects(fillMissingAccountModels(settings,["new"],editor())); assert.equal(writes,0);
  }
});
test("explicit empty/custom Models and overrides always remain owned by the user", async () => {
  for(const profile of [{models:[]},{models:[{id:"kept",maxTokens:32}]},{modelOverrides:{}},{modelOverrides:{kept:{}}}]) {
    const settings=service(profile); settings.mutate=()=>assert.fail("must not overwrite");
    assert.equal(await fillMissingAccountModels(settings,["new"],editor(profile)),false);
  }
});
test("missing directory fill uses exact current revision including zero", async () => {
  const settings=service({},0),calls=[];settings.mutate=async(...args)=>calls.push(args);
  assert.equal(await fillMissingAccountModels(settings,["a","a","b"],editor()),true);
  assert.deepEqual(calls,[["llm-pi-ai",[{op:"set",path:["providers","github-copilot","models"],value:[{id:"a"},{id:"b"}]}],0]]);
});
test("schema defaults do not masquerade as explicit profile fields", () => {
  const defaults={models:[],modelOverrides:{},apiKeyEnv:undefined,headers:{},defaultContextWindow:1000000};
  assert.deepEqual(readAccountConfig(service(defaults),editor()).profile,{});
  assert.deepEqual(readAccountConfig(service({...defaults,models:[{id:"resolved"}]}),editor({models:{__jsExpr:"synthetic"}})).profile,{models:[{id:"resolved"}]});
});
test("same-named native entry in another LLM realm cannot provide this Host configuration", async () => {
  const llm={},other={},key=Symbol.for("cordis.original"),settings=service(),e=editor();
  const entry=e.entries()[0];e.entries=()=>[entry];entry.ctx={get:()=>other};
  assert.throws(()=>readAccountConfig(settings,e,llm),{code:"ACCOUNT_PROFILE_INVALID"});
  settings.mutate=()=>assert.fail("foreign scope must never write");
  await assert.rejects(fillMissingAccountModels(settings,["new"],e,llm),{code:"ACCOUNT_PROFILE_INVALID"});
  entry.ctx={get:()=>({[key]:llm})};
  assert.deepEqual(readAccountConfig(settings,e,llm),{profile:{},revision:0});
});

test("unknown whole-object expression provenance or missing native entry fails closed", () => {
  assert.throws(()=>readAccountConfig(service(),undefined),{code:"ACCOUNT_PROFILE_INVALID"});
  assert.throws(()=>readAccountConfig(service(),editor({__jsExpr:"unresolved"})),{code:"ACCOUNT_PROFILE_INVALID"});
  const wrong=editor();wrong.entries=()=>[{options:{id:"llm-pi-ai",name:"other",config:{}}}];
  assert.throws(()=>readAccountConfig(service(),wrong),{code:"ACCOUNT_PROFILE_INVALID"});
});
