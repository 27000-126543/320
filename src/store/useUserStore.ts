import { create } from 'zustand';
import { User, UserRole, LoginLog, ROLE_LABEL } from '@/types';
import { generateMockUsers } from '@/utils/mockData';
import { formatDateTime, generateId } from '@/utils/formatters';

interface UserState {
  currentUser: User | null;
  users: User[];
  loginLogs: LoginLog[];
  isAuthenticated: boolean;
  faceScanProgress: number;
  scanningFace: boolean;
  selectedRole: UserRole | null;
  setCurrentUser: (user: User) => void;
  setSelectedRole: (role: UserRole) => void;
  startFaceScan: () => Promise<boolean>;
  logout: () => void;
  loginAsRole: (role: UserRole) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  users: generateMockUsers(),
  loginLogs: [],
  isAuthenticated: false,
  faceScanProgress: 0,
  scanningFace: false,
  selectedRole: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedRole: (role) => set({ selectedRole: role }),

  startFaceScan: async () => {
    const { selectedRole, users } = get();
    if (!selectedRole) return false;
    set({ scanningFace: true, faceScanProgress: 0 });
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80));
      set({ faceScanProgress: i });
    }
    const matchedUser = users.find(u => u.role === selectedRole) || users[0];
    const log: LoginLog = {
      time: formatDateTime(),
      success: true,
      device: '调度中心-主工位-01',
      ip: '10.28.12.' + Math.floor(Math.random() * 255),
    };
    const updatedUser = { ...matchedUser, lastLogin: log.time };
    set({
      currentUser: updatedUser,
      isAuthenticated: true,
      scanningFace: false,
      loginLogs: [log, ...get().loginLogs],
    });
    return true;
  },

  logout: () => set({
    currentUser: null,
    isAuthenticated: false,
    selectedRole: null,
    faceScanProgress: 0,
  }),

  loginAsRole: (role) => {
    const user = get().users.find(u => u.role === role) || get().users[0];
    const log: LoginLog = {
      time: formatDateTime(),
      success: true,
      device: '模拟登录',
      ip: '127.0.0.1',
    };
    set({
      currentUser: { ...user, lastLogin: log.time },
      isAuthenticated: true,
      selectedRole: role,
      loginLogs: [log, ...get().loginLogs],
    });
  },
}));

export const hasPermission = (currentRole: UserRole | undefined | null, requiredLevel: number): boolean => {
  if (!currentRole) return false;
  const levels: Record<UserRole, number> = { operator: 1, dispatcher: 2, director: 3, bureau: 4 };
  return levels[currentRole] >= requiredLevel;
};
