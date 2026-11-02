'use client';
import {useEffect,useState,FormEvent} from 'react';
import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
type Level=100|200|300|400;
const levels:Level[]=[100,200,300,400];
const prefixes:Record<number,string>={100:'26',200:'25',300:'24',400:'23'};
const LocationMap=dynamic(()=>import('./LocationMap'),{ssr:false,loading:()=> <div className="mapLoading">Loading interactive map…</div>});
export default function AdminSection(){
 const path=usePathname(),db=createClient();
 const [user,setUser]=useState<any>(null),[admin,setAdmin]=useState<any>(null),[students,setStudents]=useState<any[]>([]),[courses,setCourses]=useState<any[]>([]),[sessions,setSessions]=useState<any[]>([]),[admins,setAdmins]=useState<any[]>([]),[records,setRecords]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 const [course,setCourse]=useState(''),[courseTitle,setCourseTitle]=useState(''),[courseLevel,setCourseLevel]=useState<Level>(100),[duration,setDuration]=useState('30'),[semester,setSemester]=useState('First'),[academic,setAcademic]=useState('2026/2027');
 const [bulkLevel,setBulkLevel]=useState<Level>(100),[bulkDuration,setBulkDuration]=useState('30'),[bulkSemester,setBulkSemester]=useState('First'),[bulkAcademic,setBulkAcademic]=useState('2026/2027');
 const [sessionCourseCode,setSessionCourseCode]=useState(''),[sessionTitle,setSessionTitle]=useState('CHM Class'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[lat,setLat]=useState(''),[lng,setLng]=useState(''),[gpsAccuracy,setGpsAccuracy]=useState<number|null>(null),[radius,setRadius]=useState('50');
 const [adminEmail,setAdminEmail]=useState(''),[adminLevel,setAdminLevel]=useState<Level>(100);
 async function load(){
  setLoading(true);const {data:u}=await db.auth.getUser();if(!u.user){location.replace('/admin');return;}setUser(u.user);
  const {data:a,error:ae}=await db.from('admin_users').select('id,email,active,role,level').eq('auth_user_id',u.user.id).eq('active',true).maybeSingle();
  if(ae||!a){await db.auth.signOut();location.replace('/admin');return;}setAdmin(a);
  const isPrime=a.role==='prime_admin';
  const [st,co,se,re,ad]=await Promise.all([
   db.from('profiles').select('id,full_name,matric_no,email,level,approval_status,created_at').order('created_at',{ascending:false}),
   db.from('courses').select('*').order('level').order('course_code'),
   db.from('attendance_sessions').select('id,title,course_code,level,course_id,starts_at,ends_at,is_open').order('starts_at',{ascending:false}).limit(500),
   db.from('attendance_records').select('id,checked_in_at,student_id,session_id,profiles(full_name,matric_no),attendance_sessions(title,course_code,level)').order('checked_in_at',{ascending:false}).limit(500),
   isPrime?db.from('admin_users').select('id,email,active,role,level').order('email'):Promise.resolve({data:[],error:null} as any)
  ]);
  if(st.error||co.error||se.error||re.error)setNote(st.error?.message||co.error?.message||se.error?.message||re.error?.message||'Could not load dashboard data.');
  setStudents(st.data??[]);setCourses(co.data??[]);setSessions(se.data??[]);setRecords(re.data??[]);setAdmins(ad.data??[]);setLoading(false);
 }
 useEffect(()=>{setLat('');setLng('');setGpsAccuracy(null);void load();},[]);
 const prime=admin?.role==='prime_admin',scope=(l:number)=>prime||admin?.level===l;
 const section=path.endsWith('/students')?'students':path.endsWith('/sessions')?'sessions':path.endsWith('/history')?'history':path.endsWith('/check-ins')?'checkins':path.endsWith('/reports')?'reports':path.endsWith('/settings')?'settings':'overview';
 const nav=[['Overview','/admin/dashboard'],['Students & approvals','/admin/dashboard/students'],['Courses & class limits','/admin/dashboard/reports'],['Sessions & timing','/admin/dashboard/sessions'],['Session history','/admin/dashboard/history'],['Recent check-ins','/admin/dashboard/check-ins'],...(prime?[['Administrators','/admin/dashboard/settings']]:[])];
 async function approve(id:string,status:'approved'|'rejected'){setBusy(true);const {error}=await db.from('profiles').update({approval_status:status}).eq('id',id);setNote(error?.message??('Student '+status+'.'));setBusy(false);if(!error)await load();}
 async function saveCourse(e:FormEvent){e.preventDefault();if(!prime)return;setBusy(true);const {error}=await db.from('courses').insert({level:courseLevel,course_code:course.trim().toUpperCase(),course_title:courseTitle.trim(),max_duration_minutes:Number(duration),academic_session:academic.trim(),semester,active:true});setNote(error?.message??'Course saved. Set the level-wide duration below.');setBusy(false);if(!error){setCourse('');setCourseTitle('');await load();}}
 async function applyLevelLimit(e:FormEvent){e.preventDefault();if(!prime)return;const n=Number(bulkDuration);if(!Number.isInteger(n)||n<1||n>600){setNote('Enter a maximum duration from 1 to 600 minutes.');return;}setBusy(true);const {data,error}=await db.from('courses').update({max_duration_minutes:n}).eq('level',bulkLevel).eq('academic_session',bulkAcademic.trim()).eq('semester',bulkSemester).select('id');setNote(error?.message??(data?.length?('Updated the maximum session duration for '+data.length+' course(s) in '+bulkLevel+' Level.'): 'No courses matched that level, academic session and semester.'));setBusy(false);if(!error)await load();}
 async function createSession(e:FormEvent){e.preventDefault();setBusy(true);try{const code=sessionCourseCode.trim().toUpperCase();if(!code)throw new Error('Enter the configured course code.');const matches=courses.filter(x=>x.active&&x.course_code.trim().toUpperCase()===code&&scope(x.level));if(matches.length===0)throw new Error('That course code is not configured for a level you manage. Add the course first.');if(matches.length>1)throw new Error('This course code exists more than once in your level scope. Ask the prime admin to resolve the duplicate before creating a session.');const c=matches[0];if(!start||!end||new Date(end)<=new Date(start))throw new Error('Choose valid start and end times.');if(!lat||!lng)throw new Error('Choose a classroom point on the map or use your phone location.');const payload={title:sessionTitle.trim(),course_code:c.course_code,course_id:c.id,level:c.level,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),is_open:true,latitude:Number(lat),longitude:Number(lng),radius_m:Number(radius),created_by_admin:admin.id};const {error}=await db.from('attendance_sessions').insert(payload);if(error)throw error;setNote('Session created. The database enforces the course class limit.');setSessionCourseCode('');await load();}catch(e){setNote(e instanceof Error?e.message:'Could not create session.');}finally{setBusy(false);}}
 async function invite(e:FormEvent){e.preventDefault();if(!prime)return;setBusy(true);const {data}=await db.auth.getSession();const r=await fetch('/api/admin/add-admin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session?.access_token},body:JSON.stringify({email:adminEmail,level:adminLevel})});const d=await r.json();setNote(d.message??d.error??'Request failed.');setBusy(false);if(r.ok){setAdminEmail('');await load();}}
 async function deactivate(id:string){if(!prime||!confirm('Deactivate this level administrator?'))return;const {error}=await db.from('admin_users').update({active:false}).eq('id',id);setNote(error?.message??'Administrator deactivated.');if(!error)await load();}
 async function signOut(){await db.auth.signOut();location.replace('/admin');}
 function gps(){if(!navigator.geolocation){setNote('This device/browser does not provide location access.');return;}setNote('Requesting high-accuracy phone location…');navigator.geolocation.getCurrentPosition(p=>{setLat(String(p.coords.latitude));setLng(String(p.coords.longitude));setGpsAccuracy(p.coords.accuracy);setNote('Phone location captured. Accuracy estimate: '+Math.round(p.coords.accuracy)+' metres. You can fine-tune the point on the map.')},e=>setNote(e.code===1?'Location permission was denied. Allow location access in your browser settings.':e.code===3?'Location request timed out. Try again outdoors or near a window.':'Could not get the phone location. Try again.'),{enableHighAccuracy:true,timeout:30000,maximumAge:0});}
 if(loading)return <main className="dashboardShell"><div className="dashLoading">Loading administrator tools…</div></main>;

 function downloadCoursesPdf(level:number|'all'){
  if(!prime)return;
  const rows=courses.filter(c=>level==='all'||Number(c.level)===level).sort((a,b)=>Number(a.level)-Number(b.level)||String(a.course_code).localeCompare(String(b.course_code)));
  if(!rows.length){setNote('No courses are available for that selection yet.');return;}
  const safe=(v:any)=>String(v??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const pages:any[][]=[];for(let i=0;i<rows.length;i+=24)pages.push(rows.slice(i,i+24));
  const objects:string[]=[];const pageIds:number[]=[];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(''); 
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  pages.forEach((page,index)=>{
   const pageId=objects.length+1,contentId=pageId+1;pageIds.push(pageId);
   const title=level==='all'?'All Levels Course Register':String(level)+' Level Course Register';
   let stream='BT /F2 16 Tf 42 800 Td ('+safe('CHM SMART ATTEND')+') Tj 0 -24 Td /F2 13 Tf ('+safe(title)+') Tj 0 -20 Td /F1 9 Tf ('+safe('Generated: '+new Date().toLocaleDateString())+') Tj 0 -24 Td /F2 9 Tf (LEVEL     COURSE CODE     COURSE TITLE                                      SESSION       SEMESTER     MAX MIN) Tj 0 -16 Td /F1 8 Tf ';
   page.forEach(row=>{
    const line=[String(row.level),String(row.course_code),String(row.course_title),String(row.academic_session),String(row.semester),String(row.max_duration_minutes)+' min'].join(' | ');
    stream+='('+safe(line.slice(0,115))+') Tj 0 -25 Td ';
   });
   stream+='ET';
   objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>');
   objects.push('<< /Length '+stream.length+' >>\\nstream\\n'+stream+'\\nendstream');
  });
  objects[1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  let pdf='%PDF-1.4\\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\\n'+obj+'\\nendobj\\n';});
  const xref=pdf.length;pdf+='xref\\n0 '+(objects.length+1)+'\\n0000000000 65535 f \\n';
  for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \\n';
  pdf+='trailer\\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\\nstartxref\\n'+xref+'\\n%%EOF';
  const blob=new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='CHM-Courses-'+(level==='all'?'All-Levels':level+'-Level')+'.pdf';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  setNote('PDF downloaded: '+rows.length+' course(s).');
 }


 function downloadStudentsPdf(level:number|'all'){
  const permitted=students.filter(s=>scope(Number(s.level)));
  const rows=permitted.filter(s=>level==='all'||Number(s.level)===level)
   .sort((a,b)=>Number(a.level)-Number(b.level)||String(a.full_name||'').localeCompare(String(b.full_name||'')));
  if(!rows.length){setNote('No student records are available for that level yet.');return;}
  const safe=(v:any)=>String(v??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const chunks:any[][]=[];for(let i=0;i<rows.length;i+=27)chunks.push(rows.slice(i,i+27));
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>','',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageIds:number[]=[];
  chunks.forEach((chunk,index)=>{
   const pageId=objects.length+1,contentId=pageId+1;pageIds.push(pageId);
   const title=level==='all'?'All Levels Student Register':String(level)+' Level Student Register';
   let stream='BT /F2 16 Tf 40 800 Td (CHM SMART ATTEND) Tj 0 -23 Td /F2 12 Tf ('+safe(title)+') Tj 0 -18 Td /F1 9 Tf ('+safe('Generated: '+new Date().toLocaleDateString()+' | Total students: '+rows.length)+' ) Tj 0 -24 Td /F2 8 Tf (NAME | MATRIC NUMBER | EMAIL | LEVEL | STATUS) Tj 0 -15 Td /F1 7 Tf ';
   chunk.forEach((s,i)=>{
    const line=[s.full_name||'N/A',s.matric_no||'N/A',s.email||'N/A',String(s.level||'N/A')+' Level',s.approval_status||'N/A'].join(' | ');
    stream+='('+safe(line.slice(0,145))+') Tj 0 -27 Td ';
   });
   stream+='ET';
   objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>');
   objects.push('<< /Length '+stream.length+' >>\\nstream\\n'+stream+'\\nendstream');
  });
  objects[1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  let pdf='%PDF-1.4\\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\\n'+obj+'\\nendobj\\n';});
  const xref=pdf.length;pdf+='xref\\n0 '+(objects.length+1)+'\\n0000000000 65535 f \\n';
  for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \\n';
  pdf+='trailer\\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\\nstartxref\\n'+xref+'\\n%%EOF';
  const blob=new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='CHM-Student-Register-'+(level==='all'?'All-Levels':level+'-Level')+'.pdf';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  setNote('Student register PDF downloaded: '+rows.length+' student(s).');
 }

 const visibleStudents=students.filter(s=>scope(s.level)),visibleCourses=courses.filter(c=>scope(c.level)),visibleSessions=sessions.filter(s=>scope(s.level)),visibleRecords=records.filter(r=>scope(r.attendance_sessions?.level));
 return <main className="dashboardShell"><header className="dashHeader"><a className="brand" href="/"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>{prime?'PRIME ADMIN':'LEVEL ADMIN · '+admin.level+' LEVEL'}</small></span></a><button className="dashGhost" onClick={signOut}>Sign out ↗</button></header><section className="dashContent"><div className="dashEyebrow">ADMINISTRATION / CONTROL CENTER</div><h1 className="dashTitle">{prime?'Prime administrator':'Level administrator'}<br/><em>{prime?'All four levels.':'Level '+admin.level+'.'}</em></h1><nav className="adminPageNav">{nav.map(([label,url])=><a key={url} href={url} className={path===url?'active':''}>{label}</a>)}</nav>{note&&<div className="dashNotice" role="status">{note}</div>}
 {section==='overview'&&<><p className="dashLead">Scoped administration and attendance overview.</p><div className="statsGrid"><article className="statCard"><span>STUDENTS IN SCOPE</span><strong>{visibleStudents.length}</strong></article><article className="statCard"><span>PENDING APPROVAL</span><strong>{visibleStudents.filter(s=>s.approval_status==='pending').length}</strong></article><article className="statCard"><span>OPEN SESSIONS</span><strong>{visibleSessions.filter(s=>s.is_open).length}</strong></article></div><div className="adminQuickLinks">{nav.slice(1).map(([l,u])=><a key={u} href={u}>{l} ↗</a>)}</div></>}
 {section==='students'&&<div className="dashSection"><h2>Student registrations ({visibleStudents.length})</h2><div className="adminForm" style={{marginBottom:24}}>{prime?<><label>Choose level to download<select id="studentPdfLevel" defaultValue="all">{levels.map(l=><option key={l} value={l}>{l} Level</option>)}<option value="all">All four levels</option></select></label><button type="button" className="dashPrimary" onClick={()=>{const v=(document.getElementById('studentPdfLevel') as HTMLSelectElement).value;downloadStudentsPdf(v==='all'?'all':Number(v));}}>Download student records PDF</button></>:<><label>Your assigned level<input value={String(admin.level)+' Level'} readOnly/></label><button type="button" className="dashPrimary" onClick={()=>downloadStudentsPdf(Number(admin.level))}>Download my level’s student PDF</button></>}</div><div className="recordList">{visibleStudents.map(s=><div className="recordRow" key={s.id}><div><strong>{s.full_name} · {s.matric_no}</strong><small>{s.email} · {s.level} Level · {s.approval_status}</small></div>{s.approval_status==='pending'&&<span style={{display:'flex',gap:6}}><button className="dashPrimary" disabled={busy} onClick={()=>void approve(s.id,'approved')}>Approve</button><button className="dashGhost" disabled={busy} onClick={()=>void approve(s.id,'rejected')}>Reject</button></span>}</div>)}</div></div>}
 {section==='reports'&&<div className="dashSection"><h2>Courses & maximum session duration</h2>{prime&&<><div className="adminForm" style={{marginBottom:24}}><label>Choose level to download<select id="coursePdfLevel" defaultValue="100">{levels.map(l=><option key={l} value={l}>{l} Level</option>)}<option value="all">All levels</option></select></label><button type="button" className="dashPrimary" onClick={()=>{const v=(document.getElementById("coursePdfLevel") as HTMLSelectElement).value;downloadCoursesPdf(v==="all"?"all":Number(v));}}>Download courses PDF</button></div><form className="adminForm" onSubmit={saveCourse}><label>Level<select value={courseLevel} onChange={e=>setCourseLevel(Number(e.target.value) as Level)}>{levels.map(l=><option key={l} value={l}>{l} Level · {prefixes[l]}</option>)}</select></label><label>Course code<input required value={course} onChange={e=>setCourse(e.target.value)} placeholder="CHM 312"/></label><label>Course title<input required value={courseTitle} onChange={e=>setCourseTitle(e.target.value)}/></label><label>Maximum session duration (minutes)<input required type="number" min="1" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Academic session<input required value={academic} onChange={e=>setAcademic(e.target.value)}/></label><label>Semester<select value={semester} onChange={e=>setSemester(e.target.value)}><option>First</option><option>Second</option></select></label><button className="dashPrimary" disabled={busy}>Add course</button></form><h3 style={{margin:'28px 0 12px'}}>Set maximum session duration for every course in a level</h3><form className="adminForm" onSubmit={applyLevelLimit}><label>Level<select value={bulkLevel} onChange={e=>setBulkLevel(Number(e.target.value) as Level)}>{levels.map(l=><option key={l} value={l}>{l} Level</option>)}</select></label><label>Maximum duration per course (minutes)<input required type="number" min="1" max="600" value={bulkDuration} onChange={e=>setBulkDuration(e.target.value)}/></label><label>Academic session<input required value={bulkAcademic} onChange={e=>setBulkAcademic(e.target.value)}/></label><label>Semester<select value={bulkSemester} onChange={e=>setBulkSemester(e.target.value)}><option>First</option><option>Second</option></select></label><button className="dashPrimary" disabled={busy}>Apply duration to all matching courses</button></form></>}{visibleCourses.map(c=><div className="recordRow" key={c.id}><div><strong>{c.level} Level · {c.course_code} — {c.course_title}</strong><small>{c.academic_session} · {c.semester} semester · {sessions.filter(s=>s.course_id===c.id).length} sessions used</small></div><strong>{c.max_duration_minutes} min max</strong></div>)}</div>}
 {section==='sessions'&&<div className="dashSection"><h2>Create a level course session</h2><form className="adminForm" onSubmit={createSession}><label>Course code<input required value={sessionCourseCode} onChange={e=>setSessionCourseCode(e.target.value)} placeholder="e.g. CHM 312" autoCapitalize="characters"/></label><label>Session title<input required value={sessionTitle} onChange={e=>setSessionTitle(e.target.value)}/></label><label>Starts at<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Ends at<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Radius (metres)<input required type="number" min="5" max="1000" value={radius} onChange={e=>setRadius(e.target.value)}/></label><div style={{gridColumn:'1/-1'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:10}}><strong style={{fontSize:13}}>Classroom attendance zone</strong><button type="button" className="dashGhost" onClick={gps}>◎ Use my phone’s location</button></div><LocationMap latitude={lat?Number(lat):null} longitude={lng?Number(lng):null} radius={Number(radius)||50} onSelect={(a,b)=>{setLat(String(a));setLng(String(b));setGpsAccuracy(null);}}/><p className="mapInstructions">Pan and zoom the map, then tap the exact classroom location. You can also use your phone’s GPS. The map marker and circle show the selected point and attendance radius.</p><div className="mapPointStatus">{lat&&lng?('Selected: '+Number(lat).toFixed(6)+', '+Number(lng).toFixed(6)+(gpsAccuracy!==null?' · Phone GPS accuracy ±'+Math.round(gpsAccuracy)+' m':'')):'No location selected yet.'}</div></div><button className="dashPrimary" disabled={busy}>Create session</button></form><p className="privacyNote">Location readings are cleared when this admin dashboard loads. Phone GPS requests high accuracy, but real accuracy depends on the device and surroundings. A 5 m radius may be smaller than the GPS error reported by some phones.</p></div>}
 {section==='history'&&<div className="dashSection"><h2>Session history ({visibleSessions.length})</h2><div className="recordList">{visibleSessions.map(s=><div className="recordRow" key={s.id}><div><strong>{s.level} Level · {s.course_code} · {s.title}</strong><small>{new Date(s.starts_at).toLocaleString()} — {new Date(s.ends_at).toLocaleString()}</small></div><button className="dashGhost" onClick={async()=>{const {error}=await db.from('attendance_sessions').update({is_open:!s.is_open}).eq('id',s.id);setNote(error?.message??'Session updated.');if(!error)await load();}}>{s.is_open?'Close':'Open'}</button></div>)}</div></div>}
 {section==='checkins'&&<div className="dashSection"><h2>Recent check-ins ({visibleRecords.length})</h2><div className="recordList">{visibleRecords.map(r=><div className="recordRow" key={r.id}><div><strong>{r.profiles?.full_name} · {r.profiles?.matric_no}</strong><small>{r.attendance_sessions?.course_code} · {new Date(r.checked_in_at).toLocaleString()}</small></div></div>)}</div></div>}
 {section==='settings'&&prime&&<div className="dashSection"><h2>Level administrators</h2><form className="adminForm" onSubmit={invite}><label>Administrator email<input required type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/></label><label>Assigned level<select value={adminLevel} onChange={e=>setAdminLevel(Number(e.target.value) as Level)}>{levels.map(l=><option key={l} value={l}>{l} Level</option>)}</select></label><button className="dashPrimary" disabled={busy}>Invite level administrator</button></form><div className="recordList">{admins.map(a=><div className="recordRow" key={a.id}><div><strong>{a.email} · {a.role==='prime_admin'?'PRIME ADMIN':a.level+' LEVEL ADMIN'}</strong><small>{a.active?'Active':'Inactive'}</small></div>{a.role!=='prime_admin'&&a.active&&<button className="dashGhost" onClick={()=>void deactivate(a.id)}>Deactivate</button>}</div>)}</div></div>}
 </section><footer className="dashFooter">CHM SMART ATTEND <span>© {new Date().getFullYear()}</span></footer></main>;
}
