import {requirePageUser} from '@/lib/server/auth';
import MembersPage from '@/components/MembersPage';
export const metadata={title:'회원 리스트'};
export default async function Page(){await requirePageUser(['operator','deputy']);return <MembersPage/>;}
