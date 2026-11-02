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
 if(!a||a.role!=='prime_admin'||String(a.email).toLowerCase()!=='godwingarrick198@gmail.com')return NextResponse.json({error:'Only the prime administrator can invite level administrators.'},{status:403});
 let body:any;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 const email=String(body.email??'').trim().toLowerCase(),level=Number(body.level);
 if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||![100,200,300,400].includes(level))return NextResponse.json({error:'Enter a valid email and level.'},{status:400});
 if(email==='godwingarrick198@gmail.com')return NextResponse.json({error:'Prime administrator is already configured.'},{status:409});
 const {data:exists}=await db.from('admin_users').select('id').ilike('email',email).maybeSingle();
 if(exists)return NextResponse.json({error:'This email is already an administrator.'},{status:409});
 const {data:inv,error}=await db.auth.admin.inviteUserByEmail(email,{redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL??request.nextUrl.origin}/admin/reset-password`});
 if(error||!inv.user)return NextResponse.json({error:error?.message??'Invitation failed.'},{status:400});
 const {error:ie}=await db.from('admin_users').insert({email,auth_user_id:inv.user.id,active:true,phone_e164:null,role:'level_admin',level});
 if(ie){await db.auth.admin.deleteUser(inv.user.id);return NextResponse.json({error:'Could not save administrator assignment: '+ie.message},{status:500})}
 return NextResponse.json({success:true,message:`Invitation sent to ${email} for ${level} Level. They can manage only that level.`});
}