import type { SiteVisit } from '../types/siteVisit.types';

import { calendarWeeks, monthRange, shiftMonth } from './calendar';
import { csvCell } from '@/utils/csv';

import { toSiteVisitCsv } from './siteVisitCsv';
import { addDays, isDue, propertyNow, scheduleError } from './siteVisitDisplay';
import { toSiteVisitFormValues, toUpdateRequest } from './siteVisitForm';
import { statusOptionsFor, transitionBlocker } from './siteVisitStatus';

// 10:00 at the property (Asia/Kolkata, UTC+5:30) on 20 Nov 2026.
const NOW = new Date('2026-11-20T04:30:00Z');

describe('property time', () => {
  it('reads the date and time at the property, not the viewer', () => {
    expect(propertyNow(NOW)).toEqual({ date: '2026-11-20', time: '10:00' });
    // 23:00 UTC is already the next day in India.
    expect(propertyNow(new Date('2026-11-20T23:00:00Z')).date).toBe('2026-11-21');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('applies the booking window of the backend', () => {
    expect(scheduleError('2026-11-19', '12:00', NOW)?.field).toBe('visitDate');
    expect(scheduleError('2026-11-20', '09:30', NOW)?.field).toBe('visitTime');
    expect(scheduleError('2026-11-20', '10:30', NOW)).toBeNull();
    expect(scheduleError(addDays('2026-11-20', 90), '10:00', NOW)).toBeNull();
    expect(scheduleError(addDays('2026-11-20', 91), '10:00', NOW)?.message).toMatch(/90 days/);
  });

  it('knows when a visit is due', () => {
    expect(isDue('2026-11-20', '09:59:00', NOW)).toBe(true);
    expect(isDue('2026-11-20', '10:01:00', NOW)).toBe(false);
  });
});

describe('status transitions', () => {
  const visit = {
    id: 1,
    visitCode: 'SV-1',
    status: 'scheduled' as const,
    visitDate: '2026-11-25',
    visitTime: '10:00:00',
  };

  it('mirrors the lifecycle rules', () => {
    expect(transitionBlocker(visit, 'confirmed', NOW)).toBeNull();
    expect(transitionBlocker(visit, 'cancelled', NOW)).toBeNull();
    expect(transitionBlocker(visit, 'completed', NOW)).toMatch(/visit time/);
    expect(transitionBlocker({ ...visit, status: 'confirmed' }, 'confirmed', NOW)).toMatch(
      /Already/,
    );
    expect(transitionBlocker({ ...visit, status: 'completed' }, 'cancelled', NOW)).toMatch(
      /upcoming/,
    );
  });

  it('counts how many selected visits each status applies to', () => {
    const options = statusOptionsFor(
      [
        visit,
        { ...visit, id: 2, status: 'cancelled' },
        { ...visit, id: 3, visitDate: '2026-11-19' },
      ],
      ['completed', 'cancelled'],
      NOW,
    );
    expect(options).toEqual([
      { status: 'completed', eligible: 1, blocker: null },
      { status: 'cancelled', eligible: 2, blocker: null },
    ]);
  });
});

describe('CSV export', () => {
  it('quotes separators and neutralizes formulas, but keeps phone numbers', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('+919876543210')).toBe('+919876543210');
  });

  it('writes a header and one line per visit', () => {
    const csv = toSiteVisitCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Visit ID,Visitor,Mobile');
  });
});

describe('edit requests', () => {
  const visit: SiteVisit = {
    id: 5,
    visitCode: 'SV-100005',
    property: { id: 1, projectName: 'Green Acres', slug: 'g', city: 'Pune', locality: 'Baner' },
    builder: { id: 7, fullName: 'Bob' },
    customer: null,
    assignee: null,
    assignedAt: null,
    scheduledBy: null,
    leadId: 12,
    visitType: 'site_visit',
    visitDate: '2026-11-25',
    visitTime: '10:30:00',
    status: 'scheduled',
    name: 'Ravi',
    mobile: '+919876543210',
    email: null,
    numberOfPeople: 2,
    note: null,
    actualVisitDate: null,
    cancelledAt: null,
    cancellationReason: null,
    report: null,
    nextFollowUp: null,
    followUpNote: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: null,
  };

  it('sends only the fields that changed', () => {
    const values = toSiteVisitFormValues(visit);
    expect(toUpdateRequest(visit, values)).toEqual({});
    expect(
      toUpdateRequest(visit, { ...values, visitTime: '11:00', email: ' a@b.co ', lead: null }),
    ).toEqual({ visitTime: '11:00', email: 'a@b.co', leadId: null });
  });
});

describe('calendar', () => {
  it('covers whole weeks, Monday first', () => {
    // November 2026 starts on a Sunday.
    const weeks = calendarWeeks('2026-11');
    expect(weeks[0]?.[0]?.date).toBe('2026-10-26');
    expect(weeks[0]?.[6]).toMatchObject({ date: '2026-11-01', inMonth: true });
    expect(weeks.at(-1)?.at(-1)?.date).toBe('2026-12-06');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('shifts months and finds their range', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});
