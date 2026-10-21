import { requirePageUser } from '@/lib/server/auth';
export default async function ProtectedLayout({ children }) {
  await requirePageUser();
  return children;
}
