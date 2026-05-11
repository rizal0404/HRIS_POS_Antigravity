import { useState } from 'react';

function parseReason(reason) {
  if (!reason) return '-';

  try {
    const parsed = JSON.parse(reason);
    return parsed.reason || reason;
  } catch {
    return reason;
  }
}

export default function DetailAjuanModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  onRevise,
}) {
  const [note, setNote] = useState('');

  if (!isOpen || !request) return null;

  const dateRange = request.end_date && request.end_date !== request.start_date
    ? `${request.start_date} - ${request.end_date}`
    : request.start_date;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {request.request_type}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {request.employee_name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {request.employee_role || 'Employee'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="font-semibold text-slate-900 dark:text-white">Tanggal</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{dateRange}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="font-semibold text-slate-900 dark:text-white">Alasan</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{parseReason(request.reason)}</p>
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="Catatan untuk keputusan"
          />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onReject?.(request.id, note)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onRevise?.(request.id, note)}
            className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/40"
          >
            Revise
          </button>
          <button
            type="button"
            onClick={() => onApprove?.(request.id)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
