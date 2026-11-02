import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(request:Request){
 try{
  const b=await request.json(),matricNo=String(b.matricNo??'') .trim().toUpperCase().replace(/[\\s-]+/g,''),password=String(b.password??'');
  if(!matricNo||!password)return NextResponse.json({error:'Enter your matric number and password.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!key)return NextResponse.json({error:'Login service is not configured.'},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:p,error:pe}=await db.from('profiles').select('email,approval_status').eq('matric_no',matricNo).maybeSingle();
  if(pe||!p?.email)return NextResponse.json({error:'Invalid matric number or password.'},{status:401});
  if(p.approval_status!=='approved')return NextResponse.json({error:p.approval_status==='rejected'?'Registration rejected. Contact your level administrator.':'Registration pending approval. You can log in after approval.'},{status:403});
  const auth=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}}),{data,error}=await auth.auth.signInWithPassword({email:p.email,password});
  if(error||!data.session)return NextResponse.json({error:'Invalid matric number or password.'},{status:401});
  return NextResponse.json({session:data.session});
 }catch{return NextResponse.json({error:'Could not log in. Please try again.'},{status:400});}
}