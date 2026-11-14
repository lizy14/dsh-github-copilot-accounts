// Actual released SettingsForms.describe/mutate and PiAi.Config. No Settings
// constructor (which imports legacy user files), app boot, credentials or HTTP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readAccountConfig, fillMissingAccountModels } from "../src/account-config.mjs";
const base = new URL("../../dsh-session-account-review/installed/dsh/node_modules/", import.meta.url);
const target = new URL("@deepseek-ai/dsh-settings/lib/index.js", base);
const present=existsSync(target);
async function fixture(t, initial) {
  const [{SettingsForms}, pi, {Context}] = await Promise.all([import(target),import(new URL("@deepseek-ai/dsh-llm-pi-ai/lib/index.js",base)),import(new URL("@deepseek-ai/cordis/lib/index.js",base))]);
  const root=new Context();t.after(()=>root.fiber.dispose());
  const llm={};root.provide("llm",llm);
  let raw=structuredClone(initial), beforeEdit=()=>{};
  const entry={ctx:root,id:"llm-pi-ai",options:{id:"llm-pi-ai",name:"@deepseek-ai/dsh-llm-pi-ai",config:raw},fiber:{uid:"fake-fiber",state:2,runtime:{Config:pi.Config},ctx:root,effectiveConfig:pi.Config(raw)}};
  function update(value){raw=structuredClone(value);entry.options.config=raw;entry.fiber.effectiveConfig=pi.Config(raw);}
  const settings=Object.create(SettingsForms.prototype);
  Object.assign(settings,{revisions:new Map(),presentations:new Map(),ownerContext:{emit(){},configEditor:{
    configuration:()=>[{entry,inherited:{},override:raw}],entries:()=>[entry],
    async edit(found,change){assert.equal(found,entry);await beforeEdit();update(change(raw,{}));},
  }}});
  return {settings,llm,configEditor:settings.ownerContext.configEditor,entry,update,setBeforeEdit:(fn)=>{beforeEdit=fn;}};
}
test("actual native Settings form exposes the complete provider configuration and never requires get",{skip:!present},async t=>{
  const raw={providers:{"github-copilot":{displayName:"Fixture",apiKeyEnv:"FAKE_REF",baseURL:"https://example.invalid",models:[{id:"gpt-5.4",contextWindow:12345}],modelOverrides:{"gpt-5.4":{maxTokens:100}}}}};
  const f=await fixture(t,raw);assert.equal(typeof f.settings.get,"undefined");
  const value=readAccountConfig(f.settings,f.configEditor,f.llm);
  assert.equal(value.profile.apiKeyEnv,"FAKE_REF");assert.equal(value.profile.baseURL,"https://example.invalid");
  assert.equal(value.profile.models[0].contextWindow,12345);assert.equal(value.profile.modelOverrides["gpt-5.4"].maxTokens,100);
  assert.equal(await fillMissingAccountModels(f.settings,["new"],f.configEditor,f.llm),false);
  assert.equal(readAccountConfig(f.settings,f.configEditor,f.llm).profile.models[0].contextWindow,12345);
});
test("actual native mutate rejects a concurrent configured-directory edit using the captured revision",{skip:!present},async t=>{
  const f=await fixture(t,{providers:{"github-copilot":{}}});
  f.setBeforeEdit(()=>f.update({providers:{"github-copilot":{models:[{id:"kept",contextWindow:12345}]}}}));
  await assert.rejects(fillMissingAccountModels(f.settings,["new"],f.configEditor,f.llm));
  assert.equal(readAccountConfig(f.settings,f.configEditor,f.llm).profile.models[0].id,"kept");
  assert.equal(readAccountConfig(f.settings,f.configEditor,f.llm).profile.models[0].contextWindow,12345);
});
test("actual native form can fill an absent directory without replacing other provider fields",{skip:!present},async t=>{
  const f=await fixture(t,{providers:{"github-copilot":{displayName:"Fixture"}}});
  assert.equal(await fillMissingAccountModels(f.settings,["gpt-5.4"],f.configEditor,f.llm),true);
  const value=readAccountConfig(f.settings,f.configEditor,f.llm).profile;
  assert.equal(value.displayName,"Fixture");assert.equal(value.models[0].id,"gpt-5.4");
});
