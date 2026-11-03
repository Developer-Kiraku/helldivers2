'use client';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { navigationGroups, operatorNavigation, navigationActive } from '@/lib/navigation.mjs';
import { isStaff } from '@/lib/roles';
import Icon from './Icon';

export default function NavigationGroups({
  role,
  mobile = false,
  onNavigate,
  groups: providedGroups,
}) {
  const pathname = usePathname();
  const instance = useId();
  const groups = providedGroups || [
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
          className={
            'navigation-group' +
            (current === group.id ? ' is-current' : '') +
            (open === group.id ? ' is-open' : '')
          }
          key={group.id}
        >
          <button
            type="button"
            className="navigation-group-toggle"
            aria-expanded={open === group.id}
            aria-controls={'navigation-' + group.id + instance}
            onClick={() => setOpen(open === group.id ? null : group.id)}
          >
            <span className="navigation-group-icon">
              <Icon name={group.icon} size={18} />
            </span>
            <span className="navigation-group-label">{group.label || '게시판'}</span>
            <ChevronDown size={15} />
          </button>
          <div
            id={'navigation-' + group.id + instance}
            className="navigation-group-items"
            hidden={open !== group.id}
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
                <ChevronRight size={14} className="navigation-item-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
