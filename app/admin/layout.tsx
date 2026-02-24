import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    const disableAuth = process.env.DISABLE_AUTH === 'true';

    if (!disableAuth && !session?.user) {
        redirect('/login');
    }

    return <>{children}</>;
}
