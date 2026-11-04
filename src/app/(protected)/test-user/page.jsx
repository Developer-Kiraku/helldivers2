import { requirePageUser } from '@/lib/server/auth';
import TestUserWindow from '@/components/TestUserWindow';
import { redirect } from 'next/navigation';
export const metadata = { title: '테스트 유저 · 민주주의 주사위' };
export default async function Page() {
  const user = await requirePageUser();
  if (user.actualRole !== 'operator') redirect('/');
  return <TestUserWindow />;
}
