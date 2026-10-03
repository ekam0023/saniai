import { AppError } from '../errors';
import type { ImageProvider } from '../ai/provider';
import { renderNotebook, type RenderInput } from '../notebook/rendering';

/**
 * Mode B (programmatic) is built in and guarantees the exact approved text.
 * Mode A (external generative image model) is intentionally NOT implemented here, because generative
 * models cannot be trusted to render long text exactly. To add one, implement ImageProvider below,
 * OCR-verify its output against the approved text, and fall back to programmatic rendering on mismatch.
 */
class ProgrammaticProvider implements ImageProvider {
  async generateNotebookPages(input: RenderInput) {
    return renderNotebook(input).pages;
  }
}

export function getImageProvider(): ImageProvider {
  const mode = (process.env.IMAGE_PROVIDER || 'programmatic').toLowerCase();
  if (mode !== 'programmatic') {
    throw new AppError('IMAGE_PROVIDER must be "programmatic" in this build. External image models are not implemented yet (see lib/image/generate.ts).', 501);
  }
  return new ProgrammaticProvider();
}
