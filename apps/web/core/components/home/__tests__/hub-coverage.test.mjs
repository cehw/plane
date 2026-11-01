import test from "node:test";
import assert from "node:assert/strict";
import {countryGroups,countryName} from "../hub-coverage.helpers.ts";

test("continent grouping conserves counts and keeps source codes in one group",()=>{
  const rows=[["CN",1,2,3],["HK",0,4,5],["US",6,7,8],["BR",0,1,2],["FR",0,3,4],["ZA",1,0,2],["AU",0,5,6],["ZZ",0,1,0]];
  const groups=countryGroups(rows);
  assert.equal(groups.flatMap(g=>g.rows).length,rows.length);
  assert.equal(groups.reduce((n,g)=>n+g.recent,0),rows.reduce((n,r)=>n+r[2]+r[3],0));
  assert.equal(groups.reduce((n,g)=>n+g.total,0),rows.reduce((n,r)=>n+r[1]+r[2]+r[3],0));
  assert.equal(groups.find(g=>g.name==="亚洲").rows.length,2);
  assert.equal(groups.find(g=>g.name==="未归类").rows[0][0],"ZZ");
});
test("recent countries exclude old-only records without dropping their optional history",()=>{
  const rows=[["US",4,0,0],["FR",0,1,1]];
  assert.equal(countryGroups(rows).flatMap(g=>g.rows).length,1);
  assert.equal(countryGroups(rows,"",true).flatMap(g=>g.rows).length,2);
});
test("name, code and continent search; unknown codes stay visible",()=>{
  const rows=[["CN",0,1,1],["CA",0,1,1],["unknown",0,1,0]];
  assert.equal(countryGroups(rows,"中国")[0].rows[0][0],"CN");
  assert.equal(countryGroups(rows,"ca")[0].name,"北美洲");
  assert.equal(countryGroups(rows,"亚洲")[0].rows.length,1);
  assert.equal(countryName("UNKNOWN"),"UNKNOWN");
  assert.deepEqual(countryGroups([],""),[]);
});
test("cross-continental and territory codes have a single consistent group",()=>{
  const rows=["RU","TR","TW","XK","GF","MX","AQ"].map(c=>[c,0,1,0]);
  const actual=Object.fromEntries(countryGroups(rows).flatMap(g=>g.rows.map(r=>[r[0],g.name])));
  assert.deepEqual(actual,{TR:"亚洲",TW:"亚洲",RU:"欧洲",XK:"欧洲",MX:"北美洲",GF:"南美洲",AQ:"南极洲"});
});
