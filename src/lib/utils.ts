import { UserProfile } from '../types';

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} tahun lalu`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} bulan lalu`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} hari lalu`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} jam lalu`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} menit lalu`;
    return `${Math.floor(seconds)} detik lalu`;
};

export const getAllSubordinates = (managerId: string, allUsers: UserProfile[]): UserProfile[] => {
    const subordinates: UserProfile[] = [];
    const queue: string[] = [managerId];
    const visited: Set<string> = new Set();
    visited.add(managerId);

    while (queue.length > 0) {
        const currentManagerId = queue.shift()!;
        const directReports = allUsers.filter(u => u.manager_id === currentManagerId);
        
        for (const report of directReports) {
            if (!visited.has(report.id)) {
                subordinates.push(report);
                queue.push(report.id);
                visited.add(report.id);
            }
        }
    }
    return subordinates;
};

export const getSubordinatesWithLevels = (managerId: string, allUsers: UserProfile[]): { user: UserProfile, level: number }[] => {
    const subordinatesWithLevels: { user: UserProfile, level: number }[] = [];
    // Queue stores objects with userId and their level
    const queue: { userId: string, level: number }[] = [{ userId: managerId, level: 0 }];
    const visited: Set<string> = new Set([managerId]);

    while (queue.length > 0) {
        const { userId: currentManagerId, level: currentLevel } = queue.shift()!;
        
        const directReports = allUsers.filter(u => u.manager_id === currentManagerId);
        
        for (const report of directReports) {
            if (!visited.has(report.id)) {
                visited.add(report.id);
                const subordinateLevel = currentLevel + 1;
                subordinatesWithLevels.push({ user: report, level: subordinateLevel });
                queue.push({ userId: report.id, level: subordinateLevel });
            }
        }
    }
    return subordinatesWithLevels;
};