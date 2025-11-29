"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AcademicCapIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';
import { pegawaiDefaultFormData } from '@/components/modals/PegawaiModal';
import { apiService } from '@/services/apiService';
import { supabase } from '@/services/supabase';
import { RequestType, UserProfile, UserRole } from '@/types';

interface SignupPageProps {
    onShowLogin: () => void;
}

type FormState = Omit<UserProfile, 'id'>;

const SignupPage: React.FC<SignupPageProps> = ({ onShowLogin }) => {
    const [formData, setFormData] = useState<FormState>({ ...pegawaiDefaultFormData });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [positions, setPositions] = useState<string[]>([]);
    const [superadminId, setSuperadminId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const { data, error } = await supabase.from('profiles').select('id, full_name, role, position');
                if (error) throw error;
                const users = (data as UserProfile[]) || [];
                setAllUsers(users);
                const uniquePositions = Array.from(
                    new Set(users.map(u => u.position).filter(Boolean) as string[])
                ).sort();
                setPositions(uniquePositions);
                const superadmin = users.find(u => u.role === UserRole.SUPERADMIN);
                setSuperadminId(superadmin?.id || null);
            } catch (err) {
                console.error('Failed to load reference data for signup form', err);
                setPositions([]);
            } finally {
                setLoadingOptions(false);
            }
        };

        loadOptions();
    }, []);

    const potentialManagers = useMemo(() => {
        return allUsers.filter(u => u.id);
    }, [allUsers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!password || password.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Password dan konfirmasi password tidak sama.');
            return;
        }

        setLoading(true);
        try {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password,
            });

            if (signUpError) {
                throw signUpError;
            }

            const newUserId = authData.user?.id;
            if (!newUserId) {
                throw new Error('Pendaftaran gagal: tidak ada ID pengguna yang dikembalikan.');
            }

            const profilePayload: Partial<UserProfile> = {
                ...formData,
                id: newUserId,
                // Role diset default user; akses aplikasi diblokir melalui status approved=false.
                role: UserRole.USER,
                approved: false,
                nik: formData.nik || null,
                manager_id: formData.manager_id || null,
                default_shift: formData.default_shift || '',
                phone_number: formData.phone_number || null,
                place_of_birth: formData.place_of_birth || null,
                date_of_birth: formData.date_of_birth || null,
                education_level: formData.education_level || null,
                education_major: formData.education_major || null,
                employment_status: formData.employment_status || 'Menunggu persetujuan',
                address: formData.address || null,
            };

            await apiService.saveProfile(profilePayload);

            const today = new Date().toISOString().split('T')[0];
            const reasonPayload = JSON.stringify({
                note: 'Pendaftaran pegawai baru menunggu persetujuan superadmin.',
                requested_position: formData.position,
                submitted_at: today,
            });

            await apiService.submitRequest({
                profile_id: newUserId,
                request_type: RequestType.REGISTRASI,
                start_date: today,
                end_date: today,
                reason: reasonPayload,
                approver_id: superadminId || undefined,
            });

            await supabase.auth.signOut(); // Pastikan tidak langsung login.
            setSuccessMessage('Pendaftaran berhasil dikirim. Tunggu persetujuan superadmin sebelum login.');
            setFormData({ ...pegawaiDefaultFormData, email: formData.email });
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Signup failed', err);
            setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4">
            <div className="max-w-5xl w-full">
                <div className="flex justify-center items-center mb-6">
                    <AcademicCapIcon className="h-10 w-10 text-slate-700" />
                    <h1 className="text-3xl font-bold text-center text-slate-800 ml-2">HRIS App</h1>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-800">Daftar Pegawai Baru</h2>
                            <p className="text-sm text-gray-600">Lengkapi data di bawah. Ajuan dikirim ke superadmin untuk disetujui.</p>
                        </div>
                        <button onClick={onShowLogin} className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                            Kembali ke login
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                            <p>{error}</p>
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
                            <p>{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                                <input
                                    id="nik"
                                    name="nik"
                                    value={formData.nik || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
                                <input
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Minimal 6 karakter"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                                {positions.length > 0 ? (
                                    <select
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                        disabled={loadingOptions}
                                    >
                                        <option value="" disabled>-- Pilih Jabatan --</option>
                                        {positions.map(pos => (
                                            <option key={pos} value={pos}>{pos}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Isi jabatan"
                                        required
                                    />
                                )}
                            </div>
                            <div>
                                <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-1">Atasan Langsung</label>
                                <select
                                    id="manager_id"
                                    name="manager_id"
                                    value={formData.manager_id || 'null'}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={loadingOptions}
                                >
                                    <option value="null">-- Tidak Ada Atasan --</option>
                                    {potentialManagers.map(user => (
                                        <option key={user.id} value={user.id}>{user.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="default_shift" className="block text-sm font-medium text-gray-700 mb-1">Shift Default</label>
                                <input
                                    id="default_shift"
                                    name="default_shift"
                                    value={formData.default_shift || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">URL Avatar</label>
                                <input
                                    id="avatar_url"
                                    name="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                                <input
                                    id="place_of_birth"
                                    name="place_of_birth"
                                    value={formData.place_of_birth || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                                <input
                                    type="date"
                                    id="date_of_birth"
                                    name="date_of_birth"
                                    value={formData.date_of_birth || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
                                <input
                                    id="education_level"
                                    name="education_level"
                                    value={formData.education_level || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="education_major" className="block text-sm font-medium text-gray-700 mb-1">Jurusan Pendidikan</label>
                                <input
                                    id="education_major"
                                    name="education_major"
                                    value={formData.education_major || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <input
                                    id="employment_status"
                                    name="employment_status"
                                    value={formData.employment_status || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Contoh: Tetap, Kontrak"
                                />
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-gray-600">Setelah daftar, superadmin akan meninjau ajuan Anda.</p>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                            >
                                {loading && <Spinner />}
                                {loading ? 'Mengirim...' : 'Daftar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
