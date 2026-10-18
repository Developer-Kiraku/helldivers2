import { getCurrentUser } from '@/lib/server/auth';
import { redirect } from 'next/navigation';
export default async function AuthLayout({children}){if(await getCurrentUser())redirect('/');return children;}
