import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
test('secret guard scans staged content even if working copy was cleaned',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'internship-secret-test-'));
 try{assert.equal(spawnSync('git',['init'],{cwd}).status,0);writeFileSync(join(cwd,'config.js'),`const key='${'sk-'+'A'.repeat(36)}';`);assert.equal(spawnSync('git',['add','config.js'],{cwd}).status,0);writeFileSync(join(cwd,'config.js'),'const key="";');const result=spawnSync(process.execPath,[resolve('scripts/check-secrets.mjs')],{cwd,encoding:'utf8'});assert.equal(result.status,1);assert(result.stderr.includes('config.js'));assert(!result.stderr.includes('A'.repeat(36)));}finally{rmSync(cwd,{recursive:true,force:true})}
});

test('Bailian workspace keys with periods are blocked without exposing them',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'internship-workspace-key-test-'));
 try{spawnSync('git',['init'],{cwd});const dummy='sk-ws-H.'+'DUMMY'.repeat(12)+'.placeholder';writeFileSync(join(cwd,'config.js'),`const key='${dummy}';`);spawnSync('git',['add','config.js'],{cwd});const result=spawnSync(process.execPath,[resolve('scripts/check-secrets.mjs')],{cwd,encoding:'utf8'});assert.equal(result.status,1);assert(!result.stderr.includes(dummy));}finally{rmSync(cwd,{recursive:true,force:true})}
});
