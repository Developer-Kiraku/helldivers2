'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { navigationGroups, operatorNavigation, navigationActive } from '@/lib/navigation.mjs';
import { isStaff } from '@/lib/roles';
import { Button } from './ui';
import Icon from './Icon';

export default function NavigationGroups({ role, mobile = false, onNavigate }) {
  const pathname = usePathname();
  const groups = [
    ...navigationGroups,
    ...(isStaff(role)
      ? [
          {
            id: 'admin',
            label: '운영 관리',
            icon: 'shield',
            items: operatorNavigation.filter((item) => !item.operator || role === 'operator'),
          },
        ]
      : []),
  ];
  const current =
    groups.find((group) => group.items.some((item) => navigationActive(pathname, item.href)))?.id ||
    (pathname === '/admin/api-keys' ? 'admin' : null);
  const [open, setOpen] = useState(current);
  useEffect(() => setOpen(current), [pathname, current]);
  return (
    <div className={mobile ? 'navigation-groups mobile-navigation-groups' : 'navigation-groups'}>
      {groups.map((group) => (
        <section
          className={'navigation-group' + (current === group.id ? ' is-current' : '')}
          key={group.id}
        >
          {mobile ? (
            <h3>
              <Icon name={group.icon} size={16} />
              {group.label}
            </h3>
          ) : (
            <Button
              type="button"
              className="navigation-group-toggle"
              aria-expanded={open === group.id}
              aria-controls={'navigation-' + group.id}
              onClick={() => setOpen(open === group.id ? null : group.id)}
            >
              <Icon name={group.icon} size={18} />
              <span>{group.label}</span>
              <ChevronDown size={15} />
            </Button>
          )}
          <div
            id={mobile ? undefined : 'navigation-' + group.id}
            className="navigation-group-items"
            hidden={!mobile && open !== group.id}
          >
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navigationActive(pathname, item.href) ? 'active' : undefined}
                aria-current={navigationActive(pathname, item.href) ? 'page' : undefined}
                onClick={onNavigate}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
