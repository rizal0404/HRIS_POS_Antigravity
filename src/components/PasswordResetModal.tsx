"use client";

import React, { useState } from 'react';
import api from '@/services/apiClient';
import Spinner from '@/components/ui/Spinner';

interface PasswordResetModalProps {
  email?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ email, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirm) {
      setError('Kata sandi dan konfirmasi tidak sama.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', { newPassword: password });
      setLoading(false);
    } catch (updateErr: any) {
      setLoading(false);
      setError(updateErr.message || 'Gagal mengubah kata sandi.');
      return;
    }

    setMessage('Kata sandi berhasil diubah. Silakan lanjutkan.');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reset Password</p>
          <h2 className="text-xl font-semibold text-slate-900">Setel kata sandi baru</h2>
          {email && <p className="text-sm text-slate-500">{email}</p>}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Kata sandi baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Konfirmasi kata sandi</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700 transition disabled:bg-blue-400"
          >
            {loading && <Spinner />}
            {loading ? 'Menyimpan...' : 'Simpan kata sandi'}
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default PasswordResetModal;
