'use client';

import { useActionState } from 'react';
import { updateInboxItemAction } from '../../app/actions/capture.js';

/**
 * Resolve / snooze / dismiss an inbox item.
 *
 * The actions return business errors (e.g. "indic até quando adiar"), so the
 * form must surface them instead of failing silently.
 */
export default function InboxItemActions({ item }) {
  const [state, action, pending] = useActionState(updateInboxItemAction, null);

  return (
    <div className="row" style={{ marginTop: 8 }}>
      <form action={action}>
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="status" value="RESOLVED" />
        <button type="submit" disabled={pending}>
          Tratar
        </button>
      </form>

      <form action={action}>
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="status" value="SNOOZED" />
        <input
          type="date"
          name="snoozedUntil"
          aria-label={`Adiar até (${item.title})`}
          style={{ width: 'auto' }}
        />
        <button type="submit" disabled={pending}>
          Adiar
        </button>
      </form>

      <form action={action}>
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="status" value="DISMISSED" />
        <button type="submit" className="danger" disabled={pending}>
          Dispensar
        </button>
      </form>

      {state?.status === 'ERROR' && (
        <div className="alert" data-tone="error" role="alert" style={{ flexBasis: '100%' }}>
          {state.message}
        </div>
      )}
      {state?.status === 'UPDATED' && (
        <div className="alert" data-tone="success" role="status" style={{ flexBasis: '100%' }}>
          Item actualizado.
        </div>
      )}
    </div>
  );
}