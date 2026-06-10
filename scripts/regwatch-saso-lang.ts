import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local","utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,"");}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
const UA="Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function detectLang(url:string):Promise<{lang:string|null,ar:number,la:number}>{
  const res=await fetch(url,{headers:{"User-Agent":UA},redirect:"follow",signal:AbortSignal.timeout(40000)});
  if(!res.ok) return {lang:null,ar:0,la:0};
  const buf=new Uint8Array(await res.arrayBuffer());
  const {extractText,getDocumentProxy}=await import("unpdf");
  const pdf=await getDocumentProxy(buf);
  const {text}=await extractText(pdf,{mergePages:true});
  const t=(Array.isArray(text)?text.join(" "):text??"").slice(0,6000);
  const ar=(t.match(/[؀-ۿ]/g)||[]).length;
  const la=(t.match(/[A-Za-z]/g)||[]).length;
  if(ar+la<40) return {lang:null,ar,la}; // unreadable/scanned
  return {lang: ar > la*0.25 ? "ar":"en", ar, la};
}
(async()=>{const svc=createServiceClient();
const r=await svc.from("regulators").select("id").eq("slug","sa-saso").single();
const items=await svc.from("regulatory_items").select("id,citation,source_url,source_language").eq("regulator_id",r.data!.id).order("citation");
let changed=0,same=0,unk=0;
for(const it of items.data??[]){
  try{const d=await detectLang(it.source_url as string);
    if(!d.lang){unk++;console.log(`  ? ${it.citation} (ar=${d.ar} la=${d.la} — scanned/empty)`);await sleep(200);continue;}
    if(d.lang!==it.source_language){await svc.from("regulatory_items").update({source_language:d.lang}).eq("id",it.id);changed++;console.log(`  ${it.source_language}→${d.lang}: ${it.citation} (ar=${d.ar} la=${d.la})`);}
    else same++;
  }catch(e){unk++;console.log(`  ERR ${it.citation}: ${(e as Error).message}`);}
  await sleep(250);
}
console.log(`\n✓ ${same} already-correct, ${changed} corrected, ${unk} unreadable`);
// final breakdown
const en=await svc.from("regulatory_items").select("id",{count:"exact",head:true}).eq("regulator_id",r.data!.id).eq("source_language","en");
const ar=await svc.from("regulatory_items").select("id",{count:"exact",head:true}).eq("regulator_id",r.data!.id).eq("source_language","ar");
console.log(`SASO source_language: en=${en.count}, ar=${ar.count}`);
})().catch(e=>console.error(e.message));
