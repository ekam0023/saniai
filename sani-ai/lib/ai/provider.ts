import type { AnswerBody } from '../security/validate';
import type { StyleProfile } from '../../types';
import type { RenderInput } from '../notebook/rendering';
import { OpenAICompatibleProvider } from './openaiCompatible';

export interface ImageAnalysisResult { questions: string[]; hasDiagram: boolean; notes: string }

export interface AIProvider {
  answerQuestion(input: AnswerBody): Promise<string>;
  streamAnswer(input: AnswerBody, signal?: AbortSignal): AsyncGenerator<string>;
  analyzeImage(imageDataUrl: string): Promise<ImageAnalysisResult>;
  analyzeHandwriting(imageDataUrl: string): Promise<StyleProfile>;
}

export interface ImageProvider {
  generateNotebookPages(input: RenderInput): Promise<Buffer[]>;
}

export interface SpeechProvider {
  transcribe(audio: Blob, language?: string): Promise<string>;
}

export function getAIProvider(): AIProvider {
  return new OpenAICompatibleProvider();
}
