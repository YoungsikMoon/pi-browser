/**
 * Workflow type definitions for pi-browser
 */

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // 미션 모드: AI가 알아서 처리 (권장)
  mission?: string;
  maxTurns?: number; // 미션 모드일 때 최대 턴 수 (기본 30)

  // 단계 모드: 세부 단계 정의 (선택)
  steps: WorkflowStep[];

  createdAt: number;
  updatedAt: number;

  // 스케줄링
  schedule?: {
    enabled: boolean;
    type: "interval" | "daily" | "weekly";
    intervalMinutes?: number;
    time?: string;
    dayOfWeek?: number;
    lastRun?: number;
    nextRun?: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;

  // AI 프롬프트 (자연어로 작업 설명)
  prompt: string;

  // 최대 AI 턴 수 (기본값: 20)
  maxTurns?: number;

  // Flow control
  onSuccess: string | "next" | "end";
  onFailure: string | "retry" | "end";
  retryCount?: number;
}

// 기본값
export const DEFAULT_MAX_TURNS = 20;

export interface WorkflowExecutionResult {
  success: boolean;
  workflowId: string;
  startTime: number;
  endTime: number;
  stepsExecuted: number;
  lastStepId?: string;
  error?: string;
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  timestamp: number;
  stepId: string;
  stepName: string;
  type: "info" | "success" | "error" | "condition";
  message: string;
}

export type WorkflowLogCallback = (log: WorkflowLog) => void;
