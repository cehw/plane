import test from 'node:test';
import assert from 'node:assert/strict';
import { onlineCollectorHealth, onlineRows } from '../hub-summary.helpers.ts';
const now=Date.parse('2026-11-01T11:00:00Z');
const checked='2026-11-01T10:59:00Z';
const row={id:'hko',name:'HKO',cadence:'每 10 分钟',scheduled:true,status:'complete',max_age_minutes:40,last_collected_at:checked,time_label:'最近采集'};
test('healthy recent output is green; missing, failed and partial outputs are distinct',()=>{
 assert.equal(onlineCollectorHealth(row,checked,now).tone,'good');
 assert.equal(onlineCollectorHealth({...row,status:'failed'},checked,now).tone,'bad');
 assert.equal(onlineCollectorHealth({...row,status:'partial'},checked,now).tone,'warn');
 assert.equal(onlineCollectorHealth({...row,last_collected_at:undefined},checked,now).tone,'muted');
});
test('daily and weekly collectors follow their own cadence',()=>{
 assert.equal(onlineCollectorHealth({...row,last_collected_at:'2026-11-01T00:00:00Z',max_age_minutes:1560},checked,now).tone,'good');
 assert.equal(onlineCollectorHealth({...row,last_collected_at:'2026-10-26T00:00:00Z',max_age_minutes:11520},checked,now).tone,'good');
 assert.equal(onlineCollectorHealth({...row,last_collected_at:'2026-11-01T00:00:00Z'},checked,now).label,'采集延迟');
});
test('old snapshot, disabled cron, unknown scheduler and stale source observations cannot be green',()=>{
 assert.equal(onlineCollectorHealth(row,'2026-11-01T08:00:00Z',now).tone,'warn');
 assert.equal(onlineCollectorHealth({...row,scheduled:false},checked,now).label,'调度未启用');
 assert.equal(onlineCollectorHealth({...row,scheduled:null},checked,now).tone,'muted');
 assert.equal(onlineCollectorHealth({...row,last_observed_at:'2026-11-01T08:00:00Z'},checked,now).label,'观测延迟');
});
test('all exported streams appear once, Netatmo stays single, HRES is explicitly unmonitored',()=>{
 const rows=onlineRows({generated_at:checked,netatmo:{service:'active',collector:{last_observation_utc:checked}},online_collection:{checked_at:checked,items:[row,{...row,id:'open-meteo'}]}},now);
 assert.deepEqual(rows.map(r=>r.id),['netatmo','hko','open-meteo','hres']);
 assert.equal(rows.at(-1).health.label,'未接入监控');
});

test('hourly dashboard cache does not fabricate a ten-minute collector outage',()=>{
 const later=Date.parse('2026-11-01T11:50:00Z');
 assert.equal(onlineCollectorHealth({...row,last_collected_at:'2026-11-01T10:50:00Z'},checked,later).tone,'good');
 assert.equal(onlineCollectorHealth(row,checked,Date.parse('2026-11-01T12:40:00Z')).label,'状态待更新');
});
