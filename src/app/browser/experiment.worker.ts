/// <reference lib="webworker" />

import { runExperiments } from '../core/experiment-runner';
import type {
  ExperimentWorkerRequest,
  ExperimentWorkerResponse,
} from './experiment-worker-messages';

/** Keeps every outgoing message checked against the shared protocol. */
function sendMessage(message: ExperimentWorkerResponse): void {
  postMessage(message);
}

// The complete experiment loop runs off the main thread; only structured data
// crosses this boundary, so the core engine remains independent from Angular.
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
