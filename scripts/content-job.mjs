// A failed topic must leave the daily queue even if inference/review failed
// before a Markdown draft could be saved. The review record explains recovery.
export async function runContentJob(page, generate, save, review, checkpoint = async () => {}) {
  let data, outPath;
  const errors = [];
  try {
    data = await generate(page);
    data._draft = true;
    data._review = { pass: false, issues: ['Editorial review pending.'] };
    // Persist the original JSON, image briefs and evidence before any paid QA.
    await checkpoint(page, data);
    outPath = await save(page, data);
    await review(page, data);
    if (data._draft === false && data._review?.pass === true) {
      outPath = await save(page, data);
    } else {
      data._draft = true;
    }
    await checkpoint(page, data);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    if (data && typeof data === 'object') {
      data._draft = true;
      data._review = { pass: false, issues: [...(data._review?.issues ?? []), ...errors] };
      try {
        outPath = await save(page, data);
      } catch (saveError) {
        errors.push('Draft could not be saved: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
      }
      try { await checkpoint(page, data); }
      catch (checkpointError) { errors.push('Checkpoint could not be saved: ' + checkpointError.message); }
    }
  }
  const needsReview = errors.length > 0 || !outPath || data?._draft !== false;
  return { data, outPath, errors, status: needsReview ? 'review' : 'generated' };
}

export function isDraftContent(markdown) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return !!frontmatter && /^draft:[ \t]*true[ \t]*\r?$/m.test(frontmatter[1]);
}

export function recordContentJob(rows, slug, result) {
  for (const row of rows) {
    if (row.slug === slug && ['pending', 'review'].includes(row.status)) row.status = result.status;
  }
}
