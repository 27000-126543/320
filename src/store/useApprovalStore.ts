import { create } from 'zustand';
import { ComplementaryPlan, PlanStatus } from '@/types';
import { generateMockPlans } from '@/utils/mockData';
import { formatDateTime, generateId } from '@/utils/formatters';

interface ApprovalState {
  plans: ComplementaryPlan[];
  activePlanId: string | null;
  setActivePlan: (id: string | null) => void;
  submitNewPlan: (plan: Partial<ComplementaryPlan>) => void;
  approvePlan: (planId: string, level: 1 | 2 | 3, approver: string, role: string, comment: string) => void;
  rejectPlan: (planId: string, level: 1 | 2 | 3, approver: string, role: string, comment: string) => void;
  getPlansForApproval: (level: number) => ComplementaryPlan[];
}

const NEXT_STATUS: Record<number, PlanStatus> = {
  1: 'approved_level1',
  2: 'approved_level2',
  3: 'executing',
};

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  plans: generateMockPlans(),
  activePlanId: null,

  setActivePlan: (id) => set({ activePlanId: id }),

  submitNewPlan: (plan) => set(state => ({
    plans: [{
      id: plan.id || generateId(),
      name: plan.name || '新建调配方案',
      description: plan.description || '',
      type: plan.type || 'battery_discharge',
      triggerCondition: plan.triggerCondition || '-',
      expectedEffect: plan.expectedEffect || '-',
      status: 'pending',
      createdAt: formatDateTime(),
      approvals: [
        { level: 1, approver: '', role: '调度员', action: 'pending', comment: '', time: '' },
        { level: 2, approver: '', role: '能源中心主任', action: 'pending', comment: '', time: '' },
        { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
      ],
      ...plan,
    } as ComplementaryPlan, ...state.plans],
  })),

  approvePlan: (planId, level, approver, role, comment) => set(state => ({
    plans: state.plans.map(p => {
      if (p.id !== planId) return p;
      const nextStatus: PlanStatus = NEXT_STATUS[level] || p.status;
      return {
        ...p,
        status: nextStatus,
        approvals: p.approvals.map(a => a.level === level
          ? { ...a, action: 'approve', approver, role, comment, time: formatDateTime() }
          : a),
      };
    }),
  })),

  rejectPlan: (planId, level, approver, role, comment) => set(state => ({
    plans: state.plans.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        status: 'rejected',
        approvals: p.approvals.map(a => a.level === level
          ? { ...a, action: 'reject', approver, role, comment, time: formatDateTime() }
          : a),
      };
    }),
  })),

  getPlansForApproval: (level) => {
    return get().plans.filter(p => {
      if (level === 1) return p.status === 'pending';
      if (level === 2) return p.status === 'approved_level1';
      if (level === 3) return p.status === 'approved_level2';
      return false;
    });
  },
}));
