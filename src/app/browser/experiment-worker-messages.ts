import type {
  ExperimentConfig,
  ExperimentProgress,
  ExperimentResult,
} from '../core/experiment-runner';

export interface ExperimentStartMessage {
  readonly type: 'start';
  readonly config: ExperimentConfig;
}

export type ExperimentWorkerRequest = ExperimentStartMessage;

export interface ExperimentProgressMessage {
  readonly type: 'progress';
  readonly progress: ExperimentProgress;
}

export interface ExperimentCompletedMessage {
  readonly type: 'completed';
  readonly result: ExperimentResult;
}

export interface ExperimentErrorMessage {
  readonly type: 'error';
  readonly message: string;
}

export type ExperimentWorkerResponse =
  ExperimentProgressMessage | ExperimentCompletedMessage | ExperimentErrorMessage;
