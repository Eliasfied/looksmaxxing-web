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

const ATTEMPT_BUDGET = 3;

// Last resort: when two attempts have failed, the brief itself is usually what
// cannot be drawn — a taxonomy figure, a labelled set, a few degrees of
// difference. Fall back to one plain subject that serves the same article
// purpose, and judge it against THAT reduced brief. Reviewing a deliberately
// simpler picture against the brief it was told to abandon always rejects it,
// which is how articles ended up with no illustration at all.
function reducedBrief(brief) {
  const purpose = [brief.purpose, brief.alt].find(v => typeof v === 'string' && v.trim()) ?? '';
  return {
    ...brief,
    prompt: 'A single clear, natural editorial photograph for this article point: ' + purpose +
      '. One subject, one scene, realistic lighting and accurate anatomy. No text, letters, numbers or labels anywhere. No diagram, no panels, no side-by-side comparison.',
    reducedFrom: brief.prompt,
  };
}

export async function imageWithRepair(brief, state, persist, generate, inspect) {
  while (state.attempts.length < ATTEMPT_BUDGET) {
    const previous = state.attempts.at(-1);
    if (previous && previous.status !== 'rejected') throw new Error('Image attempt interrupted; manual review required');
    const last = state.attempts.length === ATTEMPT_BUDGET - 1;
    const effective = last ? reducedBrief(brief) : brief;
    const prompt = effective.prompt + (previous && !last ? '\nEDITORIAL CORRECTION: Regenerate a simpler, accurate illustration of the same purpose. Fix these defects from the rejected image: ' + JSON.stringify(previous.issues) + '. Avoid text, labels and complex comparative diagrams if they caused the defect.' : '');
    const attempt = { status: 'started', prompt, ...(last ? { reduced: true } : {}) };
    state.attempts.push(attempt);
    await persist();
    const image = await generate(prompt);
    try {
      const review = await inspect(image, effective);
      attempt.status = 'passed';
      attempt.review = review;
      await persist();
      return { image, review };
    } catch (error) {
      if (!(error instanceof ImageRejected)) throw error;
      attempt.status = 'rejected';
      attempt.issues = error.issues;
      await persist();
      if (state.attempts.length === ATTEMPT_BUDGET) throw error;
    }
  }
  throw new Error('Image correction budget exhausted; manual review required');
}
