import {requirePageUser} from '@/lib/server/auth';
import {redirect} from 'next/navigation';
export default async function Page(){await requirePageUser(['operator','deputy']);redirect('/admin/approvals');}
