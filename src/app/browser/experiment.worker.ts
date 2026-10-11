/// <reference lib="webworker" />

import { runExperiments } from '../core/experiment-runner';
import type {
  ExperimentWorkerRequest,
  ExperimentWorkerResponse,
} from './experiment-worker-messages';

function sendMessage(message: ExperimentWorkerResponse): void {
  postMessage(message);
}

addEventListener('message', ({ data }: MessageEvent<ExperimentWorkerRequest>) => {
  try {
    if (data.type !== 'start') {
      throw new Error('Unknown experiment worker request');
    }

    const result = runExperiments(data.config, (progress) => {
      sendMessage({
        type: 'progress',
        progress,
      });
    });

    sendMessage({
      type: 'completed',
      result,
    });
  } catch (error) {
    sendMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown experiment error',
    });
  }
});
