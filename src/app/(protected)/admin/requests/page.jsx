import {requirePageUser} from '@/lib/server/auth';
import RequestsPage from '@/components/RequestsPage';
export const metadata={title:'부운영자 요청'};
export default async function Page(){await requirePageUser(['operator']);return <RequestsPage/>;}
