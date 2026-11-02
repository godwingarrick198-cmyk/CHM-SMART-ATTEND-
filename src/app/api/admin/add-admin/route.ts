import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export async function POST(request:NextRequest){
 const h=request.headers.get('authorization')??'',token=h.startsWith('Bearer ')?h.slice(7):'';
 if(!token)return NextResponse.json({error:'Sign in as prime administrator first.'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Server authentication is not configured.'},{status:500});
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:u,error:ue}=await db.auth.getUser(token);
 if(ue||!u.user)return NextResponse.json({error:'Session expired. Sign in again.'},{status:401});
 const {data:a}=await db.from('admin_users').select('id,role,email').eq('auth_user_id',u.user.id).eq('active',true).maybeSingle();
 if(!a||a.role!=='prime_admin'||String(a.email).toLowerCase()!=='godwingarrick198@gmail.com')return NextResponse.json({error:'Only the prime administrator can assign level administrators.'},{status:403});
 let body:any;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 const email=String(body.email??'').trim().toLowerCase(),level=Number(body.level);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||![100,200,300,400].includes(level))return NextResponse.json({error:'Enter a valid email and level.'},{status:400});
 if(email==='godwingarrick198@gmail.com')return NextResponse.json({error:'Prime administrator is already configured.'},{status:409});
 const {data:existingAdmin,error:adminCheckError}=await db.from('admin_users').select('id').ilike('email',email).limit(1).maybeSingle();
 if(adminCheckError)return NextResponse.json({error:'Could not verify administrator records.'},{status:500});
 if(existingAdmin)return NextResponse.json({error:'This email is already assigned as an administrator.'},{status:409});
 const {data:student,error:studentCheckError}=await db.from('profiles').select('id,email,full_name').ilike('email',email).limit(1).maybeSingle();
 if(studentCheckError)return NextResponse.json({error:'Could not verify existing student account.'},{status:500});
 let authUserId:string,invited=false;
 if(student){
  const {data:authData,error:authError}=await db.auth.admin.getUserById(student.id);
  if(authError||!authData.user||String(authData.user.email).toLowerCase()!==email)return NextResponse.json({error:'The existing student account could not be matched to its authentication account.'},{status:409});
  authUserId=authData.user.id;
 }else{
  const {data:inv,error}=await db.auth.admin.inviteUserByEmail(email,{data:{account_type:'level_admin',admin_level:level},redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL??request.nextUrl.origin}/admin/reset-password`});
  if(error||!inv.user)return NextResponse.json({error:error?.message??'Invitation failed.'},{status:400});
  authUserId=inv.user.id;invited=true;
 }
 const {error:insertError}=await db.from('admin_users').insert({email,auth_user_id:authUserId,active:true,role:'level_admin',level});
 if(insertError){
  if(invited)await db.auth.admin.deleteUser(authUserId);
  return NextResponse.json({error:'Could not save administrator assignment: '+insertError.message},{status:500});
 }
 return NextResponse.json({success:true,message:student?`${email} has been assigned as the ${level} Level administrator using their existing account. They can sign in with their current password.`:`Invitation sent to ${email} for ${level} Level.`});
}