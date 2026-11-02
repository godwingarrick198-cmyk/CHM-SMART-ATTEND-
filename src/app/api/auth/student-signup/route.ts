import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const prefixes:Record<number,string>={100:'26',200:'25',300:'24',400:'23'};
export async function POST(request:Request){
 try{
  const b=await request.json(), fullName=String(b.fullName??'').trim(),email=String(b.email??'').trim().toLowerCase(),password=String(b.password??''),level=Number(b.level),suffix=String(b.matricSuffix??'').replace(/[^0-9]/g,'');
  if(!fullName||!email||password.length<8||!prefixes[level]||!suffix)return NextResponse.json({error:'Enter your full name, level, matric digits, Gmail and a password of at least 8 characters.'},{status:400});
  const matricNo=prefixes[level]+' '+suffix,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Registration service is not configured.'},{status:503});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const [m,e]=await Promise.all([db.from('profiles').select('id').eq('matric_no',matricNo).maybeSingle(),db.from('profiles').select('id').eq('email',email).maybeSingle()]);
  if(m.error||e.error)return NextResponse.json({error:'Could not verify registration details.'},{status:503});
  if(m.data||e.data)return NextResponse.json({error:'That matric number or email is already registered.'},{status:409});
  const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,matric_no:matricNo,level}});
  if(error||!data.user)return NextResponse.json({error:error?.message??'Could not create account.'},{status:400});
  return NextResponse.json({success:true,message:'Registration submitted. Your level administrator must approve your account before login.'});
 }catch{return NextResponse.json({error:'Could not create account. Please try again.'},{status:400});}
}