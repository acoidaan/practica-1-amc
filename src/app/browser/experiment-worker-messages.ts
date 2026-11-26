import type {
  ExperimentConfig,
  ExperimentProgress,
  ExperimentResult,
} from '../core/experiment-runner';

/** Serializable command accepted by the experiment Worker. */
export interface ExperimentStartMessage {
  readonly type: 'start';
  readonly config: ExperimentConfig;
}

export type ExperimentWorkerRequest = ExperimentStartMessage;

/** Partial progress published after one dataset repetition. */
export interface ExperimentProgressMessage {
  readonly type: 'progress';
  readonly progress: ExperimentProgress;
}

/** Successful terminal response containing all averaged rows. */
export interface ExperimentCompletedMessage {
  readonly type: 'completed';
  readonly result: ExperimentResult;
}

/** Failure terminal response; errors themselves are not structured-cloneable reliably. */
export interface ExperimentErrorMessage {
  readonly type: 'error';
  readonly message: string;
}

/** Discriminated union narrowed by the Angular component through `type`. */
export type ExperimentWorkerResponse =
  ExperimentProgressMessage | ExperimentCompletedMessage | ExperimentErrorMessage;
