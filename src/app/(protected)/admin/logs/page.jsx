import { requirePageUser } from '@/lib/server/auth';
import AuditLogPage from '@/components/AuditLogPage';
export const metadata = { title: '로그 확인' };
export default async function Page() {
  await requirePageUser(['operator', 'deputy']);
  return <AuditLogPage />;
}
