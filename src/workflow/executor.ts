/**
 * Workflow execution engine
 * Executes workflows step-by-step using AI agents
 */

import type { Page } from "playwright-core";
import {
  Workflow,
  WorkflowStep,
  WorkflowExecutionResult,
  WorkflowLog,
  WorkflowLogCallback,
  DEFAULT_MAX_TURNS,
} from "./types.js";

export interface ExecutorContext {
  page: Page;
  // AI 에이전트 실행 함수
  runStepAgent: (
    prompt: string,
    maxTurns: number,
    onLog: (text: string) => void
  ) => Promise<{ success: boolean; result: string }>;
}

export class WorkflowExecutor {
  private workflow: Workflow;
  private ctx: ExecutorContext;
  private logs: WorkflowLog[] = [];
  private onLog?: WorkflowLogCallback;
  private aborted: boolean = false;

  constructor(workflow: Workflow, ctx: ExecutorContext, onLog?: WorkflowLogCallback) {
    this.workflow = workflow;
    this.ctx = ctx;
    this.onLog = onLog;
  }

  /**
   * Abort the workflow execution
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Add a log entry
   */
  private log(
    stepId: string,
    stepName: string,
    type: WorkflowLog["type"],
    message: string
  ): void {
    const logEntry: WorkflowLog = {
      timestamp: Date.now(),
      stepId,
      stepName,
      type,
      message,
    };
    this.logs.push(logEntry);
    this.onLog?.(logEntry);
  }

  /**
   * Execute a single step using AI agent
   */
  private async executeStep(step: WorkflowStep): Promise<boolean> {
    this.log(step.id, step.name, "info", `🤖 AI 실행: ${step.prompt}`);

    try {
      const result = await this.ctx.runStepAgent(
        step.prompt,
        step.maxTurns || DEFAULT_MAX_TURNS,
        (text) => {
          this.log(step.id, step.name, "info", text);
        }
      );

      if (result.success) {
        this.log(step.id, step.name, "success", `✅ 완료: ${result.result}`);
        return true;
      } else {
        this.log(step.id, step.name, "error", `❌ 실패: ${result.result}`);
        return false;
      }
    } catch (error) {
      this.log(step.id, step.name, "error", `오류: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStepWithRetry(step: WorkflowStep): Promise<boolean> {
    const maxRetries = step.retryCount || 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      if (this.aborted) {
        this.log(step.id, step.name, "error", "워크플로우 중단됨");
        return false;
      }

      if (attempt > 0) {
        this.log(step.id, step.name, "info", `🔄 재시도 ${attempt}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const success = await this.executeStep(step);

      if (success) {
        return true;
      }

      attempt++;
    }

    return false;
  }

  /**
   * Find the next step based on step result
   */
  private findNextStep(step: WorkflowStep, success: boolean): WorkflowStep | null {
    const nextStepRef = success ? step.onSuccess : step.onFailure;

    if (nextStepRef === "end") {
      return null;
    }

    if (nextStepRef === "next") {
      const currentIndex = this.workflow.steps.findIndex((s) => s.id === step.id);
      if (currentIndex < 0 || currentIndex >= this.workflow.steps.length - 1) {
        return null;
      }
      return this.workflow.steps[currentIndex + 1];
    }

    if (nextStepRef === "retry") {
      return null;
    }

    // Find step by ID
    return this.workflow.steps.find((s) => s.id === nextStepRef) || null;
  }

  /**
   * Execute mission-based workflow (AI handles everything)
   */
  private async executeMission(): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const mission = this.workflow.mission!;
    const maxTurns = this.workflow.maxTurns || 30;

    this.log("mission", "미션", "info", `🎯 미션: ${mission}`);
    this.log("mission", "미션", "info", `🤖 AI가 작업을 수행합니다 (최대 ${maxTurns}턴)...`);

    try {
      const result = await this.ctx.runStepAgent(
        mission,
        maxTurns,
        (text) => {
          this.log("mission", "미션", "info", text);
        }
      );

      const endTime = Date.now();
      const success = result.success;

      this.log(
        "mission",
        "미션",
        success ? "success" : "error",
        success
          ? `🎉 미션 완료: ${result.result} (${((endTime - startTime) / 1000).toFixed(1)}초)`
          : `❌ 미션 실패: ${result.result}`
      );

      return {
        success,
        workflowId: this.workflow.id,
        startTime,
        endTime,
        stepsExecuted: 1,
        lastStepId: "mission",
        error: success ? undefined : result.result,
        logs: this.logs,
      };
    } catch (error) {
      const endTime = Date.now();
      const errorMsg = (error as Error).message;
      this.log("mission", "미션", "error", `오류: ${errorMsg}`);

      return {
        success: false,
        workflowId: this.workflow.id,
        startTime,
        endTime,
        stepsExecuted: 1,
        lastStepId: "mission",
        error: errorMsg,
        logs: this.logs,
      };
    }
  }

  /**
   * Execute the entire workflow
   */
  async execute(): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    let stepsExecuted = 0;
    let lastStepId: string | undefined;
    let error: string | undefined;

    this.log("workflow", this.workflow.name, "info", `🚀 워크플로우 시작: ${this.workflow.name}`);

    // 미션 모드: AI가 알아서 처리
    if (this.workflow.mission && this.workflow.mission.trim()) {
      return this.executeMission();
    }

    // 단계 모드: 단계별 실행
    if (this.workflow.steps.length === 0) {
      return {
        success: false,
        workflowId: this.workflow.id,
        startTime,
        endTime: Date.now(),
        stepsExecuted: 0,
        error: "미션 또는 단계를 입력하세요",
        logs: this.logs,
      };
    }

    let currentStep: WorkflowStep | null = this.workflow.steps[0];

    while (currentStep && !this.aborted) {
      lastStepId = currentStep.id;
      stepsExecuted++;

      // Prevent infinite loops
      if (stepsExecuted > 50) {
        error = "단계 실행 횟수 초과 (50회)";
        this.log(currentStep.id, currentStep.name, "error", error);
        break;
      }

      const success = await this.executeStepWithRetry(currentStep);
      currentStep = this.findNextStep(currentStep, success);

      // If failed and no next step, mark as failure
      if (!success && !currentStep) {
        error = "단계 실패로 워크플로우 종료";
        break;
      }
    }

    if (this.aborted) {
      error = "사용자에 의해 중단됨";
    }

    const endTime = Date.now();
    const success = !error && !this.aborted;

    this.log(
      "workflow",
      this.workflow.name,
      success ? "success" : "error",
      success
        ? `🎉 워크플로우 완료 (${stepsExecuted}단계, ${((endTime - startTime) / 1000).toFixed(1)}초)`
        : `워크플로우 실패: ${error}`
    );

    return {
      success,
      workflowId: this.workflow.id,
      startTime,
      endTime,
      stepsExecuted,
      lastStepId,
      error,
      logs: this.logs,
    };
  }
}
