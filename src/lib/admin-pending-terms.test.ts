import { pendingAdminTermVersion, adminTermRequirementLabel, type AdminManagedTermDocument, type AdminTermVersion } from './admin-platform-operations.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
test('pending terms distinguish future active, staged and overdue revisions from history',()=>{
 const v=(version:number,isActive:boolean,effectiveAt:string):AdminTermVersion=>({id:String(version),version,isActive,effectiveAt,contentUrl:'/content',sourceUrl:null,sourcePageId:null,checksum:null,changeSummary:null,createdAt:effectiveAt});
 const current=v(3,true,'2026-08-01');const staged=v(4,false,'2026-09-15');
 const d:AdminManagedTermDocument={id:'d',code:'SERVICE_TERMS',title:'약관',isRequired:true,appliesTo:'patient',locale:'ko-KR',updatedAt:'',activeVersion:current,versions:[staged,current,v(2,false,'2026-07-01')]};
 assert.equal(pendingAdminTermVersion(d,Date.parse('2026-09-13'))?.id,'4');
 assert.equal(pendingAdminTermVersion(d,Date.parse('2026-09-16'))?.id,'4');
 d.activeVersion={...staged,isActive:true};d.versions=[d.activeVersion,current];
 assert.equal(pendingAdminTermVersion(d,Date.parse('2026-09-13'))?.id,'4');
 d.versions[1]={...current,isActive:false};
 assert.equal(pendingAdminTermVersion(d,Date.parse('2026-09-16')),null);
 for(const code of ['CHIKA_TALK_COMMUNITY_POLICY','CHIKA_TALK_PRIVACY_CONSENT'])assert.equal(adminTermRequirementLabel({...d,code,isRequired:false}),'치아톡 작성 시 필수');
 assert.equal(adminTermRequirementLabel({...d,code:'MARKETING_OPTIN',isRequired:false}),'선택');
});
