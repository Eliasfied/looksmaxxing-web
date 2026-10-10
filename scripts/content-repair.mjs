// Only explicit editorial rejection triggers repair. Transport/JSON errors fail closed.
export class ImageRejected extends Error {
  constructor(issues) {
    super('Image failed editorial review: ' + JSON.stringify(issues));
    this.issues = issues;
  }
}

export async function reviewWithRepair(data, review, repair, checkpoint, eligible = true) {
  let verdict = await review();
  if (!verdict.pass && eligible && !data._textRepair) {
    data._textRepair = { original: structuredClone(data), issues: verdict.issues, status: 'started' };
    await checkpoint(); // Persist budget consumption before the paid call.
    const corrected = await repair(verdict.issues);
    if (!corrected || typeof corrected !== 'object' || Array.isArray(corrected)) throw new Error('Invalid repaired article');
    for (const key of Object.keys(data)) if (!key.startsWith('_')) delete data[key];
    for (const [key, value] of Object.entries(corrected)) if (!key.startsWith('_')) data[key] = value;
    await checkpoint();
    verdict = await review();
    data._textRepair.status = verdict.pass ? 'passed' : 'rejected';
    data._textRepair.review = verdict;
    await checkpoint();
  }
  return verdict;
}

export async function imageWithRepair(brief, state, persist, generate, inspect) {
  while (state.attempts.length < 2) {
    const previous = state.attempts.at(-1);
    if (previous && previous.status !== 'rejected') throw new Error('Image attempt interrupted; manual review required');
    const prompt = brief.prompt + (previous ? '\nEDITORIAL CORRECTION: Regenerate a simpler, accurate illustration of the same purpose. Fix these defects from the rejected image: ' + JSON.stringify(previous.issues) + '. Avoid text, labels and complex comparative diagrams if they caused the defect.' : '');
    const attempt = { status: 'started', prompt };
    state.attempts.push(attempt);
    await persist();
    const image = await generate(prompt);
    try {
      const review = await inspect(image, brief);
      attempt.status = 'passed';
      attempt.review = review;
      await persist();
      return { image, review };
    } catch (error) {
      if (!(error instanceof ImageRejected)) throw error;
      attempt.status = 'rejected';
      attempt.issues = error.issues;
      await persist();
      if (state.attempts.length === 2) throw error;
    }
  }
  throw new Error('Image correction budget exhausted; manual review required');
}
